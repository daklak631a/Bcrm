import { describe, expect, it } from 'vitest'
import { isPublicApi, isPublicPage, isStaticAsset } from './routes'

describe('route guards', () => {
  it('marks login and auth callback as public pages', () => {
    expect(isPublicPage('/login')).toBe(true)
    expect(isPublicPage('/auth/callback')).toBe(true)
    expect(isPublicPage('/dashboard')).toBe(false)
  })

  it('marks verify and inngest APIs as public', () => {
    expect(isPublicApi('/api/auth/verify')).toBe(true)
    expect(isPublicApi('/api/inngest')).toBe(true)
    expect(isPublicApi('/api/support/requests')).toBe(false)
  })

  it('detects static assets', () => {
    expect(isStaticAsset('/_next/static/chunk.js')).toBe(true)
    expect(isStaticAsset('/favicon.ico')).toBe(true)
    expect(isStaticAsset('/dashboard')).toBe(false)
  })
})
