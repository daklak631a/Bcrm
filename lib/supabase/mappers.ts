import { getProductMetricDefinition, getProductMetricValue } from '@/lib/product-metrics'
import { SalesRecord } from '@/types/models'

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

export function extractDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined
  const matched = value.match(/^(\d{4}-\d{2}-\d{2})/)
  if (matched) return matched[1]
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString().slice(0, 10)
}

export function toSortableTimestamp(value?: string | null): number {
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

export function mapLoanToSalesRecord(loan: any): SalesRecord {
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

export function mapDepositToSalesRecord(deposit: any): SalesRecord {
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

export function mapProductSaleToSalesRecord(sale: any): SalesRecord {
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

export function sortSalesRecords(records: SalesRecord[]) {
  return [...records].sort((a, b) => {
    const bTime = toSortableTimestamp(b.sale_date || b.created_at)
    const aTime = toSortableTimestamp(a.sale_date || a.created_at)
    return bTime - aTime
  })
}
