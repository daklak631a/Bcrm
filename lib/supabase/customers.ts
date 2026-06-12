import { getSupabase } from './client'
import {
  CurrentUserScope,
  DEFAULT_CACHE_TTL_MS,
  LONG_CACHE_TTL_MS,
  PageResult,
  cached,
  invalidateCache,
  isDepartmentRole,
  isGlobalRole,
  normalizeSearchTerm,
  pageRange,
} from './cache'
import { logAudit } from './audit'

export type CustomerPageInput = {
  page?: number
  pageSize?: number
  search?: string
  user?: CurrentUserScope | null
}

export async function fetchCustomers(): Promise<any> {
  return cached('customers:active', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('customers')
      .select('*, profiles:assigned_manager_id(id, full_name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  })
}

async function getScopedManagerIds(user?: CurrentUserScope | null) {
  if (!user?.id) return []
  if (!isDepartmentRole(user.role)) return []

  const departmentId = user.department_id || user.branchId
  if (!departmentId) return [user.id]

  return cached(`profiles:ids:${departmentId}`, async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('department_id', departmentId)
      .eq('is_active', true)

    if (error) throw error
    return (data || []).map((profile: any) => profile.id).filter(Boolean)
  }, LONG_CACHE_TTL_MS)
}

export async function fetchCustomersPage(input: CustomerPageInput = {}): Promise<PageResult<any>> {
  const { page, pageSize, from, to } = pageRange(input.page, input.pageSize, 100)
  const search = normalizeSearchTerm(input.search)
  const user = input.user || null
  const scopedManagerIds = await getScopedManagerIds(user)
  const cacheKey = [
    'customers:page',
    page,
    pageSize,
    search,
    user?.role || 'anonymous',
    user?.id || 'no-user',
    user?.department_id || user?.branchId || 'no-department',
    scopedManagerIds.length,
  ].join(':')

  return cached(cacheKey, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('customers')
      .select('*, profiles:assigned_manager_id(id, full_name)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (isDepartmentRole(user?.role)) {
      const departmentId = user.department_id || user.branchId
      if (scopedManagerIds.length === 0 && !departmentId) {
        return { data: [], total: 0, page, pageSize }
      }
      if (departmentId && scopedManagerIds.length > 0) {
        const quotedDept = `"${String(departmentId).replace(/"/g, '""')}"`
        query = query.or(`department_id.eq.${quotedDept},assigned_manager_id.in.(${scopedManagerIds.join(',')})`)
      } else if (departmentId) {
        query = query.eq('department_id', departmentId)
      } else {
        query = query.in('assigned_manager_id', scopedManagerIds)
      }
    } else if (!isGlobalRole(user?.role) && user?.id) {
      query = query.eq('assigned_manager_id', user.id)
    }

    if (search) {
      query = query.or([
        `full_name.ilike.%${search}%`,
        `business_name.ilike.%${search}%`,
        `phone.ilike.%${search}%`,
        `email.ilike.%${search}%`,
        `cif_code.ilike.%${search}%`,
        `tax_code.ilike.%${search}%`,
      ].join(','))
    }

    const { data, error, count } = await query
    if (error) throw error

    return { data: data || [], total: count || 0, page, pageSize }
  }, DEFAULT_CACHE_TTL_MS)
}

export async function fetchCustomerById(id: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .select('*, profiles:assigned_manager_id(id, full_name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCustomer(customer: {
  customer_type?: string
  business_name?: string
  tax_code?: string
  representative_name?: string
  full_name: string
  phone?: string
  email?: string
  address?: string
  note?: string
  assigned_manager_id: string
  department_id?: string | null
  cif_code?: string | null
  customer_segment?: string | null

  // Financial indicators
  loan_short_term?: number
  loan_mid_long_term?: number
  hdv_dau_ky?: number
  hdv_phat_sinh?: number
  hdv_tang_rong?: number
  limit_approval_count?: number

  // Cross-sell products
  cif_moi?: boolean
  smart_banking?: boolean
  bao_hiem_nhan_tho?: boolean
  bao_hiem_khoan_vay?: boolean
  the_tin_dung?: boolean
  chuyen_tien_ngoai?: boolean
  merchant_qr?: boolean
  sp_khac?: string
}): Promise<any> {
  const supabase = getSupabase()

  // Normalization logic
  let { customer_type, business_name, full_name, representative_name, phone } = customer

  // 1. Phone Normalization (strip all non-digits)
  if (phone) {
    phone = phone.replace(/\D/g, '')
  }

  // 2. Representative name defaulting for Enterprise: "tên doanh nghiệp là được"
  if (customer_type === 'ENTERPRISE' && business_name) {
    representative_name = business_name
    full_name = business_name
  }

  const customerToInsert = {
    ...customer,
    phone,
    full_name,
    representative_name
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(customerToInsert)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'CUSTOMER',
    entityId: data.id,
    afterValue: customerToInsert
  })

  invalidateCache('customers:', 'sales_records:', 'dashboard:')
  return data
}

export async function updateCustomer(id: string, updates: Partial<{
  customer_type: string
  business_name: string
  tax_code: string
  representative_name: string
  full_name: string
  phone: string
  email: string
  address: string
  note: string
  assigned_manager_id: string
  cif_code: string | null
  customer_segment: string | null

  // Financial indicators
  loan_short_term: number
  loan_mid_long_term: number
  hdv_dau_ky: number
  hdv_phat_sinh: number
  hdv_tang_rong: number
  limit_approval_count: number

  // Cross-sell products
  cif_moi: boolean
  smart_banking: boolean
  bao_hiem_nhan_tho: boolean
  bao_hiem_khoan_vay: boolean
  the_tin_dung: boolean
  chuyen_tien_ngoai: boolean
  merchant_qr: boolean
  sp_khac: string
}>): Promise<any> {
  const supabase = getSupabase()

  const customerToUpdate = { ...updates }

  // 1. Phone Normalization
  if (customerToUpdate.phone) {
    customerToUpdate.phone = customerToUpdate.phone.replace(/\D/g, '')
  }

  // 2. Business representative name default
  if (customerToUpdate.customer_type === 'ENTERPRISE' && customerToUpdate.business_name) {
    customerToUpdate.representative_name = customerToUpdate.business_name
    customerToUpdate.full_name = customerToUpdate.business_name
  }

  const { data, error } = await supabase
    .from('customers')
    .update({ ...customerToUpdate, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'UPDATE',
    entityType: 'CUSTOMER',
    entityId: id,
    afterValue: customerToUpdate
  })

  invalidateCache('customers:', 'sales_records:', 'loans:', 'deposits:', 'interactions:', 'product_sales:', 'dashboard:')
  return data
}
