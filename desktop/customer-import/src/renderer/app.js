const els = {
  crmUrl: document.getElementById('crmUrl'),
  supabaseUrl: document.getElementById('supabaseUrl'),
  supabaseAnonKey: document.getElementById('supabaseAnonKey'),
  configPath: document.getElementById('configPath'),
  saveConfigBtn: document.getElementById('saveConfigBtn'),
  testConfigBtn: document.getElementById('testConfigBtn'),
  loginBtn: document.getElementById('loginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  pickFileBtn: document.getElementById('pickFileBtn'),
  uploadBtn: document.getElementById('uploadBtn'),
  fileLabel: document.getElementById('fileLabel'),
  authBadge: document.getElementById('authBadge'),
  progress: document.getElementById('progress'),
  statusBanner: document.getElementById('statusBanner'),
  resultCard: document.getElementById('resultCard'),
  resultText: document.getElementById('resultText'),
}

let session = null
let selectedFile = null

function getConfigFromForm() {
  return {
    crmUrl: els.crmUrl.value,
    supabaseUrl: els.supabaseUrl.value,
    supabaseAnonKey: els.supabaseAnonKey.value,
  }
}

function setBusy(button, busy, busyLabel, idleLabel) {
  if (!button) return
  button.disabled = busy
  button.textContent = busy ? busyLabel : idleLabel
}

function showStatus(text, type = 'info') {
  if (!els.statusBanner) return
  els.statusBanner.hidden = false
  els.statusBanner.className = `status-banner status-${type}`
  els.statusBanner.textContent = text
}

function showResult(text, isError = false) {
  els.resultCard.hidden = false
  els.resultText.textContent = text
  els.resultText.style.color = isError ? '#dc2626' : '#0f172a'
  showStatus(isError ? `Lỗi: ${text.split('\n')[0]}` : text.split('\n')[0], isError ? 'error' : 'ok')
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

function applySavedToForm(saved) {
  els.crmUrl.value = saved.crmUrl || ''
  els.supabaseUrl.value = saved.supabaseUrl || ''
  els.supabaseAnonKey.value = saved.supabaseAnonKey || ''
  if (els.configPath) els.configPath.textContent = saved.configPath || ''
}

async function saveConfig() {
  setBusy(els.saveConfigBtn, true, 'Đang lưu...', 'Lưu cấu hình')
  try {
    const saved = await window.bcrmImport.saveConfig(getConfigFromForm())
    applySavedToForm(saved)
    let message = `Đã lưu cấu hình.\nFile: ${saved.configPath}`
    if (saved.fixes?.length) message += `\n\n${saved.fixes.join('\n')}`
    showResult(message, false)
  } catch (err) {
    const message = err?.message || 'Không lưu được cấu hình.'
    showResult(message, true)
  } finally {
    setBusy(els.saveConfigBtn, false, 'Đang lưu...', 'Lưu cấu hình')
  }
}

async function testConfig() {
  setBusy(els.testConfigBtn, true, 'Đang kiểm tra...', 'Kiểm tra kết nối')
  try {
    const form = getConfigFromForm()
    const result = await window.bcrmImport.testConfig(form)
    els.supabaseUrl.value = result.supabaseUrl
    let message = 'Kết nối Supabase OK.'
    if (result.fixes?.length) message += `\n${result.fixes.join('\n')}`

    if (form.crmUrl?.trim()) {
      const crm = await window.bcrmImport.testCrm(form)
      message += `\n${crm.message}`
    } else {
      message += '\nChưa nhập URL CRM — bỏ qua kiểm tra API nhập.'
    }

    showResult(message, false)
  } catch (err) {
    showResult(err?.message || 'Kiểm tra thất bại.', true)
  } finally {
    setBusy(els.testConfigBtn, false, 'Đang kiểm tra...', 'Kiểm tra kết nối')
  }
}

async function loginWithGoogle() {
  setBusy(els.loginBtn, true, 'Đang mở Google...', 'Đăng nhập bằng Google')
  try {
    const result = await window.bcrmImport.login(getConfigFromForm())
    session = await window.bcrmImport.getSession()
    applySavedToForm(await window.bcrmImport.loadConfig())
    setAuthUi(true, result.email || session?.user?.email || '')
    let message = `Đăng nhập thành công: ${result.email || ''}`
    if (result.fixes?.length) message += `\n${result.fixes.join('\n')}`
    showResult(message, false)
  } catch (err) {
    showResult(err?.message || 'Đăng nhập thất bại.', true)
  } finally {
    setBusy(els.loginBtn, false, 'Đang mở Google...', 'Đăng nhập bằng Google')
  }
}

async function logout() {
  await window.bcrmImport.logout()
  session = null
  selectedFile = null
  els.fileLabel.textContent = 'Chưa chọn file'
  setAuthUi(false)
  showResult('Đã đăng xuất.')
}

async function pickFile() {
  const file = await window.bcrmImport.openFile()
  if (!file) return
  if (file.size > 4 * 1024 * 1024) {
    showResult('File quá lớn (tối đa 4MB).', true)
    return
  }
  selectedFile = file
  els.fileLabel.textContent = `${file.fileName} (${(file.size / 1024).toFixed(1)} KB)`
  els.uploadBtn.disabled = !session?.access_token
}

async function uploadFile() {
  session = await window.bcrmImport.getSession()

  if (!session?.access_token) throw new Error('Chưa đăng nhập.')
  if (!selectedFile?.filePath) throw new Error('Chưa chọn file.')

  els.progress.hidden = false
  els.uploadBtn.disabled = true

  try {
    const payload = await window.bcrmImport.uploadFile({
      filePath: selectedFile.filePath,
      fileName: selectedFile.fileName,
    })

    let text = `Tổng: ${payload.total}\nThành công: ${payload.success}\nLỗi: ${payload.failed}`
    if (payload.chunks > 1) text += `\nĐã chia ${payload.chunks} lô (mỗi lô tối đa 10.000 dòng).`
    if (payload.errors?.length) text += `\n\nChi tiết lỗi:\n${payload.errors.join('\n')}`
    showResult(text, payload.failed > 0)
  } finally {
    els.progress.hidden = true
    els.uploadBtn.disabled = !session?.access_token || !selectedFile
  }
}

async function boot() {
  if (!window.bcrmImport) {
    showResult('Lỗi khởi tạo ứng dụng (preload). Khởi động lại app.', true)
    return
  }

  const config = await window.bcrmImport.loadConfig()
  applySavedToForm(config)
  session = config.session || await window.bcrmImport.getSession()
  setAuthUi(!!session?.access_token, session?.user?.email || '')

  els.saveConfigBtn.addEventListener('click', () => saveConfig())
  els.testConfigBtn?.addEventListener('click', () => testConfig())
  els.loginBtn.addEventListener('click', () => loginWithGoogle())
  els.logoutBtn.addEventListener('click', () => logout().catch((e) => showResult(e.message, true)))
  els.pickFileBtn.addEventListener('click', () => pickFile().catch((e) => showResult(e.message, true)))
  els.uploadBtn.addEventListener('click', () => uploadFile().catch((e) => showResult(e.message, true)))
}

boot().catch((e) => showResult(e.message, true))
