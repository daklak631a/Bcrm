/** Đường dẫn trang không yêu cầu đăng nhập. */
export const PUBLIC_PAGE_PREFIXES = ['/login', '/auth/callback'] as const

/** API routes không yêu cầu session (tự xác thực hoặc webhook). */
export const PUBLIC_API_PREFIXES = [
  '/api/auth/verify',
  '/api/inngest',
  /** Desktop app gửi Bearer token, không dùng cookie session */
  '/api/customers/import',
] as const

export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp')
  )
}
