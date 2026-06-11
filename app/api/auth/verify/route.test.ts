import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockCreateClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

const USER_ID = '6f1f3a8a-1234-4b5c-9d6e-7f8a9b0c1d2e'
const USER_EMAIL = 'user@bank.com'

function buildChain(result: { data: unknown; error?: unknown }) {
  const terminal = vi.fn().mockResolvedValue(result)
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const proxy = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === 'then') return undefined
      if (!chain[prop]) {
        chain[prop] = vi.fn().mockReturnValue(proxy)
      }
      if (['single', 'maybeSingle'].includes(prop)) {
        chain[prop] = terminal
      }
      return chain[prop]
    },
  })
  return { proxy, terminal }
}

function makeRequest(body: unknown, authHeader?: string) {
  return new Request('http://localhost/api/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/verify', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')

    mockCreateClient.mockImplementation(() => ({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    }))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('rejects invalid JSON body', async () => {
    const request = new Request('http://localhost/api/auth/verify', {
      method: 'POST',
      body: 'not-json',
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('rejects missing authorization header', async () => {
    const response = await POST(makeRequest({ userId: USER_ID, userEmail: USER_EMAIL }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining('Thiếu') })
  })

  it('rejects invalid session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })

    const response = await POST(makeRequest(
      { userId: USER_ID, userEmail: USER_EMAIL },
      'Bearer bad-token'
    ))

    expect(response.status).toBe(401)
  })

  it('rejects mismatched user identity', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'other-id', email: USER_EMAIL } },
      error: null,
    })

    const response = await POST(makeRequest(
      { userId: USER_ID, userEmail: USER_EMAIL },
      'Bearer good-token'
    ))

    expect(response.status).toBe(403)
  })

  it('returns existing active profile', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    })

    const profile = {
      id: USER_ID,
      email: USER_EMAIL,
      full_name: 'Test User',
      role: 'USER',
      is_active: true,
    }

    const { proxy } = buildChain({ data: profile, error: null })
    mockFrom.mockReturnValue(proxy)

    const response = await POST(makeRequest(
      { userId: USER_ID, userEmail: USER_EMAIL },
      'Bearer good-token'
    ))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.profile).toMatchObject({ id: USER_ID, effective_role: 'USER' })
  })

  it('rejects deactivated profile', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    })

    const { proxy } = buildChain({
      data: { id: USER_ID, email: USER_EMAIL, role: 'USER', is_active: false },
      error: null,
    })
    mockFrom.mockReturnValue(proxy)

    const response = await POST(makeRequest(
      { userId: USER_ID, userEmail: USER_EMAIL },
      'Bearer good-token'
    ))

    expect(response.status).toBe(403)
  })
})
