-- =====================================================
-- NEXUS BANKING CRM - FULL MIGRATION (ALL-IN-ONE)
-- IDEMPOTENT: Safe to run multiple times
-- =====================================================

-- =============================================================================
-- PART 1: ENUM TYPES (skip if exists)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('USER', 'ADMIN_LEVEL_2', 'ADMIN_LEVEL_1');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interaction_type AS ENUM ('CALL', 'MEETING', 'SMS', 'EMAIL', 'VISIT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interaction_result AS ENUM ('SUCCESS', 'NO_ANSWER', 'FOLLOW_UP', 'NOT_INTERESTED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('ACTIVE', 'CLOSED', 'DEFAULTED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE deposit_status AS ENUM ('ACTIVE', 'CLOSED', 'MATURED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE loan_term_type AS ENUM ('SHORT_TERM', 'MEDIUM_LONG_TERM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cross_sale_service AS ENUM ('BIDV_DIRECT', 'LIFE_INSURANCE', 'LOAN_INSURANCE', 'CREDIT_LIMIT_NEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================================
-- PART 2: CORE TABLES
-- =============================================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    department_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_dept ON profiles(department_id);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    note TEXT,
    assigned_manager_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_customers_manager ON customers(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(last_name, first_name);

-- LOANS
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    loan_type TEXT,
    loan_amount DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status loan_status NOT NULL DEFAULT 'ACTIVE',
    overdue_days INT NOT NULL DEFAULT 0,
    warning_level TEXT,
    term_type TEXT DEFAULT 'SHORT_TERM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);

-- DEPOSITS
CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL UNIQUE,
    deposit_type TEXT DEFAULT 'Tiết kiệm thường',
    amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0,
    term_months INT DEFAULT 12,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status deposit_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deposits_customer ON deposits(customer_id);
CREATE INDEX IF NOT EXISTS idx_deposits_maturity ON deposits(maturity_date);

-- INTERACTIONS
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id),
    type interaction_type NOT NULL,
    purpose TEXT NOT NULL,
    result interaction_result NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    completion_status BOOLEAN NOT NULL DEFAULT FALSE,
    interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    follow_up_date TIMESTAMPTZ,
    next_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interactions_customer ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_manager ON interactions(manager_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(interaction_date);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- CROSS-SELL PRODUCTS
CREATE TABLE IF NOT EXISTS cross_sell_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Dịch vụ',
    description TEXT,
    target DECIMAL(15, 2) DEFAULT 0,
    metric_type TEXT NOT NULL DEFAULT 'QUANTITY',
    unit_label TEXT NOT NULL DEFAULT 'SL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CROSS-SELL RECORDS
CREATE TABLE IF NOT EXISTS cross_sell_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES cross_sell_products(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    agent_id UUID NOT NULL REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'Pending',
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    result_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cross_sell_records_product ON cross_sell_records(product_id);
CREATE INDEX IF NOT EXISTS idx_cross_sell_records_agent ON cross_sell_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_cross_sell_records_date ON cross_sell_records(sale_date);

-- ALLOWED EMAILS
CREATE TABLE IF NOT EXISTS allowed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    department_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    before_value JSONB,
    after_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);


-- =============================================================================
-- PART 3: KPI TABLES
-- =============================================================================

-- CROSS-SALES (KPI tracking)
CREATE TABLE IF NOT EXISTS cross_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES profiles(id),
    service_type cross_sale_service NOT NULL,
    amount DECIMAL(15, 2) DEFAULT 0,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cross_sales_manager ON cross_sales(manager_id);
CREATE INDEX IF NOT EXISTS idx_cross_sales_date ON cross_sales(recorded_date);

-- DAILY MANAGER SNAPSHOTS
CREATE TABLE IF NOT EXISTS daily_manager_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES profiles(id),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_short_term_loan_balance DECIMAL(15, 2) DEFAULT 0,
    total_medium_term_loan_balance DECIMAL(15, 2) DEFAULT 0,
    total_deposit_balance DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(manager_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_manager ON daily_manager_snapshots(manager_id);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_manager_snapshots(snapshot_date);

-- KPI TARGET CONFIGS
CREATE TABLE IF NOT EXISTS kpi_target_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key TEXT NOT NULL UNIQUE,
    metric_label TEXT NOT NULL,
    target_value DECIMAL(15, 2) DEFAULT 0,
    unit TEXT DEFAULT 'count',
    period TEXT DEFAULT 'monthly',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- PART 4: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sell_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_manager_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Drop ALL existing policies in public schema to prevent legacy conflicts and infinite recursion
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Recreate policies (idempotent since we just dropped them all)

-- PROFILES
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- CUSTOMERS
DROP POLICY IF EXISTS "Users can view their customers or all if admin" ON customers;
CREATE POLICY "Users can view their customers or all if admin" ON customers
  FOR SELECT USING (
    assigned_manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
CREATE POLICY "Authenticated users can insert customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their customers or admins" ON customers;
CREATE POLICY "Users can update their customers or admins" ON customers
  FOR UPDATE USING (
    assigned_manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

DROP POLICY IF EXISTS "Admins can delete customers" ON customers;
CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'));

-- LOANS
DROP POLICY IF EXISTS "Authenticated can read loans" ON loans;
CREATE POLICY "Authenticated can read loans" ON loans
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can insert loans" ON loans;
CREATE POLICY "Authenticated can insert loans" ON loans
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update loans" ON loans;
CREATE POLICY "Authenticated can update loans" ON loans
  FOR UPDATE USING (auth.role() = 'authenticated');

-- DEPOSITS
DROP POLICY IF EXISTS "Authenticated can read deposits" ON deposits;
CREATE POLICY "Authenticated can read deposits" ON deposits
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can insert deposits" ON deposits;
CREATE POLICY "Authenticated can insert deposits" ON deposits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can update deposits" ON deposits;
CREATE POLICY "Authenticated can update deposits" ON deposits
  FOR UPDATE USING (auth.role() = 'authenticated');

-- INTERACTIONS
DROP POLICY IF EXISTS "Users can view their interactions or all if admin" ON interactions;
CREATE POLICY "Users can view their interactions or all if admin" ON interactions
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

DROP POLICY IF EXISTS "Authenticated can insert interactions" ON interactions;
CREATE POLICY "Authenticated can insert interactions" ON interactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their interactions or admins" ON interactions;
CREATE POLICY "Users can update their interactions or admins" ON interactions
  FOR UPDATE USING (
    manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated can insert notifications" ON notifications;
CREATE POLICY "Authenticated can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- CROSS-SELL PRODUCTS
DROP POLICY IF EXISTS "Authenticated can read products" ON cross_sell_products;
CREATE POLICY "Authenticated can read products" ON cross_sell_products
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can insert products" ON cross_sell_products;
CREATE POLICY "Authenticated can insert products" ON cross_sell_products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can delete products" ON cross_sell_products;
CREATE POLICY "Authenticated can delete products" ON cross_sell_products
  FOR DELETE USING (auth.role() = 'authenticated');

-- CROSS-SELL RECORDS
DROP POLICY IF EXISTS "Users can view their records or all if admin" ON cross_sell_records;
CREATE POLICY "Users can view their records or all if admin" ON cross_sell_records
  FOR SELECT USING (
    agent_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

DROP POLICY IF EXISTS "Authenticated can insert records" ON cross_sell_records;
CREATE POLICY "Authenticated can insert records" ON cross_sell_records
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their records or admins" ON cross_sell_records;
CREATE POLICY "Users can update their records or admins" ON cross_sell_records
  FOR UPDATE USING (
    agent_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

-- ALLOWED EMAILS
DROP POLICY IF EXISTS "Admin L1 can manage allowed_emails" ON allowed_emails;
CREATE POLICY "Admin L1 can manage allowed_emails" ON allowed_emails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN_LEVEL_1')
  );

DROP POLICY IF EXISTS "Authenticated can read allowed_emails" ON allowed_emails;
CREATE POLICY "Authenticated can read allowed_emails" ON allowed_emails
  FOR SELECT USING (auth.role() = 'authenticated');

-- CROSS-SALES KPI
DROP POLICY IF EXISTS "Users can view their own cross sales or all if admin" ON cross_sales;
CREATE POLICY "Users can view their own cross sales or all if admin" ON cross_sales
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

DROP POLICY IF EXISTS "Authenticated can insert cross_sales" ON cross_sales;
CREATE POLICY "Authenticated can insert cross_sales" ON cross_sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- DAILY SNAPSHOTS
DROP POLICY IF EXISTS "Users can view their own snapshots or all if admin" ON daily_manager_snapshots;
CREATE POLICY "Users can view their own snapshots or all if admin" ON daily_manager_snapshots
  FOR SELECT USING (
    manager_id = auth.uid() OR 
    get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

-- AUDIT LOGS
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'));

DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- =============================================================================
-- PART 5: KPI FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION snapshot_daily_balances()
RETURNS void AS $$
BEGIN
  INSERT INTO daily_manager_snapshots (
    manager_id, snapshot_date, 
    total_short_term_loan_balance, total_medium_term_loan_balance, total_deposit_balance
  )
  SELECT 
    p.id AS manager_id,
    CURRENT_DATE AS snapshot_date,
    (
      SELECT COALESCE(SUM(balance), 0) FROM loans 
      JOIN customers ON loans.customer_id = customers.id 
      WHERE customers.assigned_manager_id = p.id AND loans.status = 'ACTIVE' AND loans.term_type = 'SHORT_TERM'
    ),
    (
      SELECT COALESCE(SUM(balance), 0) FROM loans 
      JOIN customers ON loans.customer_id = customers.id 
      WHERE customers.assigned_manager_id = p.id AND loans.status = 'ACTIVE' AND loans.term_type = 'MEDIUM_LONG_TERM'
    ),
    (
      SELECT COALESCE(SUM(amount), 0) FROM deposits 
      JOIN customers ON deposits.customer_id = customers.id 
      WHERE customers.assigned_manager_id = p.id AND deposits.status = 'ACTIVE'
    )
  FROM profiles p
  WHERE p.role = 'USER'
  ON CONFLICT (manager_id, snapshot_date) DO UPDATE
  SET 
    total_short_term_loan_balance = EXCLUDED.total_short_term_loan_balance,
    total_medium_term_loan_balance = EXCLUDED.total_medium_term_loan_balance,
    total_deposit_balance = EXCLUDED.total_deposit_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  IF end_date = CURRENT_DATE THEN
    PERFORM snapshot_daily_balances();
  END IF;

  RETURN QUERY
  SELECT 
    p.id as manager_id,
    p.full_name,
    (SELECT COUNT(*)::INT FROM customers c 
     WHERE c.assigned_manager_id = p.id AND c.created_at::DATE BETWEEN start_date AND end_date),
    (SELECT COUNT(*)::INT FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'BIDV_DIRECT' AND cs.recorded_date BETWEEN start_date AND end_date),
    (SELECT COALESCE(SUM(cs.amount), 0) FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'LIFE_INSURANCE' AND cs.recorded_date BETWEEN start_date AND end_date),
    (SELECT COALESCE(SUM(cs.amount), 0) FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'LOAN_INSURANCE' AND cs.recorded_date BETWEEN start_date AND end_date),
    (
      COALESCE((SELECT total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = end_date), 0) -
      COALESCE((SELECT total_deposit_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = start_date), 0)
    ),
    (
      COALESCE((SELECT total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = end_date), 0) -
      COALESCE((SELECT total_short_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = start_date), 0)
    ),
    (
      COALESCE((SELECT total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = end_date), 0) -
      COALESCE((SELECT total_medium_term_loan_balance FROM daily_manager_snapshots dms WHERE dms.manager_id = p.id AND dms.snapshot_date = start_date), 0)
    ),
    (SELECT COUNT(*)::INT FROM cross_sales cs 
     WHERE cs.manager_id = p.id AND cs.service_type = 'CREDIT_LIMIT_NEW' AND cs.recorded_date BETWEEN start_date AND end_date)
  FROM profiles p
  WHERE p.role = 'USER';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- PART 6: SEED DATA
-- =============================================================================

INSERT INTO allowed_emails (email, full_name, role, is_active)
VALUES ('daklak631a@gmail.com', 'Giám Đốc (daklak631a)', 'ADMIN_LEVEL_1', true)
ON CONFLICT (email) DO UPDATE 
SET role = 'ADMIN_LEVEL_1', is_active = true;


-- =====================================================
-- DONE! All tables, indexes, RLS policies, and functions created.
-- 
-- NEXT: Setup Admin profile after first Google login:
--   1. Sign in with Google (will be rejected first time)
--   2. Find UUID: SELECT id FROM auth.users WHERE email = 'daklak631a@gmail.com';
--   3. INSERT INTO profiles (id, email, full_name, role, is_active)
--      VALUES ('UUID', 'daklak631a@gmail.com', 'Giám Đốc', 'ADMIN_LEVEL_1', true);
--   4. Sign in again - done!
-- =====================================================
