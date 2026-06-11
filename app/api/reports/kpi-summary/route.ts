import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { checkRateLimit, getClientIp } from '@/lib/middleware/rate-limit'
import { internalServerError } from '@/lib/api-errors'
import { getProductMetricValue } from '@/lib/product-metrics'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { kpiSummaryQuerySchema } from '@/lib/api-validation'

const OTHER_PRODUCTS_ID = 'other_spdv'

function classifyKpiProduct(product?: any): string {
  const upperName = `${product?.name || ''}`.toUpperCase()
  const upperType = `${product?.type || ''}`.toUpperCase()
  const text = `${upperName} ${upperType}`

  if (text.includes('CIF')) return 'cif_moi'
  if (text.includes('DIRECT')) return 'bidv_direct'
  if (text.includes('HMTD') || text.includes('HẠN MỨC') || text.includes('HAN MUC')) return 'cap_moi_hmtd'
  if (text.includes('BẢO HIỂM') || text.includes('BAO HIEM') || text.includes('BH ') || text.includes('LIFE')) {
    if (text.includes('KHOẢN VAY') || text.includes('KHOAN VAY') || text.includes('LOAN')) return 'bh_khoan_vay'
    return 'bh_nhan_tho'
  }
  if (text.includes('HUY ĐỘNG') || text.includes('HUY DONG')) return 'huy_dong_tang_rong'
  if (text.includes('DƯ NỢ') || text.includes('DU NO')) {
    if (text.includes('NGẮN HẠN') || text.includes('NGAN HAN')) return 'du_no_ngan_han_tang_rong'
    if (text.includes('TRUNG') || text.includes('DÀI HẠN') || text.includes('DAI HAN')) return 'du_no_trung_han_tang_rong'
  }

  return OTHER_PRODUCTS_ID
}

const TARGET_FIELDS = [
  'target_loans_amount',
  'target_deposits_amount',
  'target_calls',
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
  // Rate limiting
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, '/api/reports/kpi-summary', 'default');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        }
      }
    );
  }

  try {
    const { searchParams } = new URL(request.url)
    const periodResult = kpiSummaryQuerySchema.safeParse({
      period: searchParams.get('period') ?? undefined,
    })
    if (!periodResult.success) {
      return NextResponse.json({ error: 'Tham số period không hợp lệ.' }, { status: 400 })
    }
    const period = periodResult.data.period
    
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, department_id')
      .eq('id', user.id)
      .single()

    if (profileError || !currentProfile) {
      if (profileError) {
        logger.warn('[KPI API] Failed to load current profile', { error: getErrorMessage(profileError) })
      }
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 403 })
    }

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

    // RPC này có thể chưa được migrate ở một số DB deploy.
    // Nếu thiếu function thì vẫn fallback sang logic tổng hợp thủ công bên dưới.
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_kpi_summary', {
      start_date: startDate,
      end_date: endDate
    })

    if (rpcError) {
      const missingRpc = /function .*get_kpi_summary|Could not find the function/i.test(rpcError.message || '')
      if (!missingRpc) {
        return internalServerError(rpcError, '[KPI API] RPC summary failed')
      }
      logger.warn(
        '[KPI API] Summary RPC unavailable; using manual aggregation',
        undefined,
        { production: true }
      )
    }
    const data = rpcData || []

    const { data: activeProductsData, error: activeProductsError } = await supabase
      .from('cross_sell_products')
      .select('id, name, type')
      .order('name', { ascending: true })

    if (activeProductsError) {
      return internalServerError(activeProductsError, '[KPI API] Failed to load active products')
    }

    const activeProducts = activeProductsData || []
    const productCategoryById = new Map(activeProducts.map((product: any) => [product.id, classifyKpiProduct(product)]))

    // Fetch targets based on period
    let targetsByUser = new Map<string, Record<string, number>>()

    const addTarget = (target: any) => {
      if (!target?.user_id) return
      const current = targetsByUser.get(target.user_id) || {}
      
      if (target.product_targets) {
        Object.entries(target.product_targets).forEach(([productId, val]) => {
           current[productId] = (current[productId] || 0) + Number(val || 0)
        })
      }

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

    let visibleManagerIds: Set<string> | null = null
    let visibleProfilesQuery = supabase
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('role', 'USER')
      .eq('is_active', true)
      .order('full_name')

    if (currentProfile.role === 'USER') {
      visibleManagerIds = new Set([currentProfile.id])
      visibleProfilesQuery = visibleProfilesQuery.eq('id', currentProfile.id)
    } else if (currentProfile.role === 'ADMIN_LEVEL_2') {
      visibleProfilesQuery = visibleProfilesQuery.eq('department_id', currentProfile.department_id)
    }

    const { data: visibleProfilesData, error: visibleProfilesError } = await visibleProfilesQuery

    if (visibleProfilesError) {
      return internalServerError(visibleProfilesError, '[KPI API] Failed to load visible profiles')
    }

    if (currentProfile.role !== 'USER') {
      visibleManagerIds = new Set((visibleProfilesData || []).map((profile: any) => profile.id))
    }

    const summaryByUser = new Map<string, any>((data || []).map((row: any) => [row.manager_id, row]))
    const roleFilteredData = (visibleProfilesData || []).map((profile: any) => ({
      ...(summaryByUser.get(profile.id) || {}),
      manager_id: profile.id,
      full_name: profile.full_name,
      short_name: summaryByUser.get(profile.id)?.short_name || null,
    }))

    const coreActualsByUser = new Map<string, { loans_amount: number; deposits_amount: number; calls: number }>()
    const getCoreActuals = (userId: string) => {
      const current = coreActualsByUser.get(userId) || { loans_amount: 0, deposits_amount: 0, calls: 0 }
      coreActualsByUser.set(userId, current)
      return current
    }

    const { data: loanActualsData, error: loanActualsError } = await supabase
      .from('loans')
      .select('loan_amount, start_date, customer_id, customers(assigned_manager_id)')
      .eq('status', 'ACTIVE')
      .gte('start_date', startDate)
      .lte('start_date', endDate)

    if (loanActualsError) {
      return internalServerError(loanActualsError, '[KPI API] Failed to load loan actuals')
    }

    ;(loanActualsData || []).forEach((loan: any) => {
      const managerId = loan.customers?.assigned_manager_id
      if (!managerId) return
      if (visibleManagerIds && !visibleManagerIds.has(managerId)) return
      const actuals = getCoreActuals(managerId)
      actuals.loans_amount += Number(loan.loan_amount || 0)
    })

    const { data: depositActualsData, error: depositActualsError } = await supabase
      .from('deposits')
      .select('amount, start_date, customer_id, customers(assigned_manager_id)')
      .eq('status', 'ACTIVE')
      .gte('start_date', startDate)
      .lte('start_date', endDate)

    if (depositActualsError) {
      return internalServerError(depositActualsError, '[KPI API] Failed to load deposit actuals')
    }

    ;(depositActualsData || []).forEach((deposit: any) => {
      const managerId = deposit.customers?.assigned_manager_id
      if (!managerId) return
      if (visibleManagerIds && !visibleManagerIds.has(managerId)) return
      const actuals = getCoreActuals(managerId)
      actuals.deposits_amount += Number(deposit.amount || 0)
    })

    const { data: callActualsData, error: callActualsError } = await supabase
      .from('interactions')
      .select('manager_id, type, interaction_date')
      .eq('type', 'CALL')
      .gte('interaction_date', startDate)
      .lte('interaction_date', endDate)

    if (callActualsError) {
      return internalServerError(callActualsError, '[KPI API] Failed to load call actuals')
    }

    ;(callActualsData || []).forEach((interaction: any) => {
      const managerId = interaction.manager_id
      if (!managerId) return
      if (visibleManagerIds && !visibleManagerIds.has(managerId)) return
      const actuals = getCoreActuals(managerId)
      actuals.calls += 1
    })

    const { data: productSalesData, error: productSalesError } = await supabase
      .from('cross_sell_records')
      .select('agent_id, product_id, result_value, sale_date, created_at, cross_sell_products(id, name, type)')
      .or(`and(sale_date.gte.${startDate},sale_date.lte.${endDate}),and(sale_date.is.null,created_at.gte.${startDate},created_at.lt.${dayjs(endDate).add(1, 'day').format('YYYY-MM-DD')})`)

    if (productSalesError) {
      return internalServerError(productSalesError, '[KPI API] Failed to load product sales')
    }

    const extraActualsByUser = new Map<string, Record<string, number>>()
    const addExtraActual = (userId: string, key: string, value: number) => {
      const current = extraActualsByUser.get(userId) || {}
      current[key] = Number(current[key] || 0) + value
      extraActualsByUser.set(userId, current)
    }

    ;(productSalesData || []).forEach((sale: any) => {
      if (!sale.agent_id) return
      if (visibleManagerIds && !visibleManagerIds.has(sale.agent_id)) return
      const categoryKey = productCategoryById.get(sale.product_id) || classifyKpiProduct(sale.cross_sell_products)
      addExtraActual(sale.agent_id, categoryKey, getProductMetricValue(sale, sale.cross_sell_products))
    })

    const mergedData = roleFilteredData.map((row: any) => {
      const target = targetsByUser.get(row.manager_id)
      const productTargets: Record<string, number> = { [OTHER_PRODUCTS_ID]: 0 }
      const categoryTargets: Record<string, number> = {}
      Object.entries(target || {}).forEach(([key, value]) => {
        if (key.startsWith('target_')) return
        const categoryKey = key === OTHER_PRODUCTS_ID ? OTHER_PRODUCTS_ID : productCategoryById.get(key) || OTHER_PRODUCTS_ID
        if (categoryKey === OTHER_PRODUCTS_ID) {
          productTargets[OTHER_PRODUCTS_ID] = Number(productTargets[OTHER_PRODUCTS_ID] || 0) + Number(value || 0)
        } else {
          categoryTargets[`target_${categoryKey}`] = Number(categoryTargets[`target_${categoryKey}`] || 0) + Number(value || 0)
        }
      })
      const extraActuals = extraActualsByUser.get(row.manager_id) || {}
      const productActuals = row.product_actuals || {}
      const getProductActualByCategory = (categoryKey: string) => {
        return Object.entries(productActuals).reduce((sum, [productId, value]) => {
          const productCategory = productId === OTHER_PRODUCTS_ID ? OTHER_PRODUCTS_ID : productCategoryById.get(productId) || OTHER_PRODUCTS_ID
          return productCategory === categoryKey ? sum + Number(value || 0) : sum
        }, 0)
      }
      const getActualValue = (actualKey: string) => {
        const legacyValue = Number(row?.[actualKey] || 0)
        if (legacyValue !== 0) return legacyValue
        const productActualValue = getProductActualByCategory(actualKey)
        if (productActualValue !== 0) return productActualValue
        return Number(extraActuals[actualKey] || 0)
      }
      const otherProductActual = getProductActualByCategory(OTHER_PRODUCTS_ID) || Number(extraActuals[OTHER_PRODUCTS_ID] || 0)

      return {
        ...row,
        ...getCoreActuals(row.manager_id),
        product_targets: productTargets,
        product_values: { [OTHER_PRODUCTS_ID]: otherProductActual },
        cif_moi: getActualValue('cif_moi'),
        bidv_direct: getActualValue('bidv_direct'),
        bh_nhan_tho: getActualValue('bh_nhan_tho'),
        bh_khoan_vay: getActualValue('bh_khoan_vay'),
        huy_dong_tang_rong: getActualValue('huy_dong_tang_rong'),
        du_no_ngan_han_tang_rong: getActualValue('du_no_ngan_han_tang_rong'),
        du_no_trung_han_tang_rong: getActualValue('du_no_trung_han_tang_rong'),
        cap_moi_hmtd: getActualValue('cap_moi_hmtd'),
        // Fallback backward compatibility
        target_loans_amount: target?.target_loans_amount || 0,
        target_deposits_amount: target?.target_deposits_amount || 0,
        target_calls: target?.target_calls || 0,
        target_cif_moi: Number(target?.target_cif_moi || 0) + Number(categoryTargets.target_cif_moi || 0),
        target_bidv_direct: Number(target?.target_bidv_direct || 0) + Number(categoryTargets.target_bidv_direct || 0),
        target_bh_nhan_tho: Number(target?.target_bh_nhan_tho || 0) + Number(categoryTargets.target_bh_nhan_tho || 0),
        target_bh_khoan_vay: Number(target?.target_bh_khoan_vay || 0) + Number(categoryTargets.target_bh_khoan_vay || 0),
        target_huy_dong_tang_rong: Number(target?.target_huy_dong_tang_rong || 0) + Number(categoryTargets.target_huy_dong_tang_rong || 0),
        target_du_no_ngan_han_tang_rong: Number(target?.target_du_no_ngan_han_tang_rong || 0) + Number(categoryTargets.target_du_no_ngan_han_tang_rong || 0),
        target_du_no_trung_han_tang_rong: Number(target?.target_du_no_trung_han_tang_rong || 0) + Number(categoryTargets.target_du_no_trung_han_tang_rong || 0),
        target_cap_moi_hmtd: Number(target?.target_cap_moi_hmtd || 0) + Number(categoryTargets.target_cap_moi_hmtd || 0),
      }
    }) || []

    const productsForSummary = [
      { id: OTHER_PRODUCTS_ID, label: 'Các sản phẩm khác', unit: 'SL', metric_type: 'QUANTITY' },
    ]

    return NextResponse.json({ data: mergedData, products: productsForSummary, startDate, endDate })
  } catch (error: unknown) {
    return internalServerError(
      error,
      '[KPI API] Unhandled report error',
      'Không thể tạo báo cáo KPI.'
    )
  }
}
