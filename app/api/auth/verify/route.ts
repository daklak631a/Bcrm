import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getErrorMessage } from '@/lib/errors'

/**
 * POST /api/auth/verify
 * Server-side auth verification using SERVICE_ROLE_KEY to bypass RLS.
 * Called by AuthProvider after Google OAuth sign-in.
 *
 * Body: { userId: string, userEmail: string }
 * Returns: { profile: Profile } or { error: string }
 */
export async function POST(request: Request) {
  try {
    const { userId, userEmail } = await request.json()
    const authHeader = request.headers.get('Authorization')

    if (!userId || !userEmail || !authHeader) {
      return NextResponse.json(
        { error: 'Thiếu thông tin xác thực.' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      logger.error('[Auth Verify] Missing Supabase server credentials', undefined, { production: true })
      return NextResponse.json(
        { error: 'Hệ thống xác thực chưa được cấu hình đầy đủ.' },
        { status: 500 }
      )
    }

    const authSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Phiên đăng nhập không hợp lệ.' },
        { status: 401 }
      )
    }

    if (user.id !== userId || user.email !== userEmail) {
      return NextResponse.json(
        { error: 'Thông tin xác thực không khớp.' },
        { status: 403 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingProfile && !profileError) {
      if (existingProfile.is_active === false) {
        return NextResponse.json(
          { error: 'Tài khoản đã bị vô hiệu hóa.' },
          { status: 403 }
        )
      }

      let effectiveRole = existingProfile.role
      if (effectiveRole === 'ADMIN_LEVEL_3') {
        const today = new Date().toISOString().split('T')[0]
        const { data: delegation } = await supabase
          .from('role_delegations')
          .select('delegated_role')
          .eq('delegatee_id', userId)
          .eq('status', 'ACTIVE')
          .lte('start_date', today)
          .gte('end_date', today)
          .maybeSingle()

        if (delegation?.delegated_role) {
          effectiveRole = delegation.delegated_role
        }
      }

      return NextResponse.json({ profile: { ...existingProfile, effective_role: effectiveRole } })
    }

    logger.debug('[Auth Verify] Profile not found, checking allowed_emails')

    const { data: allowed, error: allowedError } = await supabase
      .from('allowed_emails')
      .select('*')
      .eq('email', userEmail)
      .eq('is_active', true)
      .single()

    if (allowedError) {
      logger.warn('[Auth Verify] allowed_emails query failed', { error: getErrorMessage(allowedError) })
    }

    if (!allowed) {
      return NextResponse.json(
        { error: 'Tài khoản chưa được cấp quyền truy cập vào hệ thống.' },
        { status: 403 }
      )
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: userEmail,
        full_name: allowed.full_name,
        role: allowed.role || 'USER',
        department_id: allowed.department_id || null,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('[Auth Verify] Profile insert failed', { error: getErrorMessage(insertError) })
      return NextResponse.json(
        { error: 'Không thể tạo hồ sơ người dùng. Vui lòng liên hệ quản trị hệ thống.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile: newProfile })
  } catch (err) {
    logger.error('[Auth Verify] Unexpected error', { error: getErrorMessage(err) })
    return NextResponse.json(
      { error: 'Lỗi xác thực. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}
