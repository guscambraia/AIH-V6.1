
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Configurações
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    testConnection: (config) => ipcRenderer.invoke('test-connection', config),
    
    // Eventos
    onBackupManual: (callback) => ipcRenderer.on('backup-manual', callback),
    
    // Utilitários
    platform: process.platform,
    isElectron: true
});
