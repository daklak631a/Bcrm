const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const { URL } = require('node:url')
const { createClient } = require('@supabase/supabase-js')
const { validateConfig } = require('./url-utils')

const OAUTH_REDIRECT = 'http://127.0.0.1:38472/auth/callback'

let mainWindow = null
let oauthWindow = null
let authClient = null
let savedConfig = null

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function getSessionPath() {
  return path.join(app.getPath('userData'), 'session.json')
}

function loadConfig() {
  const userConfig = getConfigPath()
  if (fs.existsSync(userConfig)) {
    try {
      return JSON.parse(fs.readFileSync(userConfig, 'utf8'))
    } catch {
      return { crmUrl: '', supabaseUrl: '', supabaseAnonKey: '' }
    }
  }
  return { crmUrl: '', supabaseUrl: '', supabaseAnonKey: '' }
}

function saveConfigFile(config) {
  const normalized = validateConfig(config)
  fs.writeFileSync(getConfigPath(), JSON.stringify({
    crmUrl: normalized.crmUrl,
    supabaseUrl: normalized.supabaseUrl,
    supabaseAnonKey: normalized.supabaseAnonKey,
  }, null, 2), 'utf8')
  savedConfig = normalized
  authClient = null
  return { ...normalized, configPath: getConfigPath(), fixes: normalized.fixes }
}

function loadSession() {
  const sessionPath = getSessionPath()
  if (!fs.existsSync(sessionPath)) return null
  try {
    return JSON.parse(fs.readFileSync(sessionPath, 'utf8'))
  } catch {
    return null
  }
}

function saveSession(session) {
  if (!session) {
    if (fs.existsSync(getSessionPath())) fs.unlinkSync(getSessionPath())
    return
  }
  fs.writeFileSync(getSessionPath(), JSON.stringify(session, null, 2), 'utf8')
}

function getAuthClient(config) {
  const cfg = config || savedConfig
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
    throw new Error('Chưa lưu cấu hình Supabase.')
  }
  if (!authClient) {
    authClient = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  }
  return authClient
}

function closeOAuthWindow() {
  if (oauthWindow && !oauthWindow.isDestroyed()) oauthWindow.close()
  oauthWindow = null
}

function parseOAuthCallbackUrl(targetUrl) {
  if (!targetUrl || !targetUrl.startsWith(OAUTH_REDIRECT)) return null
  const parsed = new URL(targetUrl)
  return {
    code: parsed.searchParams.get('code'),
    error: parsed.searchParams.get('error_description') || parsed.searchParams.get('error'),
  }
}

function openOAuthWindow(authorizeUrl) {
  closeOAuthWindow()

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (payload, isError = false) => {
      if (settled) return
      settled = true
      closeOAuthWindow()
      if (isError) reject(new Error(payload))
      else resolve(payload)
    }

    oauthWindow = new BrowserWindow({
      width: 520,
      height: 720,
      parent: mainWindow || undefined,
      modal: !!mainWindow,
      show: true,
      autoHideMenuBar: true,
      title: 'Đăng nhập Google — BCRM',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    const tryCapture = (targetUrl) => {
      const result = parseOAuthCallbackUrl(targetUrl)
      if (!result) return false
      if (result.error) finish(result.error, true)
      else finish(result)
      return true
    }

    const onNavigate = (event, targetUrl) => {
      if (tryCapture(targetUrl)) event.preventDefault()
    }

    oauthWindow.webContents.on('will-navigate', onNavigate)
    oauthWindow.webContents.on('will-redirect', onNavigate)
    oauthWindow.webContents.on('did-navigate', (_event, targetUrl) => tryCapture(targetUrl))
    oauthWindow.webContents.on('did-navigate-in-page', (_event, targetUrl) => tryCapture(targetUrl))

    oauthWindow.webContents.on('did-fail-load', (_event, _code, description, validatedURL) => {
      if (tryCapture(validatedURL)) return
      if (!settled && validatedURL && validatedURL !== 'about:blank') {
        finish(`Không mở được trang đăng nhập: ${description}`, true)
      }
    })

    oauthWindow.on('closed', () => {
      oauthWindow = null
      if (!settled) finish('Bạn đã đóng cửa sổ đăng nhập.', true)
    })

    oauthWindow.loadURL(authorizeUrl).catch((err) => finish(err.message, true))
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 720,
    minWidth: 640,
    minHeight: 600,
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

app.whenReady().then(() => {
  savedConfig = loadConfig()
  createWindow()
})

app.on('window-all-closed', () => {
  closeOAuthWindow()
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('config:load', () => ({
  ...loadConfig(),
  configPath: getConfigPath(),
  session: loadSession(),
}))

ipcMain.handle('config:save', (_event, config) => saveConfigFile(config))

ipcMain.handle('config:test', async (_event, config) => {
  const normalized = validateConfig(config)
  const response = await fetch(`${normalized.supabaseUrl}/auth/v1/health`, {
    headers: { apikey: normalized.supabaseAnonKey },
  })
  if (!response.ok) {
    throw new Error(`Không kết nối được Supabase (HTTP ${response.status}). Kiểm tra URL và Anon Key.`)
  }
  return { ok: true, supabaseUrl: normalized.supabaseUrl, fixes: normalized.fixes }
})

ipcMain.handle('auth:login', async (_event, config) => {
  const saved = saveConfigFile(config)
  const client = getAuthClient(saved)

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_REDIRECT,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error) throw error
  if (!data?.url) throw new Error('Không lấy được URL đăng nhập Google.')

  const oauthResult = await openOAuthWindow(data.url)
  if (oauthResult.error) throw new Error(oauthResult.error)
  if (!oauthResult.code) {
    throw new Error(
      'Không nhận mã xác thực. Thêm http://127.0.0.1:38472/auth/callback vào Supabase → Authentication → Redirect URLs.'
    )
  }

  const { data: sessionData, error: exchangeError } = await client.auth.exchangeCodeForSession(oauthResult.code)
  if (exchangeError) throw new Error(`Không tạo phiên đăng nhập: ${exchangeError.message}`)
  if (!sessionData.session) throw new Error('Phiên đăng nhập trống.')

  saveSession({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_at: sessionData.session.expires_at,
    user: {
      id: sessionData.session.user.id,
      email: sessionData.session.user.email,
    },
  })

  return {
    email: sessionData.session.user.email,
    fixes: saved.fixes,
  }
})

ipcMain.handle('auth:logout', () => {
  saveSession(null)
  authClient = null
})

ipcMain.handle('auth:session', () => loadSession())

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
