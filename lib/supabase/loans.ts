import { getSupabase } from './client'
import { cached, invalidateCache } from './cache'
import { logAudit } from './audit'
import { extractDateOnly } from './mappers'

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
