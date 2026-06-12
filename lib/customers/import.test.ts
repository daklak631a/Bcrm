import { describe, expect, it } from 'vitest'
import { MAX_IMPORT_ROWS, buildImportRows, parseBooleanCell, parseNumberCell, slugify } from './import'

describe('customers/import helpers', () => {
  it('allows up to 10_000 rows per upload', () => {
    expect(MAX_IMPORT_ROWS).toBe(10_000)
  })

  it('slugify removes accents and non-alphanumeric chars', () => {
    expect(slugify('Nguyễn Văn A')).toBe('nguyenvana')
  })

  it('parseBooleanCell accepts Vietnamese yes values', () => {
    expect(parseBooleanCell('có')).toBe(true)
    expect(parseBooleanCell('no')).toBe(false)
  })

  it('parseNumberCell parses plain numeric strings', () => {
    expect(parseNumberCell('1500000')).toBe(1500000)
    expect(parseNumberCell('')).toBe(0)
  })
})

describe('buildImportRows', () => {
  it('flags duplicate CIF within the same file', () => {
    const rows = buildImportRows(
      [
        { 'Tên KH / Doanh Nghiệp': 'A', 'Mã CIF (Tùy chọn)': 'CIF001' },
        { 'Tên KH / Doanh Nghiệp': 'B', 'Mã CIF (Tùy chọn)': 'CIF001' },
      ],
      {
        defaultManagerId: 'mgr-1',
        isAdmin: false,
        profiles: [],
        departments: [],
        existingByCif: new Map(),
        existingByPhone: new Map(),
        existingByTax: new Map(),
      }
    )

    expect(rows[0].error).toBeUndefined()
    expect(rows[1].error).toBe('Trùng mã CIF trong file')
  })

  it('maps department from Phòng quản lý column', () => {
    const rows = buildImportRows(
      [{ 'Tên KH / Doanh Nghiệp': 'A', 'Phòng quản lý': 'Phòng KHDN1' }],
      {
        defaultManagerId: 'mgr-1',
        isAdmin: false,
        profiles: [],
        departments: [{ code: 'Phòng KHDN1', name: 'Phòng KHDN1' }],
        existingByCif: new Map(),
        existingByPhone: new Map(),
        existingByTax: new Map(),
      }
    )

    expect(rows[0].customer.department_id).toBe('Phòng KHDN1')
  })

  it('maps existing customer by phone for update', () => {
    const rows = buildImportRows(
      [{ 'Tên KH / Doanh Nghiệp': 'A', 'Số điện thoại': '0901234567' }],
      {
        defaultManagerId: 'mgr-1',
        isAdmin: false,
        profiles: [],
        departments: [],
        existingByCif: new Map(),
        existingByPhone: new Map([['0901234567', { id: 'cust-1', cif_code: null, phone: '0901234567', tax_code: null }]]),
        existingByTax: new Map(),
      }
    )

    expect(rows[0].existingId).toBe('cust-1')
    expect(rows[0].customer.phone).toBe('0901234567')
  })
})
