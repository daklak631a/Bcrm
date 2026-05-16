-- 1. Create custom ENUM types for new tables
CREATE TYPE loan_term_type AS ENUM ('SHORT_TERM', 'MEDIUM_LONG_TERM');
CREATE TYPE cross_sale_service AS ENUM ('BIDV_DIRECT', 'LIFE_INSURANCE', 'LOAN_INSURANCE', 'CREDIT_LIMIT_NEW');

-- 2. Add term_type to loans table
ALTER TABLE loans ADD COLUMN term_type loan_term_type DEFAULT 'SHORT_TERM';

-- 3. Create cross_sales table
CREATE TABLE cross_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id),
    service_type cross_sale_service NOT NULL,
    amount DECIMAL(15, 2) DEFAULT 0, -- Tỷ đồng hoặc Triệu đồng tuỳ loại
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cross_sales_manager ON cross_sales(manager_id);
CREATE INDEX idx_cross_sales_date ON cross_sales(recorded_date);

-- Enable RLS on cross_sales
ALTER TABLE cross_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own cross sales or all if admin" ON cross_sales
    FOR SELECT USING (
        manager_id = auth.uid() OR 
        get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
    );

-- 4. Create daily_manager_snapshots table
CREATE TABLE daily_manager_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES profiles(id),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_short_term_loan_balance DECIMAL(15, 2) DEFAULT 0,
    total_medium_term_loan_balance DECIMAL(15, 2) DEFAULT 0,
    total_deposit_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(manager_id, snapshot_date)
);
CREATE INDEX idx_daily_snapshots_manager ON daily_manager_snapshots(manager_id);
CREATE INDEX idx_daily_snapshots_date ON daily_manager_snapshots(snapshot_date);

-- Enable RLS on daily_manager_snapshots
ALTER TABLE daily_manager_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own snapshots or all if admin" ON daily_manager_snapshots
    FOR SELECT USING (
        manager_id = auth.uid() OR 
        get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
    );

-- 5. Function to take snapshot of current balances
CREATE OR REPLACE FUNCTION snapshot_daily_balances()
RETURNS void AS $$
BEGIN
  INSERT INTO daily_manager_snapshots (
    manager_id, 
    snapshot_date, 
    total_short_term_loan_balance, 
    total_medium_term_loan_balance, 
    total_deposit_balance
  )
  SELECT 
    p.id AS manager_id,
    CURRENT_DATE AS snapshot_date,
    (
      SELECT COALESCE(SUM(balance), 0) 
      FROM loans 
      JOIN customers ON loans.customer_id = customers.id 
      WHERE customers.assigned_manager_id = p.id AND loans.status = 'ACTIVE' AND loans.term_type = 'SHORT_TERM'
    ) AS total_short_term_loan_balance,
    (
      SELECT COALESCE(SUM(balance), 0) 
      FROM loans 
      JOIN customers ON loans.customer_id = customers.id 
      WHERE customers.assigned_manager_id = p.id AND loans.status = 'ACTIVE' AND loans.term_type = 'MEDIUM_LONG_TERM'
    ) AS total_medium_term_loan_balance,
    (
      SELECT COALESCE(SUM(amount), 0) 
      FROM deposits 
      JOIN customers ON deposits.customer_id = customers.id 
      WHERE customers.assigned_manager_id = p.id AND deposits.status = 'ACTIVE'
    ) AS total_deposit_balance
  FROM profiles p
  WHERE p.role = 'USER'
  ON CONFLICT (manager_id, snapshot_date) DO UPDATE
  SET 
    total_short_term_loan_balance = EXCLUDED.total_short_term_loan_balance,
    total_medium_term_loan_balance = EXCLUDED.total_medium_term_loan_balance,
    total_deposit_balance = EXCLUDED.total_deposit_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get KPI Summary Table
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
    
    -- 1. CIF MỚI
    (SELECT COUNT(*)::INT FROM customers c 
     WHERE c.assigned_manager_id = p.id AND c.created_at::DATE BETWEEN start_date AND end_date),
     
    -- 2. BIDV DIRECT
    (SELECT COUNT(*)::INT FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'BIDV_DIRECT' AND cs.recorded_date BETWEEN start_date AND end_date),
     
    -- 3. BH NHÂN THỌ
    (SELECT COALESCE(SUM(cs.amount), 0) FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'LIFE_INSURANCE' AND cs.recorded_date BETWEEN start_date AND end_date),
     
    -- 4. BH KHOẢN VAY
    (SELECT COALESCE(SUM(cs.amount), 0) FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'LOAN_INSURANCE' AND cs.recorded_date BETWEEN start_date AND end_date),
     
    -- 5. HUY ĐỘNG TĂNG RÒNG = Snapshot(end_date) - Snapshot(start_date)
    (
      COALESCE((SELECT total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = end_date), 0) -
      COALESCE((SELECT total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = start_date), 0)
    ),
    
    -- 6. DƯ NỢ NGẮN HẠN TĂNG RÒNG
    (
      COALESCE((SELECT total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = end_date), 0) -
      COALESCE((SELECT total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = start_date), 0)
    ),
    
    -- 7. DƯ NỢ TRUNG HẠN TĂNG RÒNG
    (
      COALESCE((SELECT total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = end_date), 0) -
      COALESCE((SELECT total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = start_date), 0)
    ),

    -- 8. CẤP MỚI HMTD
    (SELECT COUNT(*)::INT FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'CREDIT_LIMIT_NEW' AND cs.recorded_date BETWEEN start_date AND end_date)

  FROM profiles p
  WHERE p.role = 'USER';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
