import { expect, test } from '@playwright/test'
import {
  E2E_USER,
  MOCK_ACCESS_TOKEN,
  MOCK_REFRESH_TOKEN,
  mockSupabaseAuth,
} from './helpers/supabase-mock'

test.describe('Login flow', () => {
  test('redirects unauthenticated users from protected page to login', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)
    await expect(page.getByRole('button', { name: /Đăng nhập bằng Google/i })).toBeVisible()
  })

  test('login page shows Google sign-in and security notice', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('button', { name: /Đăng nhập bằng Google/i })).toBeVisible()
    await expect(page.getByText(/Chỉ tài khoản được Admin cấp quyền/i)).toBeVisible()
  })

  test('starts Google OAuth when sign-in button is clicked', async ({ page }) => {
    await mockSupabaseAuth(page)

    let oauthStarted = false
    await page.route('**/auth/v1/authorize**', async (route) => {
      oauthStarted = true
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>OAuth mock</body></html>',
      })
    })

    await page.goto('/login')
    await page.getByRole('button', { name: /Đăng nhập bằng Google/i }).click()

    await expect.poll(() => oauthStarted, { timeout: 10_000 }).toBe(true)
  })

  test('auth callback shows error when OAuth hash has no tokens', async ({ page }) => {
    await page.goto('/auth/callback')

    await expect(page.getByText(/Không tìm thấy thông tin đăng nhập/i)).toBeVisible({ timeout: 15_000 })
  })

  test('auth callback verifies session after OAuth hash', async ({ page }) => {
    await mockSupabaseAuth(page)

    let verifyPayload: { userId?: string; userEmail?: string } | null = null
    await page.route('**/api/auth/verify', async (route) => {
      verifyPayload = await route.request().postDataJSON()
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

    await page.goto(
      `/auth/callback#access_token=${MOCK_ACCESS_TOKEN}&refresh_token=${MOCK_REFRESH_TOKEN}&token_type=bearer`
    )

    await expect.poll(() => verifyPayload?.userId, { timeout: 15_000 }).toBe(E2E_USER.id)
    await expect.poll(() => verifyPayload?.userEmail).toBe(E2E_USER.email)

    // Client gọi router.push('/dashboard'); proxy server từ chối JWT mock → quay lại login.
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/, { timeout: 15_000 })
  })
})
