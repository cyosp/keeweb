import * as kdbxweb from 'kdbxweb';
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
    nextCheckTimeout: null,
    updateCheckDate: new Date(0),
    enabled: Launcher?.updaterEnabled(),

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
            ['downloading', 'extracting', 'updating'].indexOf(UpdateModel.updateStatus) >= 0
        );
    },

    init() {
        this.scheduleNextCheck();
        if (!Launcher && navigator.serviceWorker && !RuntimeInfo.beta && !RuntimeInfo.devMode) {
            navigator.serviceWorker
                .register('service-worker.js')
                .then((reg) => {
                    logger.info('Service worker registered');
                    reg.addEventListener('updatefound', () => {
                        if (reg.active) {
                            logger.info('Service worker found an update');
                            UpdateModel.set({ updateStatus: 'ready' });
                        }
                    });
                })
                .catch((e) => {
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
            const cmp = SemVer.compareVersions(RuntimeInfo.version, minLauncherVersion);
            if (cmp < 0) {
                UpdateModel.set({ updateStatus: 'ready', updateManual: true });
                return false;
            }
        }
        return true;
    },

    update(startedByUser, successCallback) {
    },

    verifySignature(assetFilePath, assetName, callback) {
        logger.info('Verifying update signature', assetName);
        const fs = Launcher.req('fs');
        const signaturesTxt = fs.readFileSync(assetFilePath + '.sign', 'utf8');
        const assetSignatureLine = signaturesTxt
            .split('\n')
            .find((line) => line.endsWith(assetName));
        if (!assetSignatureLine) {
            logger.error('Signature not found for asset', assetName);
            callback('Asset signature not found');
            return;
        }
        const signature = kdbxweb.ByteUtils.hexToBytes(assetSignatureLine.split(' ')[0]);
        const fileBytes = fs.readFileSync(assetFilePath);
        SignatureVerifier.verify(fileBytes, signature)
            .catch((e) => {
                logger.error('Error verifying signature', e);
                callback('Error verifying signature');
            })
            .then((valid) => {
                logger.info(`Update asset signature is ${valid ? 'valid' : 'invalid'}`);
                callback(undefined, valid);
            });
    },

    getUpdateAssetName(ver) {
        const platform = Launcher.platform();
        const arch = Launcher.arch();
        switch (platform) {
            case 'win32':
                switch (arch) {
                    case 'x64':
                        return `KeeWeb-${ver}.win.x64.exe`;
                    case 'ia32':
                        return `KeeWeb-${ver}.win.ia32.exe`;
                    case 'arm64':
                        return `KeeWeb-${ver}.win.arm64.exe`;
                }
                break;
            case 'darwin':
                switch (arch) {
                    case 'x64':
                        return `KeeWeb-${ver}.mac.x64.dmg`;
                    case 'arm64':
                        return `KeeWeb-${ver}.mac.arm64.dmg`;
                }
                break;
        }
        return undefined;
    },

    installAndRestart() {
        if (!Launcher) {
            return;
        }
        const updateAssetName = this.getUpdateAssetName(UpdateModel.lastVersion);
        const updateFilePath = Transport.cacheFilePath(updateAssetName);
        Launcher.requestRestartAndUpdate(updateFilePath);
    }
};

export { Updater };
