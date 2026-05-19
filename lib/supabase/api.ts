import { getSupabase } from './client'
import { Customer, ManagerTransferRequest, Plan, PlanAssignment } from '@/types/models'

// ==========================================
// UTILITY HELPERS
// ==========================================

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
      console.error('Failed to write audit log:', error)
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
          const notifications = admins.map(admin => ({
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
    console.error('Audit log exception:', error)
  }
}

export async function fetchAuditLogs(limit = 100) {
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

export async function fetchProfiles() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name')
  if (error) throw error
  return data || []
}

export async function fetchProfileById(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchPlans() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('target_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as Plan[]
}

export async function createPlan(plan: {
  title: string
  description?: string | null
  target_date: string
}) {
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

  return data as Plan
}

export async function fetchPlanAssignments(planId?: string) {
  const supabase = getSupabase()
  let query = supabase
    .from('plan_assignments')
    .select('*, profiles:user_id(*), plans:plan_id(*)')
    .order('updated_at', { ascending: false })

  if (planId) {
    query = query.eq('plan_id', planId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as PlanAssignment[]
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
}) {
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

  if (error) throw error

  await logAudit({
    action: 'UPDATE',
    entityType: 'PLAN',
    entityId: data.id || `${assignment.plan_id}:${assignment.user_id}`,
    afterValue: payload,
  })

  return data as PlanAssignment
}

// ==========================================
// CUSTOMERS
// ==========================================

export async function fetchCustomers() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .select('*, profiles:assigned_manager_id(id, full_name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchCustomerById(id: string) {
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
}) {
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
}>) {
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

  return data
}

// ==========================================
// LOANS
// ==========================================

export async function fetchLoans() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .select('*, customers(id, full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchLoansByCustomer(customerId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .select('*')
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
  interest_rate?: number
  start_date: string
  due_date: string
  status?: string
  business_sector?: string
  disbursement_purpose?: string
  collateral_assets?: string
  credit_limit?: number
  loan_method?: string
  term_type?: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .insert(loan)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'LOAN',
    entityId: data.id,
    afterValue: loan
  })

  return data
}

export async function updateLoan(id: string, updates: Record<string, any>) {
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

  return data
}

// ==========================================
// DEPOSITS
// ==========================================

export async function fetchDeposits() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deposits')
    .select('*, customers(id, full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchDepositsByCustomer(customerId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
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
  interest_rate?: number
  term_months?: number
  start_date: string
  maturity_date: string
  status?: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deposits')
    .insert(deposit)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'DEPOSIT',
    entityId: data.id,
    afterValue: deposit
  })

  return data
}

export async function updateDeposit(id: string, updates: Record<string, any>) {
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

  return data
}

// ==========================================
// INTERACTIONS
// ==========================================

export async function fetchInteractions() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('interactions')
    .select('*, customers(id, full_name), profiles:manager_id(id, full_name)')
    .order('interaction_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchInteractionsByCustomer(customerId: string) {
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
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('interactions')
    .insert(interaction)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'INTERACTION',
    entityId: data.id,
    afterValue: interaction
  })

  return data
}

export async function updateInteraction(id: string, updates: Record<string, any>) {
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

  return data
}

// ==========================================
// NOTIFICATIONS
// ==========================================

export async function fetchNotifications(userId: string) {
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
}) {
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

export async function fetchProducts() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_products')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function createProduct(product: {
  name: string
  type: string
  description?: string
  target?: number
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_products')
    .insert(product)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('cross_sell_products')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ==========================================
// CROSS-SELL RECORDS (SALES)
// ==========================================

export async function fetchProductSales() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .select('*, cross_sell_products(id, name, type), customers(id, full_name), profiles:agent_id(id, full_name)')
    .order('sale_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchProductSalesByCustomer(customerId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .select('*, cross_sell_products(id, name, type), profiles:agent_id(id, full_name)')
    .eq('customer_id', customerId)
    .order('sale_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createProductSale(sale: {
  product_id: string
  customer_id?: string
  agent_id: string
  status?: string
  sale_date?: string
  note?: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .insert(sale)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProductSale(id: string, updates: Record<string, any>) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('cross_sell_records')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ==========================================
// ALLOWED EMAILS (Team management)
// ==========================================

export async function fetchAllowedEmails() {
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
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('allowed_emails')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAllowedEmail(id: string, updates: Record<string, any>) {
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

export async function deleteAllowedEmail(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('allowed_emails')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ==========================================
// MANAGER TRANSFER REQUESTS
// ==========================================

export async function createTransferRequest(
  customerId: string,
  targetManagerId: string,
  reason: string
) {
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
    admins.forEach(admin => {
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

export async function fetchTransferRequests() {
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
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('manager_transfer_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
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
