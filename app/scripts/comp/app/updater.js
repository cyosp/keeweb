import { Events } from 'framework/events';
import { RuntimeInfo } from 'const/runtime-info';
import { Transport } from 'comp/browser/transport';
import { Launcher } from 'comp/launcher';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { UpdateModel } from 'models/update-model';
import { SemVer } from 'util/data/semver';
import { Logger } from 'util/logger';
import { SignatureVerifier } from 'util/data/signature-verifier';

const logger = new Logger('updater');

const Updater = {
    UpdateInterval: 1000 * 60 * 60 * 24,
    MinUpdateTimeout: 500,
    MinUpdateSize: 10000,
    UpdateCheckFiles: ['app.asar'],
    nextCheckTimeout: null,
    updateCheckDate: new Date(0),
    enabled: Launcher && Launcher.updaterEnabled(),

    getAutoUpdateType() {
        if (!this.enabled) {
            return false;
        }
        let autoUpdate = AppSettingsModel.autoUpdate;
        if (autoUpdate && autoUpdate === true) {
            autoUpdate = 'install';
        }
        return autoUpdate;
    },

    updateInProgress() {
        return (
            UpdateModel.status === 'checking' ||
            ['downloading', 'extracting'].indexOf(UpdateModel.updateStatus) >= 0
        );
    },

    init() {
        this.scheduleNextCheck();
        if (!Launcher && navigator.serviceWorker && !RuntimeInfo.beta && !RuntimeInfo.devMode) {
            navigator.serviceWorker
                .register('service-worker.js')
                .then(reg => {
                    logger.info('Service worker registered');
                    reg.addEventListener('updatefound', () => {
                        if (reg.active) {
                            logger.info('Service worker found an update');
                            UpdateModel.set({ updateStatus: 'ready' });
                        }
                    });
                })
                .catch(e => {
                    logger.error('Failed to register a service worker', e);
                });
        }
    },

    scheduleNextCheck() {
        if (this.nextCheckTimeout) {
            clearTimeout(this.nextCheckTimeout);
            this.nextCheckTimeout = null;
        }
        if (!this.getAutoUpdateType()) {
            return;
        }
        let timeDiff = this.MinUpdateTimeout;
        const lastCheckDate = UpdateModel.lastCheckDate;
        if (lastCheckDate) {
            timeDiff = Math.min(
                Math.max(this.UpdateInterval + (lastCheckDate - new Date()), this.MinUpdateTimeout),
                this.UpdateInterval
            );
        }
        this.nextCheckTimeout = setTimeout(this.check.bind(this), timeDiff);
        logger.info('Next update check will happen in ' + Math.round(timeDiff / 1000) + 's');
    },

    check(startedByUser) {
    },

    canAutoUpdate() {
        const minLauncherVersion = UpdateModel.lastCheckUpdMin;
        if (minLauncherVersion) {
            const cmp = SemVer.compareVersions(Launcher.version, minLauncherVersion);
            if (cmp < 0) {
                UpdateModel.set({ updateStatus: 'ready', updateManual: true });
                return false;
            }
        }
        return true;
    },

    update(startedByUser, successCallback) {
        const ver = UpdateModel.lastVersion;
        if (!this.enabled) {
            logger.info('Updater is disabled');
            return;
        }
        if (SemVer.compareVersions(RuntimeInfo.version, ver) >= 0) {
            logger.info('You are using the latest version');
            return;
        }
        UpdateModel.set({ updateStatus: 'downloading', updateError: null });
        logger.info('Downloading update', ver);
        Transport.httpGet({
            url: Links.UpdateDesktop.replace('{ver}', ver),
            file: 'KeeWeb-' + ver + '.zip',
            cache: !startedByUser,
            success: filePath => {
                UpdateModel.set({ updateStatus: 'extracting' });
                logger.info('Extracting update file', this.UpdateCheckFiles, filePath);
                this.extractAppUpdate(filePath, err => {
                    if (err) {
                        logger.error('Error extracting update', err);
                        UpdateModel.set({
                            updateStatus: 'error',
                            updateError: 'Error extracting update'
                        });
                    } else {
                        UpdateModel.set({ updateStatus: 'ready', updateError: null });
                        if (!startedByUser) {
                            Events.emit('update-app');
                        }
                        if (typeof successCallback === 'function') {
                            successCallback();
                        }
                    }
                });
            },
            error(e) {
                logger.error('Error downloading update', e);
                UpdateModel.set({
                    updateStatus: 'error',
                    updateError: 'Error downloading update'
                });
            }
        });
    },

    extractAppUpdate(updateFile, cb) {
        const expectedFiles = this.UpdateCheckFiles;
        const appPath = Launcher.getUserDataPath();
        const StreamZip = Launcher.req('node-stream-zip');
        StreamZip.setFs(Launcher.req('original-fs'));
        const zip = new StreamZip({ file: updateFile, storeEntries: true });
        zip.on('error', cb);
        zip.on('ready', () => {
            const containsAll = expectedFiles.every(expFile => {
                const entry = zip.entry(expFile);
                return entry && entry.isFile;
            });
            if (!containsAll) {
                return cb('Bad archive');
            }
            this.validateArchiveSignature(updateFile, zip)
                .then(() => {
                    zip.extract(null, appPath, err => {
                        zip.close();
                        if (err) {
                            return cb(err);
                        }
                        Launcher.deleteFile(updateFile);
                        cb();
                    });
                })
                .catch(e => {
                    return cb('Invalid archive: ' + e);
                });
        });
    },

    validateArchiveSignature(archivePath, zip) {
        if (!zip.comment) {
            return Promise.reject('No comment in ZIP');
        }
        if (zip.comment.length !== 512) {
            return Promise.reject('Bad comment length in ZIP: ' + zip.comment.length);
        }
        try {
            const zipFileData = Launcher.req('fs').readFileSync(archivePath);
            const dataToVerify = zipFileData.slice(0, zip.centralDirectory.headerOffset + 22);
            const signature = window.Buffer.from(zip.comment, 'hex');
            return SignatureVerifier.verify(dataToVerify, signature)
                .catch(() => {
                    throw new Error('Error verifying signature');
                })
                .then(isValid => {
                    if (!isValid) {
                        throw new Error('Invalid signature');
                    }
                });
        } catch (err) {
            return Promise.reject(err.toString());
        }
    }
};

export { Updater };
