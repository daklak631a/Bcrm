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

function makeFormRequest(file?: File) {
  const formData = new FormData()
  if (file) formData.append('file', file)
  return new Request('http://localhost/api/customers/import', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/customers/import', () => {
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

  it('requires authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const response = await POST(makeFormRequest(new File(['x'], 'test.xlsx')))
    expect(response.status).toBe(401)
  })

  it('rejects non-admin users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'user-1', role: 'USER', department_id: null }, error: null }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    const response = await POST(makeFormRequest(new File(['x'], 'test.xlsx')))
    expect(response.status).toBe(403)
  })

  it('requires file in form data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'user-1', role: 'ADMIN_LEVEL_1', department_id: null }, error: null }),
            }),
          }),
        }
      }
      return { select: vi.fn() }
    })

    const response = await POST(makeFormRequest())
    expect(response.status).toBe(400)
  })
})
