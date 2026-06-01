import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { checkRateLimit, getClientIp } from '@/lib/middleware/rate-limit'

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader || '' }
      }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let query = supabase.from('support_requests').select(`
      *,
      requester:profiles!support_requests_requester_id_fkey(*),
      support_admin:profiles!support_requests_support_admin_id_fkey(*)
    `)

    if (date) query = query.eq('scheduled_date', date)
    if (adminId) query = query.eq('support_admin_id', adminId)
    if (itemId) query = query.eq('item_id', itemId)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if the admin is already accepted on this date
    const { data: existing } = await supabase
      .from('support_requests')
      .select('id, status')
      .eq('support_admin_id', support_admin_id)
      .eq('scheduled_date', scheduled_date)
      .eq('status', 'ACCEPTED')
    
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

    const authHeader = request.headers.get('Authorization')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
