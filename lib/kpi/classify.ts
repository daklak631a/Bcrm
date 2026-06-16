/**
 * Phân loại sản phẩm bán chéo về nhóm KPI — NGUỒN SỰ THẬT DUY NHẤT (phía TS).
 *
 * Ưu tiên cột `kpi_category` đã lưu trên sản phẩm; chỉ khi trống mới đoán theo
 * tên/loại (string-match) để tương thích ngược dữ liệu cũ. Sản phẩm mới nên gán
 * `kpi_category` tường minh ở form để không phụ thuộc đoán mò.
 *
 * Giữ đồng bộ danh sách này với migration `migration_kpi_category_*.sql` và
 * hàm SQL `get_kpi_summary`.
 */

/** Nhóm gộp các sản phẩm không thuộc KPI cố định. */
export const OTHER_PRODUCTS_ID = 'other_spdv'

export const KPI_CATEGORY_VALUES = [
  'cif_moi',
  'bidv_direct',
  'cap_moi_hmtd',
  'bh_khoan_vay',
  'bh_nhan_tho',
  'huy_dong_tang_rong',
  'du_no_ngan_han_tang_rong',
  'du_no_trung_han_tang_rong',
  OTHER_PRODUCTS_ID,
] as const

export type KpiCategory = (typeof KPI_CATEGORY_VALUES)[number]

/** Nhãn hiển thị cho từng nhóm KPI (dùng cho dropdown ở form sản phẩm). */
export const KPI_CATEGORY_LABELS: Record<KpiCategory, string> = {
  cif_moi: 'CIF mới',
  bidv_direct: 'BIDV Direct',
  cap_moi_hmtd: 'Cấp mới HMTD',
  bh_khoan_vay: 'Bảo hiểm khoản vay',
  bh_nhan_tho: 'Bảo hiểm nhân thọ',
  huy_dong_tang_rong: 'Huy động vốn tăng ròng',
  du_no_ngan_han_tang_rong: 'Dư nợ tín dụng tăng ròng (ngắn hạn)',
  du_no_trung_han_tang_rong: 'Dư nợ tín dụng tăng ròng (trung dài hạn)',
  [OTHER_PRODUCTS_ID]: 'Sản phẩm khác',
}

function isKpiCategory(value: unknown): value is KpiCategory {
  return typeof value === 'string' && (KPI_CATEGORY_VALUES as readonly string[]).includes(value)
}

/** Đoán nhóm KPI từ tên + loại sản phẩm (fallback khi chưa có kpi_category). */
export function classifyKpiProductByName(product?: { name?: string | null; type?: string | null }): KpiCategory {
  const upperName = `${product?.name || ''}`.toUpperCase()
  const upperType = `${product?.type || ''}`.toUpperCase()
  const text = `${upperName} ${upperType}`

  if (text.includes('CIF')) return 'cif_moi'
  if (text.includes('DIRECT')) return 'bidv_direct'
  if (text.includes('HMTD') || text.includes('HẠN MỨC') || text.includes('HAN MUC')) return 'cap_moi_hmtd'
  if (text.includes('BẢO HIỂM') || text.includes('BAO HIEM') || text.includes('BH ') || text.includes('LIFE')) {
    if (text.includes('KHOẢN VAY') || text.includes('KHOAN VAY') || text.includes('LOAN')) return 'bh_khoan_vay'
    return 'bh_nhan_tho'
  }
  if (text.includes('HUY ĐỘNG') || text.includes('HUY DONG')) return 'huy_dong_tang_rong'
  if (text.includes('DƯ NỢ') || text.includes('DU NO')) {
    if (text.includes('NGẮN HẠN') || text.includes('NGAN HAN')) return 'du_no_ngan_han_tang_rong'
    if (text.includes('TRUNG') || text.includes('DÀI HẠN') || text.includes('DAI HAN')) return 'du_no_trung_han_tang_rong'
  }

  return OTHER_PRODUCTS_ID
}

/**
 * Trả về nhóm KPI của sản phẩm: dùng `kpi_category` nếu hợp lệ, ngược lại đoán
 * theo tên/loại.
 */
export function classifyKpiProduct(product?: {
  name?: string | null
  type?: string | null
  kpi_category?: string | null
}): KpiCategory {
  if (isKpiCategory(product?.kpi_category)) return product.kpi_category
  return classifyKpiProductByName(product)
}
