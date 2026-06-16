import { getSupabase } from './client'
import type { TablesInsert } from '@/types/database'
import { cached, invalidateCache } from './cache'
import { logAudit } from './audit'
import { extractDateOnly } from './mappers'

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
    .insert(payload as TablesInsert<'deposits'>)
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
