import { describe, expect, it } from 'vitest'
import { getUnexploitedProducts, isCifNewProduct } from './cross-sell-suggestions'

const PRODUCTS = [
  { id: '1', name: 'CIF MỚI', type: 'Tài khoản' },
  { id: '2', name: 'BIDV DIRECT', type: 'Dịch vụ khác' },
  { id: '3', name: 'BẢO HIỂM NHÂN THỌ', type: 'Bảo hiểm' },
  { id: '4', name: 'HUY ĐỘNG VỐN TĂNG RÒNG', type: 'Huy động vốn' },
  { id: '5', name: 'DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)', type: 'Tín dụng' },
]

describe('cross-sell suggestions', () => {
  it('detects CIF mới product', () => {
    expect(isCifNewProduct('CIF MỚI')).toBe(true)
    expect(isCifNewProduct('BIDV DIRECT')).toBe(false)
  })

  it('never suggests CIF mới for existing customer profile', () => {
    const result = getUnexploitedProducts({}, PRODUCTS, [])
    expect(result.some((product) => product.name === 'CIF MỚI')).toBe(false)
  })

  it('hides products already flagged on customer record', () => {
    const result = getUnexploitedProducts(
      { smart_banking: true, bao_hiem_nhan_tho: true },
      PRODUCTS,
      []
    )
    expect(result.map((product) => product.name)).not.toContain('BIDV DIRECT')
    expect(result.map((product) => product.name)).not.toContain('BẢO HIỂM NHÂN THỌ')
  })

  it('hides products with financial data on customer record', () => {
    const result = getUnexploitedProducts(
      { hdv_tang_rong: 5, loan_short_term: 10 },
      PRODUCTS,
      []
    )
    expect(result.map((product) => product.name)).not.toContain('HUY ĐỘNG VỐN TĂNG RÒNG')
    expect(result.map((product) => product.name)).not.toContain('DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)')
  })

  it('hides products already sold in sales records', () => {
    const result = getUnexploitedProducts(
      {},
      PRODUCTS,
      [{ source_type: 'PRODUCT', title: 'BIDV DIRECT', category: 'Dịch vụ khác' }]
    )
    expect(result.map((product) => product.name)).not.toContain('BIDV DIRECT')
  })
})
