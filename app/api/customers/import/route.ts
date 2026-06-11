import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/middleware/rate-limit'
import { internalServerError } from '@/lib/api-errors'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'
import {
  INSERT_BATCH_SIZE,
  MAX_IMPORT_ROWS,
  UPDATE_CONCURRENCY,
  buildImportRows,
  chunkArray,
  parseExcelBuffer,
  runInPool,
  type ExistingCustomer,
  type ParsedImportRow,
  type ProfileLike,
} from '@/lib/customers/import'

export const maxDuration = 300

/** Vercel giới hạn body ~4.5MB — giữ dưới ngưỡng này. */
const MAX_FILE_BYTES = 4 * 1024 * 1024
const ADMIN_ROLES = new Set(['ADMIN_LEVEL_0', 'ADMIN_LEVEL_1', 'ADMIN_LEVEL_2', 'ADMIN_LEVEL_3'])

function createRequestClient(authHeader: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader || '' } },
  })
}

async function fetchExistingCustomers(
  supabase: SupabaseClient,
  cifs: string[],
  phones: string[],
  taxes: string[]
) {
  const byCif = new Map<string, ExistingCustomer>()
  const byPhone = new Map<string, ExistingCustomer>()
  const byTax = new Map<string, ExistingCustomer>()

  const selectCols = 'id, cif_code, phone, tax_code'

  for (const chunk of chunkArray(cifs, 100)) {
    const { data } = await supabase.from('customers').select(selectCols).in('cif_code', chunk).is('deleted_at', null)
    for (const row of data || []) {
      if (row.cif_code) byCif.set(String(row.cif_code).toLowerCase(), row as ExistingCustomer)
    }
  }

  for (const chunk of chunkArray(phones, 100)) {
    const { data } = await supabase.from('customers').select(selectCols).in('phone', chunk).is('deleted_at', null)
    for (const row of data || []) {
      if (row.phone) byPhone.set(String(row.phone), row as ExistingCustomer)
    }
  }

  for (const chunk of chunkArray(taxes, 100)) {
    const { data } = await supabase.from('customers').select(selectCols).in('tax_code', chunk).is('deleted_at', null)
    for (const row of data || []) {
      if (row.tax_code) byTax.set(String(row.tax_code), row as ExistingCustomer)
    }
  }

  return { byCif, byPhone, byTax }
}

async function batchInsertCustomers(
  supabase: SupabaseClient,
  rows: ParsedImportRow[]
) {
  const idByRow = new Map<number, string>()
  const chunks = chunkArray(rows, INSERT_BATCH_SIZE)

  for (const chunk of chunks) {
    const payload = chunk.map((row) => row.customer)
    const { data, error } = await supabase.from('customers').insert(payload).select('id')
    if (error) throw error
    data?.forEach((created, index) => {
      idByRow.set(chunk[index].rowNumber, created.id)
    })
  }

  return idByRow
}

async function batchInsertLoansDeposits(
  supabase: SupabaseClient,
  rows: ParsedImportRow[],
  resolveCustomerId: (row: ParsedImportRow) => string | undefined
) {
  const loans: Record<string, unknown>[] = []
  const deposits: Record<string, unknown>[] = []

  for (const row of rows) {
    const customerId = resolveCustomerId(row)
    if (!customerId) continue

    if (row.loan) {
      loans.push({ customer_id: customerId, ...row.loan })
    }
    if (row.deposit) {
      deposits.push({ customer_id: customerId, ...row.deposit })
    }
  }

  for (const chunk of chunkArray(loans, INSERT_BATCH_SIZE)) {
    const { error } = await supabase.from('loans').insert(chunk)
    if (error) throw error
  }

  for (const chunk of chunkArray(deposits, INSERT_BATCH_SIZE)) {
    const { error } = await supabase.from('deposits').insert(chunk)
    if (error) throw error
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(ip, '/api/customers/import', 'write')
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }, { status: 429 })
  }

  try {
    const authHeader = request.headers.get('Authorization')
    const accessToken = authHeader?.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) {
      return NextResponse.json({ error: 'Thiếu token xác thực.' }, { status: 401 })
    }

    const supabase = createRequestClient(authHeader)
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Đăng nhập lại bằng Google.' },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, department_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ người dùng.' }, { status: 403 })
    }

    if (!ADMIN_ROLES.has(profile.role)) {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới được nhập dữ liệu hàng loạt.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Thiếu file Excel (.xlsx).' }, { status: 400 })
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File quá lớn (tối đa 5MB).' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const rawRows = parseExcelBuffer(buffer)

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'File không có dữ liệu để nhập.' }, { status: 400 })
    }
    if (rawRows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `Tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần nhập.` }, { status: 400 })
    }

    const cifs = rawRows
      .map((r) => String(r['Mã CIF (Tùy chọn)'] || r['Mã CIF'] || r.cif_code || '').trim())
      .filter(Boolean)
    const phones = rawRows
      .map((r) => String(r['Số điện thoại'] || r.phone || '').replace(/\D/g, ''))
      .filter(Boolean)
    const taxes = rawRows
      .map((r) => String(r['Mã Số Thuế'] || r.tax_code || '').trim())
      .filter((t, i, arr) => t && arr.indexOf(t) === i)

    const [{ byCif, byPhone, byTax }, profilesResult] = await Promise.all([
      fetchExistingCustomers(supabase, cifs, phones, taxes),
      supabase
        .from('profiles')
        .select('id, full_name, department_id')
        .eq('is_active', true),
    ])

    const profiles = (profilesResult.data || []) as ProfileLike[]
    const isAdmin = ADMIN_ROLES.has(profile.role)

    const parsedRows = buildImportRows(rawRows, {
      defaultManagerId: user.id,
      isAdmin,
      profiles,
      existingByCif: byCif,
      existingByPhone: byPhone,
      existingByTax: byTax,
    })

    const validationErrors = parsedRows
      .filter((row) => row.error)
      .map((row) => `Dòng ${row.rowNumber}: ${row.error}`)

    const validRows = parsedRows.filter((row) => !row.error)
    const toInsert = validRows.filter((row) => !row.existingId)
    const toUpdate = validRows.filter((row) => row.existingId)

    const idByRow = new Map<number, string>()
    for (const row of toUpdate) {
      if (row.existingId) idByRow.set(row.rowNumber, row.existingId)
    }

    if (toInsert.length > 0) {
      const insertedIds = await batchInsertCustomers(supabase, toInsert)
      insertedIds.forEach((id, rowNumber) => idByRow.set(rowNumber, id))
    }

    const updateErrors: string[] = []
    await runInPool(toUpdate, UPDATE_CONCURRENCY, async (row) => {
      const customerId = row.existingId
      if (!customerId) return
      const { error } = await supabase
        .from('customers')
        .update({ ...row.customer, updated_at: new Date().toISOString() })
        .eq('id', customerId)
      if (error) {
        updateErrors.push(`Dòng ${row.rowNumber}: ${error.message}`)
      }
    })

    await batchInsertLoansDeposits(supabase, validRows, (row) => idByRow.get(row.rowNumber))

    const successCount = validRows.length - updateErrors.length
    const failedRows = [...validationErrors, ...updateErrors]

    if (successCount > 0) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'CUSTOMER',
        entity_id: user.id,
        after_value: {
          bulk_import: true,
          file_name: file.name,
          total_rows: rawRows.length,
          success_count: successCount,
          failed_count: failedRows.length,
        },
      })
    }

    return NextResponse.json({
      total: rawRows.length,
      success: successCount,
      failed: failedRows.length,
      errors: failedRows.slice(0, 50),
      has_more_errors: failedRows.length > 50,
    })
  } catch (error: unknown) {
    logger.error('[Customers Import API] Failed', { error: getErrorMessage(error) }, { production: true })
    return internalServerError(error, '[Customers Import API] Failed', 'Không thể nhập dữ liệu khách hàng.')
  }
}
