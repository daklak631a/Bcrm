export function getErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi không mong muốn.") {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string" && error.trim()) return error
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }
  return fallback
}

export function toPublicErrorMessage(error: unknown, fallback = "Đã xảy ra lỗi. Vui lòng thử lại.") {
  const rawMessage = getErrorMessage(error, fallback)
  const technicalPatterns = [
    /service_role/i,
    /supabase/i,
    /schema cache/i,
    /violates row-level security/i,
    /jwt/i,
    /token/i,
    /stack/i,
  ]

  if (technicalPatterns.some((pattern) => pattern.test(rawMessage))) {
    return fallback
  }

  return rawMessage
}
