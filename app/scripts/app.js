import { Events } from 'framework/events';
import { StartProfiler } from 'comp/app/start-profiler';
import { FileInfoCollection } from 'collections/file-info-collection';
import { AppRightsChecker } from 'comp/app/app-rights-checker';
import { ExportApi } from 'comp/app/export-api';
import { SingleInstanceChecker } from 'comp/app/single-instance-checker';
import { Updater } from 'comp/app/updater';
import { AuthReceiver } from 'comp/browser/auth-receiver';
import { FeatureTester } from 'comp/browser/feature-tester';
import { FocusDetector } from 'comp/browser/focus-detector';
import { IdleTracker } from 'comp/browser/idle-tracker';
import { KeyHandler } from 'comp/browser/key-handler';
import { PopupNotifier } from 'comp/browser/popup-notifier';
import { Launcher } from 'comp/launcher';
import { SettingsManager } from 'comp/settings/settings-manager';
import { Alerts } from 'comp/ui/alerts';
import { Timeouts } from 'const/timeouts';
import { AppModel } from 'models/app-model';
import { AppSettingsModel } from 'models/app-settings-model';
import { RuntimeDataModel } from 'models/runtime-data-model';
import { UpdateModel } from 'models/update-model';
import { PluginManager } from 'plugins/plugin-manager';
import { Features } from 'util/features';
import { KdbxwebInit } from 'util/kdbxweb/kdbxweb-init';
import { Locale } from 'util/locale';
import { AppView } from 'views/app-view';
import 'hbs-helpers';

StartProfiler.milestone('loading modules');

const ready = (Launcher && Launcher.ready) || $;

ready(() => {
    StartProfiler.milestone('document ready');

    if (AuthReceiver.receive()) {
        return;
    }
    StartProfiler.milestone('checking auth');

    const appModel = new AppModel();
    StartProfiler.milestone('creating app model');

    Promise.resolve()
        .then(loadConfigs)
        .then(initModules)
        .then(loadRemoteConfig)
        .then(ensureCanRun)
        .then(showApp)
        .then(postInit)
        .catch(e => {
            appModel.appLogger.error('Error starting app', e);
        });

    function ensureCanRun() {
        if (Features.isFrame && !appModel.settings.allowIframes) {
            return Promise.reject(
                'Running in iframe is not allowed (this can be changed in the app config).'
            );
        }
        return FeatureTester.test()
            .catch(e => {
                Alerts.error({
                    header: Locale.appSettingsError,
                    body: Locale.appNotSupportedError + '<br/><br/>' + e,
                    buttons: [],
                    esc: false,
                    enter: false,
                    click: false
                });
                throw 'Feature testing failed: ' + e;
            })
            .then(() => {
                StartProfiler.milestone('checking features');
            });
    }

    function loadConfigs() {
        return Promise.all([
            AppSettingsModel.load(),
            UpdateModel.load(),
            RuntimeDataModel.load(),
            FileInfoCollection.load()
        ]).then(() => {
            StartProfiler.milestone('loading configs');
        });
    }

    function initModules() {
        KeyHandler.init();
        IdleTracker.init();
        PopupNotifier.init();
        KdbxwebInit.init();
        FocusDetector.init();
        window.kw = ExportApi;
        return PluginManager.init().then(() => {
            StartProfiler.milestone('initializing modules');
        });
    }

    function showSettingsLoadError() {
        Alerts.error({
            header: Locale.appSettingsError,
            body: Locale.appSettingsErrorBody,
            buttons: [],
            esc: false,
            enter: false,
            click: false
        });
    }

    function loadRemoteConfig() {
        return Promise.resolve()
            .then(() => {
                SettingsManager.setBySettings(appModel.settings);
                const configParam = getConfigParam();
                if (configParam) {
                    return appModel
                        .loadConfig(configParam)
                        .then(() => {
                            SettingsManager.setBySettings(appModel.settings);
                        })
                        .catch(e => {
                            if (!appModel.settings.cacheConfigSettings) {
                                showSettingsLoadError();
                                throw e;
                            }
                        });
                }
            })
            .then(() => {
                StartProfiler.milestone('loading remote config');
            });
    }

    function showApp() {
        return Promise.resolve().then(() => {
            const skipHttpsWarning =
                localStorage.skipHttpsWarning || appModel.settings.skipHttpsWarning;
            const protocolIsInsecure = ['https:', 'file:', 'app:'].indexOf(location.protocol) < 0;
            const hostIsInsecure = location.hostname !== 'localhost';
            if (protocolIsInsecure && hostIsInsecure && !skipHttpsWarning) {
                return new Promise(resolve => {
                    Alerts.error({
                        header: Locale.appSecWarn,
                        icon: 'user-secret',
                        esc: false,
                        enter: false,
                        click: false,
                        body: Locale.appSecWarnBody1 + '<br/><br/>' + Locale.appSecWarnBody2,
                        buttons: [{ result: '', title: Locale.appSecWarnBtn, error: true }],
                        complete: () => {
                            showView();
                            resolve();
                        }
                    });
                });
            } else {
                showView();
            }
        });
    }

    function postInit() {
        Updater.init();
        SingleInstanceChecker.init();
        AppRightsChecker.init();
        setTimeout(() => PluginManager.runAutoUpdate(), Timeouts.AutoUpdatePluginsAfterStart);
    }

    function showView() {
        appModel.prepare();
        StartProfiler.milestone('preparing app model');

        new AppView(appModel).render();
        StartProfiler.milestone('first view rendering');

        Events.emit('app-ready');
        StartProfiler.milestone('app ready event');

        StartProfiler.report();
    }

    function isWebApp() {
        return typeof Launcher === "undefined";
    }

    function getConfigParam() {
        if(isWebApp() || Launcher.configEnabled()) {
            const metaConfig = document.head.querySelector('meta[name=kw-config]');
            if (metaConfig && metaConfig.content && metaConfig.content[0] !== '(') {
                return metaConfig.content;
            }
            const match = location.search.match(/[?&]config=([^&]+)/i);
            if (match && match[1]) {
                return match[1];
            }
        }
    }
});
