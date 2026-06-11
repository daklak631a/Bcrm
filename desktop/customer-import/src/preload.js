const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bcrmImport', {
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  testConfig: (config) => ipcRenderer.invoke('config:test', config),
  login: (config) => ipcRenderer.invoke('auth:login', config),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:session'),
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
})
