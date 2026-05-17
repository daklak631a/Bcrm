import { getSupabase } from './client'

// ==========================================
// UTILITY HELPERS
// ==========================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

export function getCustomerFullName(customer: any): string {
  if (!customer) return '—'
  return `${customer.last_name || ''} ${customer.first_name || ''}`.trim() || '—'
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
  first_name: string
  last_name: string
  phone?: string
  email?: string
  address?: string
  note?: string
  assigned_manager_id: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(id: string, updates: Partial<{
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  note: string
  assigned_manager_id: string
}>) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ==========================================
// LOANS
// ==========================================

export async function fetchLoans() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .select('*, customers(id, first_name, last_name)')
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
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('loans')
    .insert(loan)
    .select()
    .single()
  if (error) throw error
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
  return data
}

// ==========================================
// DEPOSITS
// ==========================================

export async function fetchDeposits() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('deposits')
    .select('*, customers(id, first_name, last_name)')
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
  return data
}

// ==========================================
// INTERACTIONS
// ==========================================

export async function fetchInteractions() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('interactions')
    .select('*, customers(id, first_name, last_name), profiles:manager_id(id, full_name)')
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
    .select('*, cross_sell_products(id, name, type), customers(id, first_name, last_name), profiles:agent_id(id, full_name)')
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
