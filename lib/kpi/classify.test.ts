import { describe, expect, it } from "vitest"
import {
  OTHER_PRODUCTS_ID,
  classifyKpiProduct,
  classifyKpiProductByName,
} from "@/lib/kpi/classify"

describe("classifyKpiProductByName", () => {
  it("maps known Vietnamese product names to KPI categories", () => {
    expect(classifyKpiProductByName({ name: "CIF MỚI" })).toBe("cif_moi")
    expect(classifyKpiProductByName({ name: "BIDV DIRECT" })).toBe("bidv_direct")
    expect(classifyKpiProductByName({ name: "CẤP MỚI HMTD" })).toBe("cap_moi_hmtd")
    expect(classifyKpiProductByName({ name: "BẢO HIỂM KHOẢN VAY" })).toBe("bh_khoan_vay")
    expect(classifyKpiProductByName({ name: "BẢO HIỂM NHÂN THỌ" })).toBe("bh_nhan_tho")
    expect(classifyKpiProductByName({ name: "HUY ĐỘNG VỐN TĂNG RÒNG" })).toBe("huy_dong_tang_rong")
    expect(classifyKpiProductByName({ name: "DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)" })).toBe("du_no_ngan_han_tang_rong")
    expect(classifyKpiProductByName({ name: "DƯ NỢ TÍN DỤNG TĂNG RÒNG (Trung dài hạn)" })).toBe("du_no_trung_han_tang_rong")
  })

  it("falls back to the other-products bucket for unknown products", () => {
    expect(classifyKpiProductByName({ name: "Thẻ doanh nghiệp" })).toBe(OTHER_PRODUCTS_ID)
    expect(classifyKpiProductByName({})).toBe(OTHER_PRODUCTS_ID)
  })
})

describe("classifyKpiProduct", () => {
  it("prefers an explicit kpi_category over the name heuristic", () => {
    // Tên gợi ý 'bh_nhan_tho' nhưng kpi_category đã gán 'bh_khoan_vay' -> ưu tiên cột.
    expect(
      classifyKpiProduct({ name: "BẢO HIỂM NHÂN THỌ", kpi_category: "bh_khoan_vay" })
    ).toBe("bh_khoan_vay")
  })

  it("ignores an invalid kpi_category and falls back to the name heuristic", () => {
    expect(
      classifyKpiProduct({ name: "CIF MỚI", kpi_category: "khong_hop_le" })
    ).toBe("cif_moi")
  })

  it("uses the heuristic when kpi_category is null/empty", () => {
    expect(classifyKpiProduct({ name: "BIDV DIRECT", kpi_category: null })).toBe("bidv_direct")
    expect(classifyKpiProduct({ name: "Sản phẩm lạ" })).toBe(OTHER_PRODUCTS_ID)
  })
})
