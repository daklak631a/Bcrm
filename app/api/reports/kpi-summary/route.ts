import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import dayjs from 'dayjs'

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
        startDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
        break
      case 'week':
        startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD')
        break
      case 'month':
        startDate = dayjs().startOf('month').format('YYYY-MM-DD')
        break
      case 'quarter':
        startDate = dayjs().startOf('quarter').format('YYYY-MM-DD')
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

    return NextResponse.json({ data, startDate, endDate })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
