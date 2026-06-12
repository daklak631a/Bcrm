import * as XLSX from 'xlsx'

/** Tối đa số dòng Excel mỗi lần upload (web + desktop). */
export const MAX_IMPORT_ROWS = 10_000
export const INSERT_BATCH_SIZE = 100
export const UPDATE_CONCURRENCY = 25

export type ProfileLike = { id: string; full_name: string; department_id?: string | null }

export type DepartmentLike = { code: string; name: string }

export type ExistingCustomer = {
  id: string
  cif_code: string | null
  phone: string | null
  tax_code: string | null
}

export type ParsedImportRow = {
  rowNumber: number
  customer: Record<string, unknown>
  loan?: {
    account_number: string
    loan_amount: number
    balance: number
    start_date: string
    due_date: string
    status: string
  }
  deposit?: {
    account_number: string
    amount: number
    start_date: string
    maturity_date: string
    status: string
  }
  existingId?: string
  error?: string
}

export function slugify(text: string) {
  return text.toString().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]/g, '')
}

export function parseBooleanCell(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'x', 'có', 'co'].includes(normalized)
}

export function parseNumberCell(value: unknown) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).replace(/[^\d.-]/g, '')
  return Number(normalized) || 0
}

export function parseExcelBuffer(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]
}

function normalizePhone(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return undefined
  return raw.replace(/\D/g, '')
}

export function buildImportRows(
  rawRows: Record<string, unknown>[],
  options: {
    defaultManagerId: string
    defaultDepartmentId?: string | null
    isAdmin: boolean
    profiles: ProfileLike[]
    departments: DepartmentLike[]
    existingByCif: Map<string, ExistingCustomer>
    existingByPhone: Map<string, ExistingCustomer>
    existingByTax: Map<string, ExistingCustomer>
  }
): ParsedImportRow[] {
  const seenCifs = new Set<string>()
  const results: ParsedImportRow[] = []

  for (let index = 0; index < rawRows.length; index++) {
    const item = rawRows[index]
    const rowNumber = index + 2

    try {
      const type = String(item['Loại KH (INDIVIDUAL/ENTERPRISE)'] || 'INDIVIDUAL').trim().toUpperCase()
      const name = String(item['Tên KH / Doanh Nghiệp'] || item.full_name || item.business_name || '').trim()
      const rep = String(item['Người Đại Diện (nếu là Doanh nghiệp)'] || item.representative_name || '').trim()
      const tax = String(item['Mã Số Thuế'] || item.tax_code || '').trim()
      const cif = String(item['Mã CIF (Tùy chọn)'] || item['Mã CIF'] || item.cif_code || '').trim()

      if (!['INDIVIDUAL', 'ENTERPRISE'].includes(type)) {
        throw new Error('Loại KH không hợp lệ')
      }
      if (!name) {
        throw new Error('Thiếu tên khách hàng/doanh nghiệp')
      }
      if (cif) {
        const normalizedCif = cif.toLowerCase()
        if (seenCifs.has(normalizedCif)) {
          throw new Error('Trùng mã CIF trong file')
        }
        seenCifs.add(normalizedCif)
      }

      let managerId = options.defaultManagerId
      let departmentId: string | null = null
      const managerName = String(item['Chuyên viên'] || item['Chuyen vien'] || item.assigned_manager_id || '').trim()
      if (managerName && options.isAdmin) {
        const sluggedName = slugify(managerName)
        const matchedProfile = options.profiles.find(
          (p) => slugify(p.full_name) === sluggedName || p.id === managerName
        )
        if (matchedProfile) {
          managerId = matchedProfile.id
          departmentId = matchedProfile.department_id || null
        }
      }

      const departmentRaw = String(
        item['Phòng quản lý'] || item['Phòng ban'] || item['Phong quan ly'] || item.department_id || ''
      ).trim()
      if (departmentRaw) {
        departmentId = resolveDepartmentFromList(departmentRaw, options.departments) || departmentRaw
      } else if (!departmentId && options.defaultDepartmentId) {
        departmentId = options.defaultDepartmentId
      }

      const phone = normalizePhone(item['Số điện thoại'] || item.phone)

      let existingCustomer: ExistingCustomer | undefined
      if (cif) {
        existingCustomer = options.existingByCif.get(cif.toLowerCase())
      }
      if (!existingCustomer && tax && type === 'ENTERPRISE') {
        existingCustomer = options.existingByTax.get(tax)
      }
      if (!existingCustomer && phone) {
        existingCustomer = options.existingByPhone.get(phone)
      }

      const customerPayload: Record<string, unknown> = {
        customer_type: type,
        full_name: type === 'ENTERPRISE' && name ? name : name,
        business_name: type === 'ENTERPRISE' ? name : '',
        representative_name: type === 'ENTERPRISE' ? rep : '',
        tax_code: type === 'ENTERPRISE' ? tax : '',
        cif_code: cif || null,
        phone: phone || null,
        email: item['Email'] || item.email || null,
        address: item['Địa chỉ'] || item.address || null,
        assigned_manager_id: managerId,
        department_id: departmentId,
        cif_moi: parseBooleanCell(item['CIF Mới']),
        smart_banking: parseBooleanCell(item['Ngân Hàng Số']),
        bao_hiem_nhan_tho: parseBooleanCell(item['Bảo Hiểm Nhân Thọ']),
        bao_hiem_khoan_vay: parseBooleanCell(item['Bảo Hiểm Khoản Vay']),
        the_tin_dung: parseBooleanCell(item['Thẻ Tín Dụng']),
        chuyen_tien_ngoai: parseBooleanCell(item['Chuyển Tiền Ngoài']),
        merchant_qr: parseBooleanCell(item['Merchant QR']),
      }

      const accNo = item['Số tài khoản'] ? String(item['Số tài khoản']).trim() : ''
      const duNo = parseNumberCell(item['Dư nợ'])
      const huyDong = parseNumberCell(item['Huy động'])

      const today = new Date().toISOString().slice(0, 10)
      const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10)

      const parsed: ParsedImportRow = {
        rowNumber,
        customer: customerPayload,
        existingId: existingCustomer?.id,
      }

      if (accNo && duNo > 0) {
        parsed.loan = {
          account_number: accNo,
          loan_amount: duNo,
          balance: duNo,
          start_date: today,
          due_date: nextYear,
          status: 'ACTIVE',
        }
      }
      if (accNo && huyDong > 0) {
        parsed.deposit = {
          account_number: accNo,
          amount: huyDong,
          start_date: today,
          maturity_date: nextYear,
          status: 'ACTIVE',
        }
      }

      results.push(parsed)
    } catch (err) {
      results.push({
        rowNumber,
        customer: {},
        error: err instanceof Error ? err.message : 'Không rõ lỗi',
      })
    }
  }

  return results
}

function resolveDepartmentFromList(rawValue: string, departments: DepartmentLike[]): string | null {
  const normalized = rawValue.trim()
  if (!normalized) return null

  const slug = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')
  const targetSlug = slug(normalized)

  const exact = departments.find((dept) => dept.code === normalized || dept.name === normalized)
  if (exact) return exact.code

  const fuzzy = departments.find((dept) => slug(dept.code) === targetSlug || slug(dept.name) === targetSlug)
  return fuzzy?.code || null
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function runInPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  const queue = [...items]
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item !== undefined) {
        await worker(item)
      }
    }
  })
  await Promise.all(runners)
}
