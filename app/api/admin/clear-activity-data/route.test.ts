import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { CLEAR_ACTIVITY_CONFIRM_PHRASE } from '@/lib/admin/clear-activity-data'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockCreateClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/clear-activity-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/clear-activity-data', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
      rpc: mockRpc,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('requires exact confirm phrase', async () => {
    const response = await POST(makeRequest({ confirmPhrase: 'wrong' }))
    expect(response.status).toBe(400)
  })

  it('rejects non super-admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'user-1', role: 'ADMIN_LEVEL_2', full_name: 'A' }, error: null }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    const response = await POST(makeRequest({ confirmPhrase: CLEAR_ACTIVITY_CONFIRM_PHRASE }))
    expect(response.status).toBe(403)
  })
})
