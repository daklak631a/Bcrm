export function getErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi không mong muốn.") {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error.trim()) return error
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }
  return fallback
}

// Mọi lỗi "hình dạng DB/hạ tầng" đều bị che để tránh rò schema, tên cột,
// tên constraint, mã lỗi Postgres/PostgREST... Message nghiệp vụ (tiếng Việt,
// do app chủ động ném) vẫn được giữ để hiển thị cho user.
const TECHNICAL_PATTERNS: RegExp[] = [
  // Hạ tầng / auth
  /service_role/i,
  /supabase/i,
  /schema cache/i,
  /row-level security/i,
  /\bjwt\b/i,
  /\btoken\b/i,
  /\bstack\b/i,
  // Lỗi DB / Postgres / PostgREST
  /\bpgrst/i, // mã lỗi PostgREST (PGRST...)
  /postgres/i,
  /duplicate key value/i,
  /violates (?:unique|foreign key|check|not-null)/i,
  /\bconstraint\b/i,
  /_(?:key|fkey|pkey|check)\b/i, // tên constraint kiểu customers_cif_code_key
  /\b(?:column|relation|table)\s+"/i, // column "x" / relation "y" does not exist
  /null value in column/i,
  /permission denied for/i,
  /syntax error at/i,
  // Lỗi kết nối / mạng nội bộ
  /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i,
  /connection (?:refused|timed out|terminated)/i,
  // Dấu vết stack trace: "at fn (file:line:col)"
  /\bat\s+.+:\d+:\d+/,
]

export function toPublicErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  const rawMessage = getErrorMessage(error, fallback)

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(rawMessage))) {
    return fallback
  }

  return rawMessage
}
