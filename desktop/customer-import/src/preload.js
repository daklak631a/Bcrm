const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('bcrmImport', {
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  testConfig: (config) => ipcRenderer.invoke('config:test', config),
  testCrm: (config) => ipcRenderer.invoke('config:testCrm', config),
  uploadFile: (payload) => ipcRenderer.invoke('import:upload', payload),
  login: (config) => ipcRenderer.invoke('auth:login', config),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getSession: () => ipcRenderer.invoke('auth:session'),
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
})
