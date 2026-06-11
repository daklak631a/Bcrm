function stripInvisible(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

function normalizeCrmUrl(raw) {
  let url = stripInvisible(raw)
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, '')}`
  return url.replace(/\/+$/, '')
}

function normalizeSupabaseUrl(raw) {
  let url = stripInvisible(raw)
  if (!url) return ''

  // Sửa lỗi gõ phổ biến: "s://..." khi mất "http"
  if (/^s:\/\//i.test(url)) url = `https://${url.slice(4)}`
  if (/^https?:\/\/\//i.test(url)) url = url.replace(/^https?:\/\/+/, 'https://')
  if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, '')}`

  return url.replace(/\/+$/, '')
}

function normalizeAnonKey(raw) {
  return stripInvisible(raw).replace(/\s+/g, '')
}

function validateConfig(config) {
  const crmUrl = normalizeCrmUrl(config.crmUrl)
  const supabaseUrl = normalizeSupabaseUrl(config.supabaseUrl)
  const supabaseAnonKey = normalizeAnonKey(config.supabaseAnonKey)
  const fixes = []

  if (stripInvisible(config.supabaseUrl) !== supabaseUrl && supabaseUrl) {
    fixes.push(`Đã tự sửa Supabase URL thành: ${supabaseUrl}`)
  }

  if (!crmUrl) throw new Error('Nhập URL hệ thống CRM.')
  if (!supabaseUrl) throw new Error('Nhập Supabase URL.')
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) {
    throw new Error(
      `Supabase URL không hợp lệ: "${supabaseUrl}".\nCopy từ Supabase → Settings → API → Project URL.`
    )
  }
  if (!supabaseAnonKey || supabaseAnonKey.length < 20) {
    throw new Error('Nhập Supabase Anon Key (Publishable key) đầy đủ.')
  }

  return { crmUrl, supabaseUrl, supabaseAnonKey, fixes }
}

module.exports = {
  normalizeCrmUrl,
  normalizeSupabaseUrl,
  normalizeAnonKey,
  validateConfig,
}
