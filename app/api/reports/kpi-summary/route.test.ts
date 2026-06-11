import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const mockGetUser = vi.fn()
const mockCreateClient = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

vi.mock('@/lib/middleware/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

describe('GET /api/reports/kpi-summary', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('rejects invalid period query', async () => {
    const response = await GET(new Request('http://localhost/api/reports/kpi-summary?period=decade'))
    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(new Request('http://localhost/api/reports/kpi-summary?period=week'))
    expect(response.status).toBe(401)
  })
})
