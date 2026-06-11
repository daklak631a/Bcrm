import { z } from 'zod'

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/

export const verifyAuthSchema = z.object({
  userId: z.string().uuid(),
  userEmail: z.string().email().max(320),
})

// item_type khớp các sourceType thực tế gửi từ SalesSupportKanban
export const createSupportRequestSchema = z.object({
  item_id: z.string().uuid(),
  item_type: z.enum(['INTERACTION', 'PRODUCT', 'LOAN', 'DEPOSIT']),
  support_admin_id: z.string().uuid(),
  scheduled_date: z.string().regex(DATE_YYYY_MM_DD, 'Ngày phải có định dạng YYYY-MM-DD'),
})

export const updateSupportRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED']),
})

export const kpiSummaryQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('week'),
})

export type ParseBodyResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/** Parse + validate JSON body, trả về message gọn cho client thay vì ZodError thô. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ParseBodyResult<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { success: false, error: 'Body không phải JSON hợp lệ.' }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first?.path?.join('.') || 'body'
    return { success: false, error: `Dữ liệu không hợp lệ (${path}): ${first?.message || 'sai định dạng'}` }
  }

  return { success: true, data: result.data }
}
