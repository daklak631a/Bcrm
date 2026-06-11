import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, PATCH } from './route'

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

const UUID = '6f1f3a8a-1234-4b5c-9d6e-7f8a9b0c1d2e'
const UUID2 = '7f2f3a8a-1234-4b5c-9d6e-7f8a9b0c1d2f'

function makeJsonRequest(method: string, body: unknown) {
  return new Request('http://localhost/api/support/requests', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/support/requests', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('rejects invalid payload', async () => {
    const response = await POST(makeJsonRequest('POST', {
      item_id: 'not-uuid',
      item_type: 'LOAN',
      support_admin_id: UUID2,
      scheduled_date: '2026-06-10',
    }))
    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await POST(makeJsonRequest('POST', {
      item_id: UUID,
      item_type: 'LOAN',
      support_admin_id: UUID2,
      scheduled_date: '2026-06-10',
    }))

    expect(response.status).toBe(401)
  })
})

describe('PATCH /api/support/requests', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    mockCreateClient.mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('rejects unknown status values', async () => {
    const response = await PATCH(makeJsonRequest('PATCH', {
      id: UUID,
      status: 'DELETED',
    }))
    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await PATCH(makeJsonRequest('PATCH', {
      id: UUID,
      status: 'ACCEPTED',
    }))

    expect(response.status).toBe(401)
  })
})
