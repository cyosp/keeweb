const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getBrowserWindow: () => {
        return require('@electron/remote').BrowserWindow;
    },
    remoteApp: () => {
        return require('@electron/remote').app;
    },
    remoteAppOn: (event, listener) => {
        return require('@electron/remote').app.on(event, listener);
    },
    getCurrentWindow: () => {
        return require('@electron/remote').getCurrentWindow();
    },
    configEnabled: () => {
        return require('@electron/remote').app.commandLine.hasSwitch('--disable-config');
    },
    isAppFocused: () => {
        return !!require('@electron/remote').BrowserWindow.getFocusedWindow();
    },
    getProcess() {
        return require('@electron/remote').process;
    },
    require() {
        return window.require;
    },
    electron() {
        return require('electron');
    },
    ipcRenderer() {
        return ipcRenderer;
    },
    ipcRendererOn(event, listener) {
        return ipcRenderer.on(event, listener);
    },
    getDialog() {
        return require('@electron/remote').dialog;
    },
    getClipboard() {
        return require('@electron/remote').clipboard;
    }
});
