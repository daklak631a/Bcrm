-- ==========================================
-- NEXUS BANKING CRM - DYNAMIC KPI SUMMARY
-- ==========================================

-- 1. Add JSONB column to plan_assignments if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plan_assignments' AND column_name = 'product_targets') THEN
    ALTER TABLE plan_assignments ADD COLUMN product_targets JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 2. Drop the old function
DROP FUNCTION IF EXISTS get_kpi_summary(date, date);

-- 3. Create the new dynamic function
CREATE OR REPLACE FUNCTION get_kpi_summary(start_date DATE, end_date DATE)
RETURNS TABLE (
  manager_id UUID,
  full_name TEXT,
  short_name TEXT,
  product_actuals JSONB
) AS $$
BEGIN
  -- Đảm bảo snapshot dữ liệu mới nhất cho ngày hôm nay nếu end_date là hôm nay
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
          -- Tổng từ cross_sell_records
          COALESCE(
            (SELECT SUM(csr.result_value) 
             FROM cross_sell_records csr 
             WHERE csr.product_id = csp.id 
               AND csr.agent_id = p.id 
               AND csr.status = 'COMPLETED' 
               AND csr.sale_date BETWEEN start_date AND end_date), 
            0
          )
          -- Cấu hình logic cộng thêm tự động từ hệ thống
          + 
          CASE 
            -- CIF MỚI: Cộng thêm khách hàng tạo trên CRM
            WHEN UPPER(csp.name) LIKE '%CIF MỚI%' THEN 
              (SELECT COUNT(*)::DECIMAL FROM customers c WHERE c.assigned_manager_id = p.id AND c.created_at::DATE BETWEEN start_date AND end_date AND c.deleted_at IS NULL)
            
            -- HUY ĐỘNG: Cộng thêm chênh lệch Snapshot
            WHEN UPPER(csp.name) LIKE '%HUY ĐỘNG%' THEN 
              (
                COALESCE((SELECT dms.total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )
            
            -- DƯ NỢ NGẮN HẠN: Cộng thêm chênh lệch Snapshot
            WHEN UPPER(csp.name) LIKE '%DƯ NỢ%' AND UPPER(csp.name) LIKE '%NGẮN HẠN%' THEN 
              (
                COALESCE((SELECT dms.total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )
            
            -- DƯ NỢ TRUNG HẠN: Cộng thêm chênh lệch Snapshot
            WHEN UPPER(csp.name) LIKE '%DƯ NỢ%' AND (UPPER(csp.name) LIKE '%TRUNG%' OR UPPER(csp.name) LIKE '%DÀI HẠN%') THEN 
              (
                COALESCE((SELECT dms.total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0) -
                COALESCE((SELECT dms.total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date ORDER BY dms.snapshot_date DESC LIMIT 1), 0)
              )
            
            ELSE 0 
          END
        )::DECIMAL(15,2)
      ), '{}'::jsonb)
      FROM cross_sell_products csp
      -- Lấy tất cả products kể cả bị ẩn (is_active=false) nếu đã từng có dữ liệu? 
      -- Thường thì KPI lấy tất cả để hiển thị đúng. Bỏ lọc is_active để tránh lỗi mất cột.
    ) as product_actuals

  FROM profiles p
  WHERE p.role = 'USER';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
