const { contextBridge, ipcRenderer } = require('electron')
const { createClient } = require('@supabase/supabase-js')

contextBridge.exposeInMainWorld('createSupabaseClient', (url, key, options) => createClient(url, key, options))

contextBridge.exposeInMainWorld('bcrmImport', {
  loadConfig: () => ipcRenderer.invoke('config:load'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  openFile: () => ipcRenderer.invoke('dialog:open-file'),
  startOAuth: (authorizeUrl) => ipcRenderer.invoke('oauth:start', { authorizeUrl }),
  cancelOAuth: () => ipcRenderer.invoke('oauth:cancel'),
  onOAuthResult: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('oauth-result', listener)
    return () => ipcRenderer.removeListener('oauth-result', listener)
  },
})
