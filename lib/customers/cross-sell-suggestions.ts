type CustomerLike = {
  cif_code?: string | null
  cif_moi?: boolean | null
  smart_banking?: boolean | null
  bao_hiem_nhan_tho?: boolean | null
  bao_hiem_khoan_vay?: boolean | null
  the_tin_dung?: boolean | null
  chuyen_tien_ngoai?: boolean | null
  merchant_qr?: boolean | null
  sp_khac?: string | null
  loan_short_term?: number | null
  loan_mid_long_term?: number | null
  hdv_dau_ky?: number | null
  hdv_phat_sinh?: number | null
  hdv_tang_rong?: number | null
  limit_approval_count?: number | null
}

type ProductLike = { id: string; name: string; short_name?: string | null; type?: string | null }
type SalesRecordLike = {
  source_type?: string | null
  title?: string | null
  category?: string | null
}

function hasPositiveNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0
}

function normalizeProductName(name: string) {
  return name.trim().toUpperCase()
}

/** KH đã có hồ sơ → không gợi ý CIF mới (chỉ dùng khi nhập KH mới). */
export function isCifNewProduct(productName: string) {
  const normalized = normalizeProductName(productName)
  return normalized.includes('CIF') && normalized.includes('MỚI')
}

function customerHasStoredProduct(customer: CustomerLike, productName: string): boolean {
  const pName = normalizeProductName(productName)

  // Hồ sơ KH đã tồn tại — CIF mới chỉ dùng khi nhập KH mới
  if (isCifNewProduct(pName)) {
    return true
  }

  if (pName.includes('DIRECT') || pName.includes('SMART') || pName.includes('NGÂN HÀNG SỐ')) {
    return Boolean(customer.smart_banking)
  }

  if (pName.includes('NHÂN THỌ') || pName.includes('BHNT')) {
    return Boolean(customer.bao_hiem_nhan_tho)
  }

  if (pName.includes('KHOẢN VAY') && pName.includes('BẢO HIỂM')) {
    return Boolean(customer.bao_hiem_khoan_vay)
  }

  if (pName.includes('HUY ĐỘNG') || pName.includes('TIỀN GỬI')) {
    return (
      hasPositiveNumber(customer.hdv_dau_ky) ||
      hasPositiveNumber(customer.hdv_phat_sinh) ||
      hasPositiveNumber(customer.hdv_tang_rong)
    )
  }

  if (pName.includes('DƯ NỢ') && (pName.includes('NGẮN') || pName.includes('NGAN'))) {
    return hasPositiveNumber(customer.loan_short_term)
  }

  if (pName.includes('DƯ NỢ') && (pName.includes('TRUNG') || pName.includes('DÀI') || pName.includes('DAI'))) {
    return hasPositiveNumber(customer.loan_mid_long_term)
  }

  if (pName.includes('DƯ NỢ')) {
    return hasPositiveNumber(customer.loan_short_term) || hasPositiveNumber(customer.loan_mid_long_term)
  }

  if (pName.includes('HMTD') || pName.includes('HẠN MỨC')) {
    return hasPositiveNumber(customer.limit_approval_count)
  }

  if (pName.includes('THẺ') || (pName.includes('TÍN DỤNG') && !pName.includes('DƯ NỢ'))) {
    return Boolean(customer.the_tin_dung)
  }

  if (pName.includes('CHUYỂN TIỀN') || pName.includes('CTN')) {
    return Boolean(customer.chuyen_tien_ngoai)
  }

  if (pName.includes('MERCHANT') || pName.includes('QR')) {
    return Boolean(customer.merchant_qr)
  }

  if (customer.sp_khac?.trim()) {
    const other = normalizeProductName(customer.sp_khac)
    if (other.includes(pName) || pName.includes(other)) {
      return true
    }
  }

  return false
}

function salesRecordMatchesProduct(record: SalesRecordLike, productName: string) {
  const pName = normalizeProductName(productName)
  const rTitle = normalizeProductName(record.title || '')
  const rCategory = normalizeProductName(record.category || '')

  if (rTitle === pName || rCategory === pName) return true

  if (pName.includes('DIRECT') && (rTitle.includes('DIRECT') || rCategory.includes('DIRECT'))) return true
  if (pName.includes('NHÂN THỌ') && (rTitle.includes('NHÂN THỌ') || rCategory.includes('NHÂN THỌ'))) return true
  if (pName.includes('KHOẢN VAY') && pName.includes('BẢO HIỂM') && (rTitle.includes('KHOẢN VAY') || rCategory.includes('KHOẢN VAY'))) return true
  if (pName.includes('THẺ') && (rTitle.includes('THẺ') || rCategory.includes('THẺ'))) return true
  if (pName.includes('HMTD') && (rTitle.includes('HMTD') || rCategory.includes('HMTD'))) return true

  return false
}

function salesRecordCoversProduct(_customer: CustomerLike, salesRecords: SalesRecordLike[], productName: string) {
  return salesRecords.some((record) => {
    if (record.source_type !== 'PRODUCT') return false
    return salesRecordMatchesProduct(record, productName)
  })
}

/**
 * Sản phẩm chưa khai thác trên hồ sơ KH hiện có.
 * - CIF mới: không gợi ý (KH đã tồn tại).
 * - Sản phẩm khác: ẩn nếu đã có cờ/dữ liệu trên hồ sơ hoặc đã ghi nhận bán hàng.
 */
export function getUnexploitedProducts(
  customer: CustomerLike,
  products: ProductLike[],
  salesRecords: SalesRecordLike[] = []
): ProductLike[] {
  return products.filter((product) => {
    if (customerHasStoredProduct(customer, product.name)) {
      return false
    }
    if (salesRecordCoversProduct(customer, salesRecords, product.name)) {
      return false
    }
    return true
  })
}
