const OAUTH_REDIRECT = 'http://127.0.0.1:38472/auth/callback'

const els = {
  crmUrl: document.getElementById('crmUrl'),
  supabaseUrl: document.getElementById('supabaseUrl'),
  supabaseAnonKey: document.getElementById('supabaseAnonKey'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  pickFileBtn: document.getElementById('pickFileBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  fileLabel: document.getElementById('fileLabel'),
  authBadge: document.getElementById('authBadge'),
  progress: document.getElementById('progress'),
  resultCard: document.getElementById('resultCard'),
  resultText: document.getElementById('resultText'),
}

let supabase = null
let session = null
let selectedFile = null
let oauthUnsubscribe = null

function normalizeCrmUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function getConfigFromForm() {
  return {
    crmUrl: normalizeCrmUrl(els.crmUrl.value),
    supabaseUrl: els.supabaseUrl.value.trim(),
    supabaseAnonKey: els.supabaseAnonKey.value.trim(),
  }
}

function initSupabase(config) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Thiếu Supabase URL hoặc Anon Key.')
  }
  supabase = window.createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storage: window.localStorage,
    },
  })
}

function setAuthUi(loggedIn, email = '') {
  if (loggedIn) {
    els.authBadge.textContent = email || 'Đã đăng nhập'
    els.authBadge.className = 'badge badge-ok'
    els.loginBtn.hidden = true
    els.logoutBtn.hidden = false
    els.pickFileBtn.disabled = false
    els.uploadBtn.disabled = !selectedFile
  } else {
    els.authBadge.textContent = 'Chưa đăng nhập'
    els.authBadge.className = 'badge badge-muted'
    els.loginBtn.hidden = false
    els.logoutBtn.hidden = true
    els.pickFileBtn.disabled = true
    els.uploadBtn.disabled = true
  }
}

function showResult(text, isError = false) {
  els.resultCard.hidden = false
  els.resultText.textContent = text
  els.resultText.style.color = isError ? '#dc2626' : '#0f172a'
}

async function restoreSession() {
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  session = data.session
  setAuthUi(!!session, session?.user?.email || '')
}

async function saveConfig() {
  const config = getConfigFromForm()
  if (!config.crmUrl) throw new Error('Nhập URL hệ thống CRM.')
  await window.bcrmImport.saveConfig(config)
  initSupabase(config)
  await restoreSession()
  showResult('Đã lưu cấu hình.')
}

async function loginWithGoogle() {
  const config = getConfigFromForm()
  if (!config.crmUrl) throw new Error('Nhập URL hệ thống CRM trước khi đăng nhập.')
  initSupabase(config)
  await window.bcrmImport.saveConfig(config)

  if (oauthUnsubscribe) oauthUnsubscribe()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: OAUTH_REDIRECT,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error) throw error
  if (!data?.url) throw new Error('Không lấy được URL đăng nhập Google.')

  oauthUnsubscribe = window.bcrmImport.onOAuthResult(async ({ code, error: oauthError }) => {
    if (oauthError) {
      showResult(`Đăng nhập thất bại: ${oauthError}`, true)
      return
    }
    if (!code) {
      showResult('Không nhận được mã xác thực từ Google.', true)
      return
    }

    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      showResult(`Không tạo được phiên: ${exchangeError.message}`, true)
      return
    }

    session = sessionData.session
    setAuthUi(true, session?.user?.email || '')
    showResult(`Đăng nhập thành công: ${session?.user?.email || ''}`)
  })

  await window.bcrmImport.startOAuth(data.url)
}

async function logout() {
  if (supabase) await supabase.auth.signOut()
  session = null
  selectedFile = null
  els.fileLabel.textContent = 'Chưa chọn file'
  setAuthUi(false)
  showResult('Đã đăng xuất.')
}

async function pickFile() {
  const file = await window.bcrmImport.openFile()
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    showResult('File quá lớn (tối đa 5MB).', true)
    return
  }

  selectedFile = file
  els.fileLabel.textContent = `${file.fileName} (${(file.size / 1024).toFixed(1)} KB)`
  els.uploadBtn.disabled = !session
}

async function uploadFile() {
  const config = getConfigFromForm()
  if (!session?.access_token) throw new Error('Chưa đăng nhập.')
  if (!selectedFile) throw new Error('Chưa chọn file.')
  if (!config.crmUrl) throw new Error('Thiếu URL CRM.')

  els.progress.hidden = false
  els.uploadBtn.disabled = true

  try {
    const bytes = Uint8Array.from(atob(selectedFile.base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const formData = new FormData()
    formData.append('file', blob, selectedFile.fileName)

    const response = await fetch(`${config.crmUrl}/api/customers/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`)
    }

    let text = `Tổng: ${payload.total}\nThành công: ${payload.success}\nLỗi: ${payload.failed}`
    if (payload.errors?.length) {
      text += `\n\nChi tiết lỗi (tối đa 50 dòng):\n${payload.errors.join('\n')}`
    }
    if (payload.has_more_errors) {
      text += '\n\n... còn thêm lỗi khác'
    }
    showResult(text, payload.failed > 0)
  } finally {
    els.progress.hidden = true
    els.uploadBtn.disabled = !session || !selectedFile
  }
}

async function boot() {
  const config = await window.bcrmImport.loadConfig()
  els.crmUrl.value = config.crmUrl || ''
  els.supabaseUrl.value = config.supabaseUrl || ''
  els.supabaseAnonKey.value = config.supabaseAnonKey || ''

  if (config.supabaseUrl && config.supabaseAnonKey) {
    initSupabase(config)
    await restoreSession()
  }

  els.saveConfigBtn.addEventListener('click', () => saveConfig().catch((e) => showResult(e.message, true)))
  els.loginBtn.addEventListener('click', () => loginWithGoogle().catch((e) => showResult(e.message, true)))
  els.logoutBtn.addEventListener('click', () => logout().catch((e) => showResult(e.message, true)))
  els.pickFileBtn.addEventListener('click', () => pickFile().catch((e) => showResult(e.message, true)))
  els.uploadBtn.addEventListener('click', () => uploadFile().catch((e) => showResult(e.message, true)))
}

boot().catch((e) => showResult(e.message, true))
