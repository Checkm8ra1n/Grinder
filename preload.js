const { contextBridge, ipcRenderer } = require('electron');

let downloadSequence = 0;

contextBridge.exposeInMainWorld('grinder', {
    checkDependencies: () => ipcRenderer.invoke('dependencies:check'),
    browseOutputDirectory: () => ipcRenderer.invoke('directory:browse'),
    readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
    downloadVideo: (options, onOutput) => {
        const requestId = `${Date.now()}-${++downloadSequence}`;
        const listener = (_event, message) => {
            if (message.requestId === requestId) {
                onOutput(message);
            }
        };

        ipcRenderer.on('video:download-output', listener);
        return ipcRenderer.invoke('video:download', { ...options, requestId })
            .finally(() => ipcRenderer.removeListener('video:download-output', listener));
    }
});
