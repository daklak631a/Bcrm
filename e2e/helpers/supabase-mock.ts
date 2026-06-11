import type { Page } from '@playwright/test'

export const E2E_USER = {
  id: 'e2e00000-0000-4000-8000-000000000001',
  email: 'e2e-user@banking-crm.test',
  full_name: 'E2E Test User',
  role: 'ADMIN_LEVEL_1',
  is_active: true,
  department_id: null,
} as const

function toBase64Url(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/** Supabase client decode JWT locally — token phải có dạng JWT hợp lệ. */
export function makeMockJwt(payload: Record<string, unknown>) {
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' })
  const body = toBase64Url(payload)
  return `${header}.${body}.e2e-mock-signature`
}

export const MOCK_ACCESS_TOKEN = makeMockJwt({
  sub: E2E_USER.id,
  email: E2E_USER.email,
  role: 'authenticated',
  aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 3600,
})

export const MOCK_REFRESH_TOKEN = makeMockJwt({
  sub: E2E_USER.id,
  type: 'refresh',
  exp: Math.floor(Date.now() / 1000) + 86_400,
})

export async function mockSupabaseAuth(page: Page) {
  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    if (url.includes('/user') && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: E2E_USER.id,
          aud: 'authenticated',
          role: 'authenticated',
          email: E2E_USER.email,
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: { full_name: E2E_USER.full_name },
          created_at: new Date().toISOString(),
        }),
      })
      return
    }

    if (url.includes('/token') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: MOCK_ACCESS_TOKEN,
          refresh_token: MOCK_REFRESH_TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: E2E_USER.id,
            email: E2E_USER.email,
          },
        }),
      })
      return
    }

    await route.continue()
  })
}

export async function mockAuthVerify(page: Page) {
  await page.route('**/api/auth/verify', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          ...E2E_USER,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          effective_role: E2E_USER.role,
        },
      }),
    })
  })
}
