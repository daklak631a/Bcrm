import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/middleware/rate-limit'

const VALID_SUPPORT_STATUSES = new Set(['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED'])

function createRequestClient(authHeader: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader || '' } }
  })
}

async function getCurrentProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, department_id')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as { id: string; role: string; department_id: string | null }
}

function canSeeSupportRequest(request: any, profile: { id: string; role: string; department_id: string | null }) {
  if (profile.role === 'ADMIN_LEVEL_1') return true
  if (request.requester_id === profile.id || request.support_admin_id === profile.id) return true
  if (profile.role === 'ADMIN_LEVEL_2') {
    return request.requester?.department_id === profile.department_id || request.support_admin?.department_id === profile.department_id
  }
  return false
}

export async function GET(request: Request) {
  // Rate limiting
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, '/api/support/requests', 'default');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD
    const adminId = searchParams.get('adminId')
    const itemId = searchParams.get('itemId')

    const authHeader = request.headers.get('Authorization')
    const supabase = createRequestClient(authHeader)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentProfile = await getCurrentProfile(supabase, user.id)
    if (!currentProfile) return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 403 })

    let query = supabase.from('support_requests').select(`
      *,
      requester:profiles!support_requests_requester_id_fkey(id, full_name, email, role, department_id),
      support_admin:profiles!support_requests_support_admin_id_fkey(id, full_name, email, role, department_id)
    `)

    if (date) query = query.eq('scheduled_date', date)
    if (adminId) query = query.eq('support_admin_id', adminId)
    if (itemId) query = query.eq('item_id', itemId)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data: (data || []).filter((request) => canSeeSupportRequest(request, currentProfile)) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, '/api/support/requests', 'default');
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const body = await request.json()
    const { item_id, item_type, support_admin_id, scheduled_date } = body

    if (!item_id || !item_type || !support_admin_id || !scheduled_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const authHeader = request.headers.get('Authorization')
    const supabase = createRequestClient(authHeader)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentProfile = await getCurrentProfile(supabase, user.id)
    if (!currentProfile) return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 403 })

    const { data: supportAdmin, error: adminError } = await supabase
      .from('profiles')
      .select('id, role, department_id, is_active')
      .eq('id', support_admin_id)
      .single()

    if (adminError || !supportAdmin || supportAdmin.is_active === false || !['ADMIN_LEVEL_2', 'ADMIN_LEVEL_3', 'ADVISOR'].includes(supportAdmin.role)) {
      return NextResponse.json({ error: 'Người hỗ trợ không hợp lệ.' }, { status: 400 })
    }
    
    // We allow requesting even if busy, but we might warn them on UI
    // Insert new request
    const { data, error } = await supabase.from('support_requests').insert([{
      item_id,
      item_type,
      requester_id: user.id,
      support_admin_id,
      scheduled_date,
      status: 'PENDING'
    }]).select().single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (!VALID_SUPPORT_STATUSES.has(status)) return NextResponse.json({ error: 'Trạng thái hỗ trợ không hợp lệ.' }, { status: 400 })

    const authHeader = request.headers.get('Authorization')
    const supabase = createRequestClient(authHeader)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentProfile = await getCurrentProfile(supabase, user.id)
    if (!currentProfile) return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 403 })

    const { data: currentRequest, error: readError } = await supabase
      .from('support_requests')
      .select('id, requester_id, support_admin_id, status')
      .eq('id', id)
      .single()

    if (readError || !currentRequest) return NextResponse.json({ error: 'Không tìm thấy yêu cầu hỗ trợ.' }, { status: 404 })

    const isAssignedSupport = currentRequest.support_admin_id === user.id
    const isRequesterCancelling = currentRequest.requester_id === user.id && currentRequest.status === 'PENDING' && status === 'REJECTED'
    const isSystemAdmin = currentProfile.role === 'ADMIN_LEVEL_1'
    if (!isAssignedSupport && !isRequesterCancelling && !isSystemAdmin) {
      return NextResponse.json({ error: 'Bạn không có quyền cập nhật yêu cầu hỗ trợ này.' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
