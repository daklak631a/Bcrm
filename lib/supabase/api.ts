import { getSupabase } from './client'
import { getProductMetricDefinition, getProductMetricValue } from '@/lib/product-metrics'
import { Customer, ManagerTransferRequest, Plan, PlanAssignment, ProductMetricType, SalesRecord } from '@/types/models'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

// ==========================================
// UTILITY HELPERS
// ==========================================

const DEFAULT_CACHE_TTL_MS = 45_000
const LONG_CACHE_TTL_MS = 5 * 60_000

type CacheEntry<T> = {
  expiresAt: number
  value?: T
  promise?: Promise<T>
}

export type PageResult<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type CurrentUserScope = {
  id?: string | null
  role?: string | null
  department_id?: string | null
  branchId?: string | null
}

export type CustomerPageInput = {
  page?: number
  pageSize?: number
  search?: string
  user?: CurrentUserScope | null
}

export type ProfilePageInput = {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  departmentId?: string | null
  includeInactive?: boolean
  user?: CurrentUserScope | null
}

export type AllowedEmailPageInput = {
  page?: number
  pageSize?: number
  search?: string
  departmentId?: string | null
  includeInactive?: boolean
  user?: CurrentUserScope | null
}

const apiCache = new Map<string, CacheEntry<any>>()

function cached<T>(key: string, loader: () => Promise<T>, ttlMs = DEFAULT_CACHE_TTL_MS): Promise<T> {
  const now = Date.now()
  const existing = apiCache.get(key) as CacheEntry<T> | undefined

  if (existing?.value !== undefined && existing.expiresAt > now) {
    return Promise.resolve(existing.value)
  }

  if (existing?.promise && existing.expiresAt > now) {
    return existing.promise
  }

  const promise = loader()
    .then((value) => {
      apiCache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .catch((error) => {
      apiCache.delete(key)
      throw error
    })

  apiCache.set(key, { promise, expiresAt: now + ttlMs })
  return promise
}

export function invalidateApiCache(...prefixes: string[]) {
  for (const key of Array.from(apiCache.keys())) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      apiCache.delete(key)
    }
  }
}

const invalidateCache = invalidateApiCache

function normalizePage(page?: number) {
  return Math.max(1, Number(page) || 1)
}

function normalizePageSize(pageSize?: number, maxPageSize = 100) {
  return Math.min(maxPageSize, Math.max(1, Number(pageSize) || 20))
}

function pageRange(page?: number, pageSize?: number, maxPageSize = 100) {
  const normalizedPage = normalizePage(page)
  const normalizedPageSize = normalizePageSize(pageSize, maxPageSize)
  const from = (normalizedPage - 1) * normalizedPageSize
  const to = from + normalizedPageSize - 1

  return { page: normalizedPage, pageSize: normalizedPageSize, from, to }
}

function escapePostgrestLike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`)
}

function normalizeSearchTerm(search?: string) {
  const trimmed = (search || '').trim()
  return trimmed.length >= 2 ? escapePostgrestLike(trimmed) : ''
}

function isGlobalRole(role?: string | null) {
  return role === 'ADMIN_LEVEL_0' || role === 'ADMIN_LEVEL_1' || role === 'ADVISOR'
}

function isDepartmentRole(role?: string | null) {
  return role === 'ADMIN_LEVEL_2' || role === 'ADMIN_LEVEL_3'
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

export function getCustomerFullName(customer: any): string {
  if (!customer) return '—'
  if (customer.customer_type === 'ENTERPRISE' && customer.business_name) {
    return customer.business_name
  }
  return customer.full_name || '—'
}

function extractDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined
  const matched = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (matched) return matched[1]
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString().slice(0, 10)
}

function toSortableTimestamp(value?: string | null): number {
  if (!value) return 0
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime()
  const fallbackDate = extractDateOnly(value)
  if (!fallbackDate) return 0
  const fallbackParsed = new Date(fallbackDate)
  return Number.isNaN(fallbackParsed.getTime()) ? 0 : fallbackParsed.getTime()
}

function getSalesSourceHref(_sourceType: SalesRecord['source_type'], customerId?: string | null) {
  const basePath = '/sales'

  return customerId ? `${basePath}?customerId=${customerId}` : basePath
}

function mapLoanToSalesRecord(loan: any): SalesRecord {
  return {
    id: `loan:${loan.id}`,
    source_id: loan.id,
    source_type: 'LOAN',
    customer_id: loan.customer_id ?? loan.customers?.id ?? null,
    customer_name: loan.customers ? getCustomerFullName(loan.customers) : '—',
    agent_id: loan.customers?.assigned_manager_id || null,
    sale_date: loan.start_date,
    status: loan.status || 'ACTIVE',
    title: loan.loan_type || 'Khoản vay',
    category: 'Khoản vay',
    amount: Number(loan.loan_amount || 0),
    quantity: 1,
    metric_value: Number(loan.loan_amount || 0),
    unit_label: 'VNĐ',
    metric_type: 'AMOUNT',
    note: loan.disbursement_purpose || loan.business_sector || null,
    account_number: loan.account_number || null,
    source_href: getSalesSourceHref('LOAN', loan.customer_id ?? loan.customers?.id),
    created_at: loan.created_at,
    updated_at: loan.updated_at,
    raw: loan,
  }
}

function mapDepositToSalesRecord(deposit: any): SalesRecord {
  return {
    id: `deposit:${deposit.id}`,
    source_id: deposit.id,
    source_type: 'DEPOSIT',
    customer_id: deposit.customer_id ?? deposit.customers?.id ?? null,
    customer_name: deposit.customers ? getCustomerFullName(deposit.customers) : '—',
    agent_id: deposit.customers?.assigned_manager_id || null,
    sale_date: deposit.start_date,
    status: deposit.status || 'ACTIVE',
    title: deposit.deposit_type || 'Tiền gửi',
    category: 'Tiền gửi',
    amount: Number(deposit.amount || 0),
    quantity: 1,
    metric_value: Number(deposit.amount || 0),
    unit_label: 'VNĐ',
    metric_type: 'AMOUNT',
    note: deposit.maturity_date ? `Đáo hạn: ${deposit.maturity_date}` : null,
    account_number: deposit.account_number || null,
    source_href: getSalesSourceHref('DEPOSIT', deposit.customer_id ?? deposit.customers?.id),
    created_at: deposit.created_at,
    updated_at: deposit.updated_at,
    raw: deposit,
  }
}

function mapProductSaleToSalesRecord(sale: any): SalesRecord {
  const metricDefinition = getProductMetricDefinition(sale.cross_sell_products || sale)
  const metricValue = getProductMetricValue({
    ...sale,
    metric_type: metricDefinition.metricType,
    unit_label: metricDefinition.unitLabel,
  }, sale.cross_sell_products || sale)

  const isUnallocatedBatch = sale.is_batch_entry === true && !sale.is_allocated
  const customerName = isUnallocatedBatch
    ? 'Nhập lô cuối ngày'
    : (sale.customers ? getCustomerFullName(sale.customers) : '—')

  return {
    id: `product:${sale.id}`,
    source_id: sale.id,
    source_type: 'PRODUCT',
    customer_id: sale.customer_id ?? sale.customers?.id ?? null,
    customer_name: customerName,
    agent_id: sale.agent_id || sale.profiles?.id || null,
    sale_date: extractDateOnly(sale.sale_date) || sale.sale_date,
    status: sale.status || 'PENDING',
    title: sale.cross_sell_products?.name || 'Sản phẩm khác',
    category: sale.cross_sell_products?.type || 'Sản phẩm',
    amount: metricDefinition.metricType === 'AMOUNT' ? metricValue : 0,
    quantity: metricDefinition.metricType === 'QUANTITY' ? metricValue : 0,
    metric_value: metricValue,
    unit_label: metricDefinition.unitLabel,
    metric_type: metricDefinition.metricType,
    note: isUnallocatedBatch ? 'Chưa phân bổ theo KH' : (sale.note || null),
    product_id: sale.product_id || sale.cross_sell_products?.id || null,
    source_href: getSalesSourceHref('PRODUCT', sale.customer_id ?? sale.customers?.id),
    created_at: sale.created_at,
    updated_at: sale.updated_at,
    raw: sale,
  }
}

function sortSalesRecords(records: SalesRecord[]) {
  return [...records].sort((a, b) => {
    const bTime = toSortableTimestamp(b.sale_date || b.created_at)
    const aTime = toSortableTimestamp(a.sale_date || a.created_at)
    return bTime - aTime
  })
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
export type EntityType = 'CUSTOMER' | 'LOAN' | 'DEPOSIT' | 'INTERACTION' | 'PRODUCT' | 'CROSS_SALE' | 'AUTH' | 'USER' | 'PLAN'

export interface AuditLogPayload {
  action: AuditAction
  entityType: EntityType
  entityId: string
  beforeValue?: any
  afterValue?: any
}

export async function logAudit(payload: AuditLogPayload) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: payload.entityId,
        before_value: payload.beforeValue,
        after_value: payload.afterValue
      })
      
    if (error) {
      logger.error(
        '[Supabase API] Failed to write audit log',
        { error: getErrorMessage(error) },
        { production: true }
      )
    } else {
      // Create notification for Admins
      // Determine message
      let msg = ''
      switch (payload.entityType) {
        case 'CUSTOMER': msg = 'khách hàng'; break;
        case 'LOAN': msg = 'khoản vay'; break;
        case 'DEPOSIT': msg = 'huy động'; break;
        case 'INTERACTION': msg = 'tương tác'; break;
        case 'PLAN': msg = 'chỉ tiêu KPI'; break;
        default: msg = 'dữ liệu';
      }
      
      let actionMsg = ''
      switch (payload.action) {
        case 'CREATE': actionMsg = 'Thêm mới'; break;
        case 'UPDATE': actionMsg = 'Cập nhật'; break;
        case 'DELETE': actionMsg = 'Xóa'; break;
      }

      if (actionMsg && msg) {
        // Fetch admins
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'])
        
        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.id,
            title: 'Hệ thống',
            message: `${user.email} vừa ${actionMsg.toLowerCase()} ${msg} mới.`,
            type: 'SYSTEM',
            link_url: '/audit-logs'
          }))
          
          await supabase.from('notifications').insert(notifications)
        }
      }
    }
  } catch (error) {
    logger.error(
      '[Supabase API] Audit log exception',
      { error: getErrorMessage(error) },
      { production: true }
    )
  }
}

export async function fetchAuditLogs(limit = 100): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles:user_id(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// ==========================================
// PROFILES
// ==========================================

export async function fetchProfiles(): Promise<any> {
  return cached('profiles:active', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,department_id,is_active,full_name_slug,short_name,created_at,updated_at')
      .eq('is_active', true)
      .order('full_name')
    if (error) throw error
    return data || []
  }, LONG_CACHE_TTL_MS)
}

export async function fetchProfilesPage(input: ProfilePageInput = {}): Promise<PageResult<any>> {
  const { page, pageSize, from, to } = pageRange(input.page, input.pageSize, 100)
  const search = normalizeSearchTerm(input.search)
  const cacheKey = [
    'profiles:page',
    page,
    pageSize,
    search,
    input.role || 'all',
    input.departmentId || 'all',
    input.includeInactive ? 'all-status' : 'active',
    input.user?.role || 'anonymous',
    input.user?.department_id || input.user?.branchId || 'all',
  ].join(':')

  return cached(cacheKey, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('profiles')
      .select('id,email,full_name,role,department_id,is_active,full_name_slug,short_name,created_at,updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!input.includeInactive) {
      query = query.eq('is_active', true)
    }

    if (input.role) {
      query = query.eq('role', input.role)
    }

    const scopedDepartment = input.departmentId || (
      isDepartmentRole(input.user?.role) ? input.user?.department_id || input.user?.branchId || null : null
    )
    if (scopedDepartment) {
      query = query.eq('department_id', scopedDepartment)
    }

    if (!isGlobalRole(input.user?.role) && !isDepartmentRole(input.user?.role) && input.user?.id) {
      query = query.eq('id', input.user.id)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,department_id.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { data: data || [], total: count || 0, page, pageSize }
  }, DEFAULT_CACHE_TTL_MS)
}

export async function fetchAllowedEmailsPage(input: AllowedEmailPageInput = {}): Promise<PageResult<any>> {
  const { page, pageSize, from, to } = pageRange(input.page, input.pageSize, 100)
  const search = normalizeSearchTerm(input.search)
  const scopedDepartment = input.departmentId || (
    isDepartmentRole(input.user?.role) ? input.user?.department_id || input.user?.branchId || null : null
  )
  const cacheKey = [
    'allowed_emails:page',
    page,
    pageSize,
    search,
    scopedDepartment || 'all',
    input.includeInactive ? 'all-status' : 'active',
    input.user?.role || 'anonymous',
  ].join(':')

  return cached(cacheKey, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('allowed_emails')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!input.includeInactive) {
      query = query.eq('is_active', true)
    }

    if (scopedDepartment) {
      query = query.eq('department_id', scopedDepartment)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,department_id.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { data: data || [], total: count || 0, page, pageSize }
  }, DEFAULT_CACHE_TTL_MS)
}

export async function fetchProfileById(id: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchPlans(): Promise<any> {
  return cached('plans:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('target_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Plan[]
  })
}

export async function createPlan(plan: {
  title: string
  description?: string | null
  target_date: string
}): Promise<any> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const payload = {
    ...plan,
    created_by: user?.id || null,
  }
  const { data, error } = await supabase
    .from('plans')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'PLAN',
    entityId: data.id,
    afterValue: payload,
  })

  invalidateCache('plans:', 'plan_assignments:', 'dashboard:')
  return data as Plan
}

export async function fetchPlanAssignments(planId?: string): Promise<any> {
  return cached(`plan_assignments:${planId || 'all'}`, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('plan_assignments')
      .select('*, profiles:user_id(id, full_name, email, role, department_id), plans:plan_id(id, title, target_date)')
      .order('updated_at', { ascending: false })

    if (planId) {
      query = query.eq('plan_id', planId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as PlanAssignment[]
  })
}

export async function upsertPlanAssignment(assignment: {
  id?: string
  plan_id: string
  user_id: string
  target_loans_amount: number
  target_deposits_amount: number
  target_calls: number
  target_cif_moi?: number
  target_bidv_direct?: number
  target_bh_nhan_tho?: number
  target_bh_khoan_vay?: number
  target_huy_dong_tang_rong?: number
  target_du_no_ngan_han_tang_rong?: number
  target_du_no_trung_han_tang_rong?: number
  target_cap_moi_hmtd?: number
  product_targets?: Record<string, number>
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...assignment,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('plan_assignments')
    .upsert(payload, { onConflict: 'plan_id,user_id' })
    .select('*, profiles:user_id(*), plans:plan_id(*)')
    .single()

  if (error) {
    const productTargetsMissing = /product_targets|schema cache/i.test(error.message || '')
    if (!productTargetsMissing) throw error

    const { product_targets: _productTargets, ...compatiblePayload } = payload
    const { data: compatibleData, error: compatibleError } = await supabase
      .from('plan_assignments')
      .upsert(compatiblePayload, { onConflict: 'plan_id,user_id' })
      .select('*, profiles:user_id(*), plans:plan_id(*)')
      .single()

    if (compatibleError) throw compatibleError

    await logAudit({
      action: 'UPDATE',
      entityType: 'PLAN',
      entityId: compatibleData.id || `${assignment.plan_id}:${assignment.user_id}`,
      afterValue: compatiblePayload,
    })

    invalidateCache('plan_assignments:', 'plans:', 'dashboard:')
    return compatibleData as PlanAssignment
  }

  await logAudit({
    action: 'UPDATE',
    entityType: 'PLAN',
    entityId: data.id || `${assignment.plan_id}:${assignment.user_id}`,
    afterValue: payload,
  })

  invalidateCache('plan_assignments:', 'plans:', 'dashboard:')
  return data as PlanAssignment
}

// ==========================================
// CUSTOMERS
// ==========================================

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
      if (scopedManagerIds.length === 0) {
        return { data: [], total: 0, page, pageSize }
      }
      query = query.in('assigned_manager_id', scopedManagerIds)
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

// ==========================================
// LOANS
// ==========================================

export async function fetchLoans(): Promise<any> {
  return cached('loans:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('loans')
      .select('*, customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  })
}

export async function fetchLoansByCustomer(customerId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .select('*, customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createLoan(loan: {
  customer_id: string
  account_number: string
  loan_type?: string
  loan_amount: number
  balance: number
  start_date: string
  due_date: string
  status?: string
  business_sector?: string
  disbursement_purpose?: string
  collateral_assets?: string
  credit_limit?: number
  loan_method?: string
  term_type?: string
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...loan,
    start_date: extractDateOnly(loan.start_date) || loan.start_date,
    due_date: extractDateOnly(loan.due_date) || loan.due_date,
  }
  const { data, error } = await supabase
    .from('loans')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'LOAN',
    entityId: data.id,
    afterValue: payload
  })

  invalidateCache('loans:', 'sales_records:', 'dashboard:')
  return data
}

export async function updateLoan(id: string, updates: Record<string, any>): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'UPDATE',
    entityType: 'LOAN',
    entityId: id,
    afterValue: updates
  })

  invalidateCache('loans:', 'sales_records:', 'dashboard:')
  return data
}

// ==========================================
// DEPOSITS
// ==========================================

export async function fetchDeposits(): Promise<any> {
  return cached('deposits:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('deposits')
      .select('*, customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  })
}

export async function fetchDepositsByCustomer(customerId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deposits')
    .select('*, customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createDeposit(deposit: {
  customer_id: string
  account_number: string
  deposit_type?: string
  amount: number
  start_date: string
  maturity_date: string
  status?: string
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...deposit,
    start_date: extractDateOnly(deposit.start_date) || deposit.start_date,
    maturity_date: extractDateOnly(deposit.maturity_date) || deposit.maturity_date,
  }
  const { data, error } = await supabase
    .from('deposits')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'DEPOSIT',
    entityId: data.id,
    afterValue: payload
  })

  invalidateCache('deposits:', 'sales_records:', 'dashboard:')
  return data
}

export async function updateDeposit(id: string, updates: Record<string, any>): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deposits')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'UPDATE',
    entityType: 'DEPOSIT',
    entityId: id,
    afterValue: updates
  })

  invalidateCache('deposits:', 'sales_records:', 'dashboard:')
  return data
}

// ==========================================
// INTERACTIONS
// ==========================================

export async function fetchInteractions(): Promise<any> {
  return cached('interactions:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('interactions')
      .select('*, customers(id, full_name), profiles:manager_id(id, full_name)')
      .order('interaction_date', { ascending: false })
    if (error) throw error
    return data || []
  })
}

export async function fetchInteractionsByCustomer(customerId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('interactions')
    .select('*, profiles:manager_id(id, full_name)')
    .eq('customer_id', customerId)
    .order('interaction_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createInteraction(interaction: {
  customer_id: string
  manager_id: string
  type: string
  purpose: string
  result?: string
  notes?: string
  interaction_date?: string
  follow_up_date?: string
  next_action?: string
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...interaction,
    interaction_date: extractDateOnly(interaction.interaction_date) || undefined,
    follow_up_date: extractDateOnly(interaction.follow_up_date) || undefined,
  }
  const { data, error } = await supabase
    .from('interactions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'INTERACTION',
    entityId: data.id,
    afterValue: payload
  })

  invalidateCache('interactions:', 'dashboard:')
  return data
}

export async function updateInteraction(id: string, updates: Record<string, any>): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('interactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'UPDATE',
    entityType: 'INTERACTION',
    entityId: id,
    afterValue: updates
  })

  invalidateCache('interactions:', 'dashboard:')
  return data
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export async function fetchNotifications(userId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function createNotification(notification: {
  user_id: string
  title: string
  message: string
  type?: string
  link_url?: string
}): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markNotificationRead(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

// ==========================================
// CROSS-SELL PRODUCTS
// ==========================================

export async function fetchProducts(): Promise<any> {
  return cached('products:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('cross_sell_products')
      .select('*')
      .order('name')
    if (error) throw error
    return data || []
  }, LONG_CACHE_TTL_MS)
}

export async function createProduct(product: {
  name: string
  type: string
  description?: string
  target?: number
  metric_type?: ProductMetricType
  unit_label?: string
}): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_products')
    .insert(product)
    .select()
    .single()
  if (error) throw error
  invalidateCache('products:', 'product_sales:', 'sales_records:', 'dashboard:')
  return data
}

export async function deleteProduct(id: string): Promise<any> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('cross_sell_products')
    .delete()
    .eq('id', id)
  if (error) throw error
  invalidateCache('products:', 'product_sales:', 'sales_records:', 'dashboard:')
}

// ==========================================
// CROSS-SELL RECORDS (SALES)
// ==========================================

export async function fetchProductSales(): Promise<any> {
  return cached('product_sales:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('cross_sell_records')
      .select('*, cross_sell_products(id, name, type, metric_type, unit_label, target), customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id), profiles:agent_id(id, full_name)')
      .order('sale_date', { ascending: false })
    if (error) throw error
    return data || []
  })
}

export async function fetchProductSalesByAgentId(agentId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .select('*, cross_sell_products(id, name, type, metric_type, unit_label, target), customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id), profiles:agent_id(id, full_name)')
    .eq('agent_id', agentId)
    .order('sale_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchProductSalesByAgentIds(agentIds: string[]): Promise<any> {
  if (agentIds.length === 0) return []
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .select('*, cross_sell_products(id, name, type, metric_type, unit_label, target), customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id), profiles:agent_id(id, full_name)')
    .in('agent_id', agentIds)
    .order('sale_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchProductSalesByCustomer(customerId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .select('*, cross_sell_products(id, name, type, metric_type, unit_label, target), customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id), profiles:agent_id(id, full_name)')
    .eq('customer_id', customerId)
    .order('sale_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchBatchSales(agentId?: string): Promise<any> {
  return cached(`batch_sales:${agentId || 'all'}`, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('cross_sell_records')
      .select('*, cross_sell_products(id, name, type, metric_type, unit_label, target), profiles:agent_id(id, full_name)')
      .eq('is_batch_entry', true)
      .eq('is_allocated', false)
      .order('sale_date', { ascending: false })
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }
    const { data, error } = await query
    if (error) throw error
    return data || []
  })
}

export async function createBatchSale(sale: {
  product_id: string
  agent_id: string
  status?: string
  sale_date?: string
  result_value?: number
  batch_note?: string
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    product_id: sale.product_id,
    agent_id: sale.agent_id,
    customer_id: null,
    status: sale.status || 'COMPLETED',
    sale_date: extractDateOnly(sale.sale_date) || new Date().toISOString().slice(0, 10),
    result_value: Number(sale.result_value || 0),
    batch_note: sale.batch_note || null,
    is_batch_entry: true,
    is_allocated: false,
  }
  const { data, error } = await supabase
    .from('cross_sell_records')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  invalidateCache('product_sales:', 'sales_records:', 'dashboard:')
  return data
}

export async function allocateBatchSale(recordId: string, customerId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .update({
      customer_id: customerId,
      is_allocated: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select()
    .single()
  if (error) throw error
  invalidateCache('product_sales:', 'sales_records:', 'batch_sales:', 'dashboard:')
  return data
}

export async function createProductSale(sale: {
  product_id: string
  customer_id?: string
  agent_id: string
  status?: string
  sale_date?: string
  note?: string
  result_value?: number
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...sale,
    result_value: Number(sale.result_value || 0),
    sale_date: extractDateOnly(sale.sale_date) || extractDateOnly(new Date().toISOString()) || new Date().toISOString().slice(0, 10),
  }
  const { data, error } = await supabase
    .from('cross_sell_records')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  await logAudit({
    action: 'CREATE',
    entityType: 'CROSS_SALE',
    entityId: data.id,
    afterValue: payload,
  })
  invalidateCache('product_sales:', 'sales_records:', 'dashboard:')
  return data
}

export async function updateProductSale(id: string, updates: Record<string, any>): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  invalidateCache('product_sales:', 'sales_records:', 'batch_sales:', 'dashboard:')
  return data
}

export async function fetchSalesRecords(): Promise<any> {
  return cached('sales_records:all', async () => {
    const [loans, deposits, productSales] = await Promise.all([
      fetchLoans(),
      fetchDeposits(),
      fetchProductSales(),
    ])

    return sortSalesRecords([
      ...loans.map(mapLoanToSalesRecord),
      ...deposits.map(mapDepositToSalesRecord),
      ...productSales.map(mapProductSaleToSalesRecord),
    ])
  })
}

export async function fetchSalesRecordsByAgent(agentId: string): Promise<any> {
  const supabase = getSupabase()
  const [productSales, loansData, depositsData] = await Promise.all([
    fetchProductSalesByAgentId(agentId),
    supabase
      .from('loans')
      .select('*, customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id)')
      .eq('customers.assigned_manager_id', agentId)
      .order('created_at', { ascending: false }),
    supabase
      .from('deposits')
      .select('*, customers(id, full_name, customer_type, business_name, representative_name, assigned_manager_id)')
      .eq('customers.assigned_manager_id', agentId)
      .order('created_at', { ascending: false }),
  ])
  const loans = (loansData.data || []).filter((l: any) => l.customers?.assigned_manager_id === agentId)
  const deposits = (depositsData.data || []).filter((d: any) => d.customers?.assigned_manager_id === agentId)
  return sortSalesRecords([
    ...loans.map(mapLoanToSalesRecord),
    ...deposits.map(mapDepositToSalesRecord),
    ...productSales.map(mapProductSaleToSalesRecord),
  ])
}

export async function fetchSalesRecordsByAgents(agentIds: string[]): Promise<any> {
  if (agentIds.length === 0) return []
  const [loans, deposits, productSales] = await Promise.all([
    fetchLoans(),
    fetchDeposits(),
    fetchProductSalesByAgentIds(agentIds),
  ])
  const filteredLoans = loans.filter((l: any) => agentIds.includes(l.customers?.assigned_manager_id))
  const filteredDeposits = deposits.filter((d: any) => agentIds.includes(d.customers?.assigned_manager_id))
  return sortSalesRecords([
    ...filteredLoans.map(mapLoanToSalesRecord),
    ...filteredDeposits.map(mapDepositToSalesRecord),
    ...productSales.map(mapProductSaleToSalesRecord),
  ])
}

export async function fetchSalesRecordsByCustomer(customerId: string): Promise<any> {
  const [loans, deposits, productSales] = await Promise.all([
    fetchLoansByCustomer(customerId),
    fetchDepositsByCustomer(customerId),
    fetchProductSalesByCustomer(customerId),
  ])

  return sortSalesRecords([
    ...loans.map(mapLoanToSalesRecord),
    ...deposits.map(mapDepositToSalesRecord),
    ...productSales.map(mapProductSaleToSalesRecord),
  ])
}

export async function createSalesRecord(record: {
  source_type: SalesRecord['source_type']
  customer_id: string
  agent_id: string
  title?: string
  amount?: number
  result_value?: number
  account_number?: string
  sale_date?: string
  due_date?: string
  maturity_date?: string
  status?: string
  note?: string
  product_id?: string
  business_sector?: string
  disbursement_purpose?: string
  collateral_assets?: string
  credit_limit?: number
  loan_method?: string
  term_type?: string
}): Promise<any> {
  if (record.source_type === 'LOAN') {
    const normalizedSaleDate = extractDateOnly(record.sale_date) || new Date().toISOString().slice(0, 10)
    const normalizedLoanTitle = (record.title || '').toLowerCase()
    const inferredTermType = record.term_type || (
      normalizedLoanTitle.includes('trung dài hạn') || normalizedLoanTitle.includes('trung/dài hạn') || normalizedLoanTitle.includes('đầu tư dự án')
        ? 'MEDIUM_LONG_TERM'
        : 'SHORT_TERM'
    )
    return createLoan({
      customer_id: record.customer_id,
      account_number: record.account_number || `LN${Date.now()}`,
      loan_type: record.title || 'Khoản vay',
      loan_amount: Number(record.amount || 0),
      balance: Number(record.amount || 0),
      start_date: normalizedSaleDate,
      due_date: extractDateOnly(record.due_date) || normalizedSaleDate,
      status: record.status || 'ACTIVE',
      business_sector: record.business_sector,
      disbursement_purpose: record.disbursement_purpose,
      collateral_assets: record.collateral_assets,
      credit_limit: record.credit_limit,
      loan_method: record.loan_method,
      term_type: inferredTermType,
    })
  }

  if (record.source_type === 'DEPOSIT') {
    const normalizedSaleDate = extractDateOnly(record.sale_date) || new Date().toISOString().slice(0, 10)
    return createDeposit({
      customer_id: record.customer_id,
      account_number: record.account_number || `DP${Date.now()}`,
      deposit_type: record.title || 'Tiền gửi',
      amount: Number(record.amount || 0),
      start_date: normalizedSaleDate,
      maturity_date: extractDateOnly(record.maturity_date) || normalizedSaleDate,
      status: record.status || 'ACTIVE',
    })
  }

  if (!record.product_id) {
    throw new Error('Vui lòng chọn sản phẩm')
  }

  return createProductSale({
    product_id: record.product_id,
    customer_id: record.customer_id,
    agent_id: record.agent_id,
    status: record.status || 'COMPLETED',
    sale_date: extractDateOnly(record.sale_date) || new Date().toISOString().slice(0, 10),
    note: record.note,
    result_value: Number(record.result_value || 0),
  })
}

// ==========================================
// ALLOWED EMAILS (Team management)
// ==========================================

export async function fetchAllowedEmails(): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createAllowedEmail(entry: {
  email: string
  full_name: string
  role?: string
  department_id?: string
  is_active?: boolean
}): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('allowed_emails')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAllowedEmail(id: string, updates: Record<string, any>): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('allowed_emails')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAllowedEmail(id: string): Promise<any> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('allowed_emails')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ==========================================
// SUPPORT REQUESTS
// ==========================================

export async function fetchSupportRequests(): Promise<any> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/support/requests', {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  })
  const payload = await response.json()
  if (!response.ok) {
    logger.error(
      '[Supabase API] Failed to fetch support requests',
      { error: getErrorMessage(payload.error) },
      { production: true }
    )
    return []
  }
  return payload.data || []
}

export async function createSupportRequest(request: { item_id: string, item_type: string, support_admin_id: string, scheduled_date: string, requester_id?: string }): Promise<any> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/support/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(request),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Không thể tạo yêu cầu hỗ trợ.')
  return payload.data
}

export async function updateSupportRequestStatus(id: string, status: string): Promise<any> {
  const supabase = getSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/support/requests', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ id, status }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Không thể cập nhật yêu cầu hỗ trợ.')
  return payload.data
}

// ==========================================
// MANAGER TRANSFER REQUESTS
// ==========================================

export async function createTransferRequest(
  customerId: string,
  targetManagerId: string,
  reason: string
): Promise<any> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const transferRequest = {
    customer_id: customerId,
    requester_id: user.id,
    target_manager_id: targetManagerId,
    status: 'PENDING' as const,
    reason
  }

  const { data, error } = await supabase
    .from('manager_transfer_requests')
    .insert(transferRequest)
    .select()
    .single()

  if (error) throw error

  // Create notification for target manager and admins
  const { data: customer } = await supabase
    .from('customers')
    .select('full_name')
    .eq('id', customerId)
    .single()

  const customerName = customer ? customer.full_name : 'khách hàng'

  // Admin and Target notifications
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'])

  const notifications = [
    {
      user_id: targetManagerId,
      title: 'Đề xuất nhận bàn giao khách hàng',
      message: `Bạn được đề xuất làm chuyên viên quản lý cho khách hàng ${customerName}.`,
      type: 'SYSTEM',
      link_url: `/customers/${customerId}`
    }
  ]

  if (admins && admins.length > 0) {
    admins.forEach((admin: any) => {
      if (admin.id !== targetManagerId) {
        notifications.push({
          user_id: admin.id,
          title: 'Yêu cầu chuyển giao khách hàng',
          message: `Có yêu cầu chuyển giao khách hàng ${customerName} đang chờ phê duyệt.`,
          type: 'SYSTEM',
          link_url: `/customers/${customerId}`
        })
      }
    })
  }

  await supabase.from('notifications').insert(notifications)

  return data
}

export async function fetchTransferRequests(): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('manager_transfer_requests')
    .select(`
      *,
      customer:customer_id(id, full_name),
      requester:requester_id(id, full_name, email),
      target_manager:target_manager_id(id, full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as ManagerTransferRequest[]
}

export async function updateTransferRequestStatus(
  requestId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('manager_transfer_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'PENDING')
    .select(`
      *,
      customer:customer_id(id, full_name),
      requester:requester_id(id, full_name, email),
      target_manager:target_manager_id(id, full_name, email)
    `)
    .single()

  if (error) throw error

  const customerName = data.customer ? data.customer.full_name : 'khách hàng'

  // Log interaction if approved
  if (status === 'APPROVED') {
    const { error: customerUpdateError } = await supabase
      .from('customers')
      .update({
        assigned_manager_id: data.target_manager_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.customer_id)

    if (customerUpdateError) throw customerUpdateError

    await supabase.from('interactions').insert({
      customer_id: data.customer_id,
      manager_id: data.target_manager_id,
      type: 'CALL',
      purpose: 'BÀN GIAO QUẢN LÝ',
      notes: `Hệ thống: Khách hàng được chuyển giao quản lý từ ${data.requester.full_name} (${data.requester.email}) sang ${data.target_manager.full_name} (${data.target_manager.email}). Lý do: ${data.reason || 'Không có'}`,
      interaction_date: new Date().toISOString().split('T')[0],
      completion_status: true,
      result: 'SUCCESS'
    })
  }

  // Notify requester and target manager of result
  const notifications = [
    {
      user_id: data.requester_id,
      title: 'Kết quả yêu cầu chuyển giao',
      message: `Yêu cầu chuyển giao khách hàng ${customerName} đã được ${status === 'APPROVED' ? 'Phê duyệt' : 'Từ chối'}.`,
      type: 'SYSTEM',
      link_url: `/customers/${data.customer_id}`
    },
    {
      user_id: data.target_manager_id,
      title: 'Kết quả chuyển giao khách hàng',
      message: `Chuyển giao khách hàng ${customerName} sang cho bạn đã được ${status === 'APPROVED' ? 'Phê duyệt' : 'Từ chối'}.`,
      type: 'SYSTEM',
      link_url: `/customers/${data.customer_id}`
    }
  ]

  await supabase.from('notifications').insert(notifications)

  return data
}

// ==========================================
// SYSTEM SETTINGS
// ==========================================

export async function fetchSystemSettings(): Promise<any[]> {
  return cached('system_settings:all', async () => {
    const supabase = getSupabase()
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
      if (error) {
        logger.warn(
          "[Supabase API] system_settings table may not exist",
          { error: getErrorMessage(error) },
          { production: true }
        )
        return []
      }
      return data || []
    } catch (err) {
      logger.warn(
        "[Supabase API] Failed to fetch system settings",
        { error: getErrorMessage(err) },
        { production: true }
      )
      return []
    }
  }, LONG_CACHE_TTL_MS)
}

export async function updateSystemSetting(key: string, value: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  invalidateCache('system_settings:')
  return data
}

// ==========================================
// WEEKLY & DAILY PLANS
// ==========================================

export async function fetchWeeklyPlans(userId: string): Promise<any> {
  return cached(`weekly_plans:${userId}`, async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
    if (error) {
      logger.warn(
        "[Supabase API] weekly_plans table may not exist",
        { error: getErrorMessage(error) },
        { production: true }
      )
      return []
    }
    return data || []
  })
}

export async function fetchDailyPlans(userId: string, startDate: string, endDate: string): Promise<any> {
  return cached(`daily_plans:${userId}:${startDate}:${endDate}`, async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .gte('target_date', startDate)
      .lte('target_date', endDate)
      .order('target_date', { ascending: true })
    if (error) {
      logger.warn(
        "[Supabase API] daily_plans table may not exist",
        { error: getErrorMessage(error) },
        { production: true }
      )
      return []
    }
    return data || []
  })
}

export async function upsertWeeklyPlan(plan: any): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...plan,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert(payload, { onConflict: 'user_id,start_date' })
    .select()
    .single()
  if (error) {
    const productTargetsMissing = /product_targets|schema cache/i.test(error.message || '')
    if (!productTargetsMissing) throw error

    const { product_targets: _productTargets, ...compatiblePayload } = payload
    const { data: compatibleData, error: compatibleError } = await supabase
      .from('weekly_plans')
      .upsert(compatiblePayload, { onConflict: 'user_id,start_date' })
      .select()
      .single()
    if (compatibleError) throw compatibleError
    invalidateCache('weekly_plans:', 'daily_plans:', 'dashboard:')
    return compatibleData
  }
  invalidateCache('weekly_plans:', 'daily_plans:', 'dashboard:')
  return data
}

export async function upsertDailyPlans(plans: any[]): Promise<any> {
  const supabase = getSupabase()
  const payloads = plans.map((p: any) => ({
    ...p,
    updated_at: new Date().toISOString()
  }))
  const { data, error } = await supabase
    .from('daily_plans')
    .upsert(payloads, { onConflict: 'user_id,target_date' })
    .select()
  if (error) {
    const productTargetsMissing = /product_targets|schema cache/i.test(error.message || '')
    if (!productTargetsMissing) throw error

    const compatiblePayloads = payloads.map(({ product_targets: _productTargets, ...payload }) => payload)
    const { data: compatibleData, error: compatibleError } = await supabase
      .from('daily_plans')
      .upsert(compatiblePayloads, { onConflict: 'user_id,target_date' })
      .select()
    if (compatibleError) throw compatibleError
    invalidateCache('daily_plans:', 'weekly_plans:', 'dashboard:')
    return compatibleData
  }
  invalidateCache('daily_plans:', 'weekly_plans:', 'dashboard:')
  return data
}
