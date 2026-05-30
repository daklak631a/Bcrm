-- ==========================================
-- NEXUS BANKING CRM - UPDATE KPI SUMMARY RPC
-- Run this in the Supabase SQL Editor to sync Dashboard with actual Sales
-- ==========================================

CREATE OR REPLACE FUNCTION get_kpi_summary(start_date DATE, end_date DATE)
RETURNS TABLE (
  manager_id UUID,
  full_name TEXT,
  cif_moi INT,
  bidv_direct INT,
  bh_nhan_tho DECIMAL(15,2),
  bh_khoan_vay DECIMAL(15,2),
  huy_dong_tang_rong DECIMAL(15,2),
  du_no_ngan_han_tang_rong DECIMAL(15,2),
  du_no_trung_han_tang_rong DECIMAL(15,2),
  cap_moi_hmtd INT
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
    
    -- 1. CIF MỚI (Loại bỏ khách hàng đã xóa soft delete)
    (SELECT COUNT(*)::INT 
     FROM customers c 
     WHERE c.assigned_manager_id = p.id 
       AND c.created_at::DATE BETWEEN start_date AND end_date
       AND c.deleted_at IS NULL),
     
    -- 2. BIDV DIRECT (Đăng ký BIDV Direct thành công, bao gồm giao dịch đơn và lô đã phân bổ)
    (SELECT COALESCE(COUNT(*), 0)::INT 
     FROM cross_sell_records csr
     JOIN cross_sell_products csp ON csr.product_id = csp.id
     WHERE csr.agent_id = p.id 
       AND csr.status = 'COMPLETED'
       AND (csr.is_batch_entry = false OR csr.is_allocated = true)
       AND UPPER(csp.name) LIKE '%DIRECT%'
       AND csr.sale_date BETWEEN start_date AND end_date),
     
    -- 3. BH NHÂN THỌ (Bảo hiểm nhân thọ, tính bằng tổng số tiền thực tế - Triệu đồng)
    (SELECT COALESCE(SUM(csr.result_value), 0)::DECIMAL(15,2)
     FROM cross_sell_records csr
     JOIN cross_sell_products csp ON csr.product_id = csp.id
     WHERE csr.agent_id = p.id 
       AND csr.status = 'COMPLETED'
       AND (csr.is_batch_entry = false OR csr.is_allocated = true)
       AND (UPPER(csp.name) LIKE '%NHÂN THỌ%' OR UPPER(csp.name) LIKE '%LIFE%')
       AND csr.sale_date BETWEEN start_date AND end_date),
     
    -- 4. BH KHOẢN VAY (Bảo hiểm khoản vay phi nhân thọ - Triệu đồng)
    (SELECT COALESCE(SUM(csr.result_value), 0)::DECIMAL(15,2)
     FROM cross_sell_records csr
     JOIN cross_sell_products csp ON csr.product_id = csp.id
     WHERE csr.agent_id = p.id 
       AND csr.status = 'COMPLETED'
       AND (csr.is_batch_entry = false OR csr.is_allocated = true)
       AND (UPPER(csp.name) LIKE '%KHOẢN VAY%' OR UPPER(csp.name) LIKE '%NON-LIFE%')
       AND csr.sale_date BETWEEN start_date AND end_date),
     
    -- 5. HUY ĐỘNG TĂNG RÒNG (Lấy chênh lệch snapshot gần nhất trước/bằng ngày cuối và ngày đầu)
    (
      COALESCE((
        SELECT dms.total_deposit_balance 
        FROM daily_manager_snapshots dms 
        WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date 
        ORDER BY dms.snapshot_date DESC 
        LIMIT 1
      ), 0) -
      COALESCE((
        SELECT dms.total_deposit_balance 
        FROM daily_manager_snapshots dms 
        WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date 
        ORDER BY dms.snapshot_date DESC 
        LIMIT 1
      ), 0)
    ),
    
    -- 6. DƯ NỢ NGẮN HẠN TĂNG RÒNG
    (
      COALESCE((
        SELECT dms.total_short_term_loan_balance 
        FROM daily_manager_snapshots dms 
        WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date 
        ORDER BY dms.snapshot_date DESC 
        LIMIT 1
      ), 0) -
      COALESCE((
        SELECT dms.total_short_term_loan_balance 
        FROM daily_manager_snapshots dms 
        WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date 
        ORDER BY dms.snapshot_date DESC 
        LIMIT 1
      ), 0)
    ),
    
    -- 7. DƯ NỢ TRUNG HẠN TĂNG RÒNG
    (
      COALESCE((
        SELECT dms.total_medium_term_loan_balance 
        FROM daily_manager_snapshots dms 
        WHERE dms.manager_id = p.id AND dms.snapshot_date <= end_date 
        ORDER BY dms.snapshot_date DESC 
        LIMIT 1
      ), 0) -
      COALESCE((
        SELECT dms.total_medium_term_loan_balance 
        FROM daily_manager_snapshots dms 
        WHERE dms.manager_id = p.id AND dms.snapshot_date <= start_date 
        ORDER BY dms.snapshot_date DESC 
        LIMIT 1
      ), 0)
    ),

    -- 8. CẤP MỚI HMTD (Đăng ký hạn mức tín dụng thành công)
    (SELECT COALESCE(COUNT(*), 0)::INT 
     FROM cross_sell_records csr
     JOIN cross_sell_products csp ON csr.product_id = csp.id
     WHERE csr.agent_id = p.id 
       AND csr.status = 'COMPLETED'
       AND (csr.is_batch_entry = false OR csr.is_allocated = true)
       AND UPPER(csp.name) LIKE '%HMTD%'
       AND csr.sale_date BETWEEN start_date AND end_date)

  FROM profiles p
  WHERE p.role = 'USER';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
