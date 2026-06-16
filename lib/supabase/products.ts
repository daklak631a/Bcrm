import { getSupabase } from './client'
import { LONG_CACHE_TTL_MS, cached, invalidateCache } from './cache'
import { logAudit } from './audit'
import { extractDateOnly } from './mappers'
import { ProductMetricType } from '@/types/models'

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
  short_name?: string
  kpi_category?: string
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
