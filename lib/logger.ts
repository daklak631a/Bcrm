type LogLevel = "debug" | "info" | "warn" | "error"

type LogMeta = Record<string, unknown>

type LogOptions = {
  production?: boolean
}

const isProduction = process.env.NODE_ENV === "production"

function shouldLog(options?: LogOptions) {
  return !isProduction || options?.production === true
}

function write(level: LogLevel, message: string, meta?: LogMeta, options?: LogOptions) {
  if (!shouldLog(options)) return

  const payload = meta && Object.keys(meta).length > 0 ? [message, meta] : [message]
  console[level](...payload)
}

export const logger = {
  debug: (message: string, meta?: LogMeta, options?: LogOptions) => write("debug", message, meta, options),
  info: (message: string, meta?: LogMeta, options?: LogOptions) => write("info", message, meta, options),
  warn: (message: string, meta?: LogMeta, options?: LogOptions) => write("warn", message, meta, options),
  error: (message: string, meta?: LogMeta, options?: LogOptions) => write("error", message, meta, options),
}
