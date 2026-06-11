const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const http = require('node:http')
const { URL } = require('node:url')

const OAUTH_PORT = 38472
const OAUTH_REDIRECT = `http://127.0.0.1:${OAUTH_PORT}/auth/callback`

let mainWindow = null
let oauthServer = null

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  const userConfig = getConfigPath()
  if (fs.existsSync(userConfig)) {
    return JSON.parse(fs.readFileSync(userConfig, 'utf8'))
  }

  const bundled = path.join(process.resourcesPath, 'config.example.json')
  const local = path.join(__dirname, '..', 'config.example.json')
  const examplePath = fs.existsSync(bundled) ? bundled : local
  if (fs.existsSync(examplePath)) {
    return JSON.parse(fs.readFileSync(examplePath, 'utf8'))
  }

  return { crmUrl: '', supabaseUrl: '', supabaseAnonKey: '' }
}

function saveConfig(config) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8')
}

function stopOAuthServer() {
  if (oauthServer) {
    oauthServer.close()
    oauthServer = null
  }
}

function startOAuthServer() {
  stopOAuthServer()

  return new Promise((resolve, reject) => {
    oauthServer = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${OAUTH_PORT}`)
        if (url.pathname !== '/auth/callback') {
          res.writeHead(404)
          res.end('Not found')
          return
        }

        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error_description') || url.searchParams.get('error')

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>BCRM</title></head>
<body style="font-family:Segoe UI,sans-serif;text-align:center;padding:40px;">
<h2>${error ? 'Đăng nhập thất bại' : 'Đăng nhập thành công'}</h2>
<p>${error ? 'Bạn có thể đóng cửa sổ và thử lại.' : 'Quay lại ứng dụng BCRM Nhập KH để tiếp tục.'}</p>
</body></html>`)

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('oauth-result', { code, error })
        }

        stopOAuthServer()
      } catch (err) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('oauth-result', { error: err.message })
        }
        stopOAuthServer()
      }
    })

    oauthServer.on('error', reject)
    oauthServer.listen(OAUTH_PORT, '127.0.0.1', () => resolve({ redirectUri: OAUTH_REDIRECT }))
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 640,
    minWidth: 640,
    minHeight: 520,
    title: 'BCRM Nhập Khách Hàng',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  stopOAuthServer()
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('config:load', () => loadConfig())
ipcMain.handle('config:save', (_event, config) => {
  saveConfig(config)
  return true
})

ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn file Excel khách hàng',
    filters: [
      { name: 'Excel', extensions: ['xlsx', 'xls'] },
      { name: 'Tất cả', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })

  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const buffer = fs.readFileSync(filePath)
  return {
    filePath,
    fileName: path.basename(filePath),
    size: buffer.length,
    base64: buffer.toString('base64'),
  }
})

ipcMain.handle('oauth:start', async (_event, { authorizeUrl }) => {
  await startOAuthServer()
  await shell.openExternal(authorizeUrl)
  return { redirectUri: OAUTH_REDIRECT }
})

ipcMain.handle('oauth:cancel', () => {
  stopOAuthServer()
})
