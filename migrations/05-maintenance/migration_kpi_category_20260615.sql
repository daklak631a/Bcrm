-- ==========================================
-- KPI CATEGORY — NGUỒN SỰ THẬT DUY NHẤT cho phân loại sản phẩm bán chéo
-- Thay việc đoán theo tên (string-match) rải rác bằng cột kpi_category.
-- Giữ string-match làm FALLBACK (COALESCE) để không vỡ dữ liệu cũ.
-- Đồng bộ giá trị với lib/kpi/classify.ts
-- ==========================================

-- 1) Thêm cột
ALTER TABLE cross_sell_products ADD COLUMN IF NOT EXISTS kpi_category TEXT;

-- 2) Backfill theo đúng luật string-match hiện hành (chỉ ghi khi đang trống)
UPDATE cross_sell_products SET kpi_category = 'cif_moi'
  WHERE kpi_category IS NULL AND UPPER(name) LIKE '%CIF%';
UPDATE cross_sell_products SET kpi_category = 'bidv_direct'
  WHERE kpi_category IS NULL AND UPPER(name) LIKE '%DIRECT%';
UPDATE cross_sell_products SET kpi_category = 'cap_moi_hmtd'
  WHERE kpi_category IS NULL AND (UPPER(name) LIKE '%HMTD%' OR UPPER(name) LIKE '%HẠN MỨC%');
UPDATE cross_sell_products SET kpi_category = 'bh_khoan_vay'
  WHERE kpi_category IS NULL AND UPPER(name) LIKE '%BẢO HIỂM%' AND UPPER(name) LIKE '%KHOẢN VAY%';
UPDATE cross_sell_products SET kpi_category = 'bh_nhan_tho'
  WHERE kpi_category IS NULL AND UPPER(name) LIKE '%BẢO HIỂM%';
UPDATE cross_sell_products SET kpi_category = 'huy_dong_tang_rong'
  WHERE kpi_category IS NULL AND UPPER(name) LIKE '%HUY ĐỘNG%';
UPDATE cross_sell_products SET kpi_category = 'du_no_ngan_han_tang_rong'
  WHERE kpi_category IS NULL AND UPPER(name) LIKE '%DƯ NỢ%' AND UPPER(name) LIKE '%NGẮN HẠN%';
UPDATE cross_sell_products SET kpi_category = 'du_no_trung_han_tang_rong'
  WHERE kpi_category IS NULL AND UPPER(name) LIKE '%DƯ NỢ%' AND (UPPER(name) LIKE '%TRUNG%' OR UPPER(name) LIKE '%DÀI HẠN%');
-- Còn lại: nhóm "sản phẩm khác"
UPDATE cross_sell_products SET kpi_category = 'other_spdv'
  WHERE kpi_category IS NULL;

-- 3) Hàm helper: phân loại 1 sản phẩm — ưu tiên kpi_category, fallback string-match.
--    Dùng chung trong get_kpi_summary để tránh lặp luật.
CREATE OR REPLACE FUNCTION kpi_category_of(p_kpi_category TEXT, p_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF p_kpi_category IS NOT NULL AND p_kpi_category <> '' THEN
    RETURN p_kpi_category;
  END IF;
  IF UPPER(p_name) LIKE '%CIF%' THEN RETURN 'cif_moi'; END IF;
  IF UPPER(p_name) LIKE '%DIRECT%' THEN RETURN 'bidv_direct'; END IF;
  IF UPPER(p_name) LIKE '%HMTD%' OR UPPER(p_name) LIKE '%HẠN MỨC%' THEN RETURN 'cap_moi_hmtd'; END IF;
  IF UPPER(p_name) LIKE '%BẢO HIỂM%' AND UPPER(p_name) LIKE '%KHOẢN VAY%' THEN RETURN 'bh_khoan_vay'; END IF;
  IF UPPER(p_name) LIKE '%BẢO HIỂM%' THEN RETURN 'bh_nhan_tho'; END IF;
  IF UPPER(p_name) LIKE '%HUY ĐỘNG%' THEN RETURN 'huy_dong_tang_rong'; END IF;
  IF UPPER(p_name) LIKE '%DƯ NỢ%' AND UPPER(p_name) LIKE '%NGẮN HẠN%' THEN RETURN 'du_no_ngan_han_tang_rong'; END IF;
  IF UPPER(p_name) LIKE '%DƯ NỢ%' AND (UPPER(p_name) LIKE '%TRUNG%' OR UPPER(p_name) LIKE '%DÀI HẠN%') THEN RETURN 'du_no_trung_han_tang_rong'; END IF;
  RETURN 'other_spdv';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4) Cập nhật get_kpi_summary: logic auto-add dựa trên kpi_category thay vì LIKE tên.
DROP FUNCTION IF EXISTS get_kpi_summary(date, date);

CREATE OR REPLACE FUNCTION get_kpi_summary(start_date DATE, end_date DATE)
RETURNS TABLE (
  manager_id UUID,
  full_name TEXT,
  short_name TEXT,
  product_actuals JSONB
) AS $$
BEGIN
  IF end_date = CURRENT_DATE THEN
    PERFORM snapshot_daily_balances();
  END IF;

  RETURN QUERY
  SELECT
    p.id as manager_id,
    p.full_name,
    p.short_name,

    (
      SELECT COALESCE(jsonb_object_agg(csp.id,
        (
          COALESCE(
            (SELECT SUM(csr.result_value)
             FROM cross_sell_records csr
             WHERE csr.product_id = csp.id
               AND csr.agent_id = p.id
               AND csr.status = 'COMPLETED'
               AND csr.sale_date BETWEEN start_date AND end_date),
            0
          )
          +
          CASE kpi_category_of(csp.kpi_category, csp.name)
            WHEN 'cif_moi' THEN
              (SELECT COUNT(*)::DECIMAL FROM customers c WHERE c.assigned_manager_id = p.id AND c.cif_moi IS TRUE AND c.created_at::DATE BETWEEN start_date AND end_date AND c.deleted_at IS NULL)

            WHEN 'huy_dong_tang_rong' THEN
              (
                COALESCE((SELECT dms.total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )

            WHEN 'du_no_ngan_han_tang_rong' THEN
              (
                COALESCE((SELECT dms.total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )

            WHEN 'du_no_trung_han_tang_rong' THEN
              (
                COALESCE((SELECT dms.total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )

            ELSE 0
          END
        )::DECIMAL(15,2)
      ), '{}'::jsonb)
      FROM cross_sell_products csp
    ) as product_actuals

  FROM profiles p
  WHERE p.role = 'USER';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
