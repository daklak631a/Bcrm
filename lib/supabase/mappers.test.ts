import { describe, expect, it } from 'vitest'
import {
  extractDateOnly,
  getCustomerFullName,
  mapDepositToSalesRecord,
  mapLoanToSalesRecord,
  mapProductSaleToSalesRecord,
  sortSalesRecords,
  toSortableTimestamp,
} from './mappers'

describe('getCustomerFullName', () => {
  it('prefers business name for enterprise customers', () => {
    expect(getCustomerFullName({ customer_type: 'ENTERPRISE', business_name: 'Cty ABC', full_name: 'Nguyen A' })).toBe('Cty ABC')
  })

  it('falls back to full name and dash', () => {
    expect(getCustomerFullName({ full_name: 'Nguyen A' })).toBe('Nguyen A')
    expect(getCustomerFullName(null)).toBe('—')
    expect(getCustomerFullName({})).toBe('—')
  })
})

describe('extractDateOnly', () => {
  it('extracts the date part from ISO strings', () => {
    expect(extractDateOnly('2026-06-10T08:30:00Z')).toBe('2026-06-10')
    expect(extractDateOnly('2026-06-10')).toBe('2026-06-10')
  })

  it('returns undefined for empty or invalid input', () => {
    expect(extractDateOnly(undefined)).toBeUndefined()
    expect(extractDateOnly('not-a-date')).toBeUndefined()
  })
})

describe('mapLoanToSalesRecord', () => {
  const loan = {
    id: 'loan-1',
    customer_id: 'cust-1',
    loan_type: 'Vay ngắn hạn',
    loan_amount: 500000000,
    start_date: '2026-06-01',
    status: 'ACTIVE' as const,
    account_number: 'LN001',
    customers: { id: 'cust-1', full_name: 'Nguyen A', assigned_manager_id: 'mgr-1' },
  }

  it('maps loan fields into a sales record', () => {
    const record = mapLoanToSalesRecord(loan)
    expect(record.id).toBe('loan:loan-1')
    expect(record.source_type).toBe('LOAN')
    expect(record.customer_name).toBe('Nguyen A')
    expect(record.agent_id).toBe('mgr-1')
    expect(record.amount).toBe(500000000)
    expect(record.metric_type).toBe('AMOUNT')
    expect(record.source_href).toBe('/sales?customerId=cust-1')
  })

  it('handles missing joins with safe defaults', () => {
    const record = mapLoanToSalesRecord({ id: 'loan-2' })
    expect(record.customer_name).toBe('—')
    expect(record.agent_id).toBeNull()
    expect(record.amount).toBe(0)
    expect(record.title).toBe('Khoản vay')
    expect(record.status).toBe('ACTIVE')
  })
})

describe('mapDepositToSalesRecord', () => {
  it('maps deposit fields and maturity note', () => {
    const record = mapDepositToSalesRecord({
      id: 'dep-1',
      customer_id: 'cust-1',
      deposit_type: 'Tiết kiệm 6 tháng',
      amount: 200,
      maturity_date: '2026-12-01',
      customers: { id: 'cust-1', full_name: 'Nguyen A', assigned_manager_id: 'mgr-1' },
    })
    expect(record.id).toBe('deposit:dep-1')
    expect(record.source_type).toBe('DEPOSIT')
    expect(record.note).toBe('Đáo hạn: 2026-12-01')
    expect(record.amount).toBe(200)
  })
})

describe('mapProductSaleToSalesRecord', () => {
  it('uses the product metric definition for quantity products', () => {
    const record = mapProductSaleToSalesRecord({
      id: 'sale-1',
      customer_id: 'cust-1',
      agent_id: 'agent-1',
      sale_date: '2026-06-09T00:00:00Z',
      result_value: 3,
      cross_sell_products: { id: 'p1', name: 'CIF mới', type: 'TÀI KHOẢN' },
      customers: { id: 'cust-1', full_name: 'Nguyen A' },
    })
    expect(record.source_type).toBe('PRODUCT')
    expect(record.metric_type).toBe('QUANTITY')
    expect(record.metric_value).toBe(3)
    expect(record.quantity).toBe(3)
    expect(record.amount).toBe(0)
    expect(record.sale_date).toBe('2026-06-09')
  })

  it('marks unallocated batch entries', () => {
    const record = mapProductSaleToSalesRecord({
      id: 'sale-2',
      is_batch_entry: true,
      is_allocated: false,
      result_value: 5,
      cross_sell_products: { id: 'p1', name: 'CIF mới', type: 'TÀI KHOẢN' },
    })
    expect(record.customer_name).toBe('Nhập lô cuối ngày')
    expect(record.note).toBe('Chưa phân bổ theo KH')
  })
})

describe('sortSalesRecords', () => {
  it('sorts by sale date descending with created_at fallback', () => {
    const records = [
      mapLoanToSalesRecord({ id: 'a', start_date: '2026-06-01' }),
      mapLoanToSalesRecord({ id: 'b', start_date: '2026-06-09' }),
      mapLoanToSalesRecord({ id: 'c', created_at: '2026-06-05T00:00:00Z' }),
    ]
    expect(sortSalesRecords(records).map((r) => r.source_id)).toEqual(['b', 'c', 'a'])
  })

  it('does not mutate the input array', () => {
    const records = [
      mapLoanToSalesRecord({ id: 'a', start_date: '2026-06-01' }),
      mapLoanToSalesRecord({ id: 'b', start_date: '2026-06-09' }),
    ]
    sortSalesRecords(records)
    expect(records[0].source_id).toBe('a')
  })
})

describe('toSortableTimestamp', () => {
  it('parses dates and returns 0 for invalid values', () => {
    expect(toSortableTimestamp('2026-06-10')).toBeGreaterThan(0)
    expect(toSortableTimestamp(undefined)).toBe(0)
    expect(toSortableTimestamp('garbage')).toBe(0)
  })
})
