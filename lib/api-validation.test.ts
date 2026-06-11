import { describe, expect, it } from 'vitest'
import {
  createSupportRequestSchema,
  kpiSummaryQuerySchema,
  parseJsonBody,
  updateSupportRequestSchema,
  verifyAuthSchema,
} from './api-validation'

const UUID = '6f1f3a8a-1234-4b5c-9d6e-7f8a9b0c1d2e'

describe('verifyAuthSchema', () => {
  it('accepts a valid payload', () => {
    expect(verifyAuthSchema.safeParse({ userId: UUID, userEmail: 'a@b.com' }).success).toBe(true)
  })

  it('rejects non-uuid userId and invalid email', () => {
    expect(verifyAuthSchema.safeParse({ userId: 'abc', userEmail: 'a@b.com' }).success).toBe(false)
    expect(verifyAuthSchema.safeParse({ userId: UUID, userEmail: 'not-an-email' }).success).toBe(false)
  })
})

describe('createSupportRequestSchema', () => {
  const valid = {
    item_id: UUID,
    item_type: 'LOAN',
    support_admin_id: UUID,
    scheduled_date: '2026-06-10',
  }

  it('accepts a valid payload', () => {
    expect(createSupportRequestSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects unknown item_type and malformed date', () => {
    expect(createSupportRequestSchema.safeParse({ ...valid, item_type: 'HACK' }).success).toBe(false)
    expect(createSupportRequestSchema.safeParse({ ...valid, scheduled_date: '10/06/2026' }).success).toBe(false)
  })
})

describe('updateSupportRequestSchema', () => {
  it('only allows whitelisted statuses', () => {
    expect(updateSupportRequestSchema.safeParse({ id: UUID, status: 'ACCEPTED' }).success).toBe(true)
    expect(updateSupportRequestSchema.safeParse({ id: UUID, status: 'DELETED' }).success).toBe(false)
  })
})

describe('kpiSummaryQuerySchema', () => {
  it('defaults to week and rejects unknown periods', () => {
    expect(kpiSummaryQuerySchema.parse({}).period).toBe('week')
    expect(kpiSummaryQuerySchema.safeParse({ period: 'decade' }).success).toBe(false)
  })
})

describe('parseJsonBody', () => {
  it('returns data for a valid body', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ id: UUID, status: 'COMPLETED' }),
    })
    const result = await parseJsonBody(request, updateSupportRequestSchema)
    expect(result).toEqual({ success: true, data: { id: UUID, status: 'COMPLETED' } })
  })

  it('returns a friendly error for invalid JSON', async () => {
    const request = new Request('http://localhost', { method: 'POST', body: 'not-json' })
    const result = await parseJsonBody(request, updateSupportRequestSchema)
    expect(result.success).toBe(false)
  })

  it('includes the failing field path in the error', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ id: 'abc', status: 'COMPLETED' }),
    })
    const result = await parseJsonBody(request, updateSupportRequestSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('id')
    }
  })
})
