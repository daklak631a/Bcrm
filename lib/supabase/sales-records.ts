import { getSupabase } from './client'
import { cached } from './cache'
import {
  extractDateOnly,
  mapDepositToSalesRecord,
  mapLoanToSalesRecord,
  mapProductSaleToSalesRecord,
  sortSalesRecords,
} from './mappers'
import { createLoan, fetchLoans, fetchLoansByCustomer } from './loans'
import { createDeposit, fetchDeposits, fetchDepositsByCustomer } from './deposits'
import {
  createProductSale,
  fetchProductSales,
  fetchProductSalesByAgentId,
  fetchProductSalesByAgentIds,
  fetchProductSalesByCustomer,
} from './products'
import { SalesRecord } from '@/types/models'

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
    ...loans.map((l) => mapLoanToSalesRecord(l as any)),
    ...deposits.map((d) => mapDepositToSalesRecord(d as any)),
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
