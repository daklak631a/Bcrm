// Cache TTL + request dedup dùng chung cho các module API, kèm helper phân trang/scope

export const DEFAULT_CACHE_TTL_MS = 45_000
export const LONG_CACHE_TTL_MS = 5 * 60_000

type CacheEntry<T> = {
  expiresAt: number
  value?: T
  promise?: Promise<T>
}

export type PageResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type CurrentUserScope = {
  id?: string | null
  role?: string | null
  department_id?: string | null
  branchId?: string | null
}

const apiCache = new Map<string, CacheEntry<any>>()

export function cached<T>(key: string, loader: () => Promise<T>, ttlMs = DEFAULT_CACHE_TTL_MS): Promise<T> {
  const now = Date.now()
  const existing = apiCache.get(key) as CacheEntry<T> | undefined

  if (existing?.value !== undefined && existing.expiresAt > now) {
    return Promise.resolve(existing.value)
  }

  if (existing?.promise && existing.expiresAt > now) {
    return existing.promise
  }

  const promise = loader()
    .then((value) => {
      apiCache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .catch((error) => {
      apiCache.delete(key)
      throw error
    })

  apiCache.set(key, { promise, expiresAt: now + ttlMs })
  return promise
}

export function invalidateApiCache(...prefixes: string[]) {
  for (const key of Array.from(apiCache.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      apiCache.delete(key)
    }
  }
}

export const invalidateCache = invalidateApiCache

export function normalizePage(page?: number) {
  return Math.max(1, Number(page) || 1)
}

export function normalizePageSize(pageSize?: number, maxPageSize = 100) {
  return Math.min(maxPageSize, Math.max(1, Number(pageSize) || 20))
}

export function pageRange(page?: number, pageSize?: number, maxPageSize = 100) {
  const normalizedPage = normalizePage(page)
  const normalizedPageSize = normalizePageSize(pageSize, maxPageSize)
  const from = (normalizedPage - 1) * normalizedPageSize
  const to = from + normalizedPageSize - 1

  return { page: normalizedPage, pageSize: normalizedPageSize, from, to }
}

export function escapePostgrestLike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`)
}

export function normalizeSearchTerm(search?: string) {
  const trimmed = (search || '').trim()
  return trimmed.length >= 2 ? escapePostgrestLike(trimmed) : ''
}

export function isGlobalRole(role?: string | null) {
  return role === 'ADMIN_LEVEL_0' || role === 'ADMIN_LEVEL_1' || role === 'ADVISOR'
}

export function isDepartmentRole(role?: string | null) {
  return role === 'ADMIN_LEVEL_2' || role === 'ADMIN_LEVEL_3'
}
