import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/middleware/rate-limit'
import { internalServerError } from '@/lib/api-errors'
import { parseJsonBody } from '@/lib/api-validation'
import { CLEAR_ACTIVITY_CONFIRM_PHRASE } from '@/lib/admin/clear-activity-data'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const SUPER_ADMIN_ROLES = new Set(['ADMIN_LEVEL_0', 'ADMIN_LEVEL_1'])

const clearActivitySchema = z.object({
  confirmPhrase: z.literal(CLEAR_ACTIVITY_CONFIRM_PHRASE),
})

function createRequestClient(authHeader: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader || '' } },
  })
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(ip, '/api/admin/clear-activity-data', 'write')
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }, { status: 429 })
  }

  try {
    const parsed = await parseJsonBody(request, clearActivitySchema)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Thiếu thông tin xác thực.' }, { status: 401 })
    }

    const userClient = createRequestClient(authHeader)
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 403 })
    }

    if (!SUPER_ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Chỉ Admin L0/L1 mới được xóa lịch sử hệ thống.' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Thiếu SUPABASE_SERVICE_ROLE_KEY trên server.' }, { status: 500 })
    }

    const serviceClient = createServiceClient()
    const { data: deletedCounts, error: rpcError } = await serviceClient.rpc('clear_activity_keep_customers')

    if (rpcError) {
      logger.error('[Clear Activity] RPC failed', { error: getErrorMessage(rpcError) }, { production: true })
      return NextResponse.json({
        error: 'Chưa chạy migration clear_activity_keep_customers trên Supabase. Xem migrations/migration_clear_activity_keep_customers_20260611.sql',
      }, { status: 500 })
    }

    logger.warn('[Clear Activity] Activity data cleared', {
      actorId: user.id,
      actorRole: profile.role,
      deletedCounts,
    }, { production: true })

    return NextResponse.json({
      success: true,
      deleted: deletedCounts,
      kept: ['customers', 'loans', 'deposits', 'profiles', 'cross_sell_products', 'system_settings'],
      clearPilotLocalStorage: true,
    })
  } catch (error: unknown) {
    return internalServerError(error, '[Clear Activity] Failed', 'Không thể xóa lịch sử hoạt động.')
  }
}
