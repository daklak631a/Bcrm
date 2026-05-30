import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import dayjs from 'dayjs'

const TARGET_FIELDS = [
  'target_cif_moi',
  'target_bidv_direct',
  'target_bh_nhan_tho',
  'target_bh_khoan_vay',
  'target_huy_dong_tang_rong',
  'target_du_no_ngan_han_tang_rong',
  'target_du_no_trung_han_tang_rong',
  'target_cap_moi_hmtd',
] as const

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // day, week, month, quarter, year
    
    // Lấy Authorization header
    const authHeader = request.headers.get('Authorization')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader || ''
        }
      }
    })

    const endDate = dayjs().format('YYYY-MM-DD')
    let startDate = dayjs().format('YYYY-MM-DD')

    switch (period) {
      case 'day':
        startDate = dayjs().format('YYYY-MM-DD')
        break
      case 'week':
        // Lấy ngày Thứ Hai của tuần hiện tại (khớp tuyệt đối với logic Front-end)
        const dayOfWeek = dayjs().day()
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        startDate = dayjs().add(diff, 'day').format('YYYY-MM-DD')
        break
      case 'month':
        startDate = dayjs().startOf('month').format('YYYY-MM-DD')
        break
      case 'quarter':
        startDate = dayjs()
          .month(Math.floor(dayjs().month() / 3) * 3)
          .startOf('month')
          .format('YYYY-MM-DD')
        break
      case 'year':
        startDate = dayjs().startOf('year').format('YYYY-MM-DD')
        break
      default:
        startDate = dayjs().startOf('month').format('YYYY-MM-DD')
    }

    // Gọi RPC function đã tạo trong CSDL
    const { data, error } = await supabase.rpc('get_kpi_summary', {
      start_date: startDate,
      end_date: endDate
    })

    if (error) {
      console.error('Error fetching KPI summary:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch targets based on period
    let targetsByUser = new Map<string, Record<string, number>>()

    const addTarget = (target: any) => {
      if (!target?.user_id) return
      const current = targetsByUser.get(target.user_id) || {}
      TARGET_FIELDS.forEach((field) => {
        current[field] = Number(current[field] || 0) + Number(target[field] || 0)
      })
      targetsByUser.set(target.user_id, current)
    }
    
    if (period === 'day') {
      const { data: dData } = await supabase.from('daily_plans').select('*').eq('target_date', startDate)
      dData?.forEach(addTarget)
    } else if (period === 'week') {
      const { data: wData } = await supabase.from('weekly_plans').select('*').eq('start_date', startDate)
      wData?.forEach(addTarget)
    } else {
      const { data: plansData } = await supabase
        .from('plans')
        .select('id, target_date')
        .gte('target_date', startDate)
        .lte('target_date', endDate)

      const planIds = plansData?.map((plan) => plan.id) || []
      if (planIds.length > 0) {
        const { data: mData } = await supabase
          .from('plan_assignments')
          .select('*')
          .in('plan_id', planIds)
        mData?.forEach(addTarget)
      }
    }

    const mergedData = data?.map((row: any) => {
      const target = targetsByUser.get(row.manager_id)
      return {
        ...row,
        target_cif_moi: target?.target_cif_moi || 0,
        target_bidv_direct: target?.target_bidv_direct || 0,
        target_bh_nhan_tho: target?.target_bh_nhan_tho || 0,
        target_bh_khoan_vay: target?.target_bh_khoan_vay || 0,
        target_huy_dong_tang_rong: target?.target_huy_dong_tang_rong || 0,
        target_du_no_ngan_han_tang_rong: target?.target_du_no_ngan_han_tang_rong || 0,
        target_du_no_trung_han_tang_rong: target?.target_du_no_trung_han_tang_rong || 0,
        target_cap_moi_hmtd: target?.target_cap_moi_hmtd || 0,
      }
    }) || []

    return NextResponse.json({ data: mergedData, startDate, endDate })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
