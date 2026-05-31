-- ==========================================
-- NEXUS BANKING CRM - RLS POLICIES AUDIT & HARDENING
-- Apply comprehensive Row Level Security to all tables
-- ==========================================

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cross_sell_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cross_sell_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS allowed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_manager_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS manager_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PROFILES: Users can read their own, admins read all
-- ==========================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ==========================================
-- CUSTOMERS: Assigned manager or admin access
-- ==========================================
DROP POLICY IF EXISTS "customers_select_assigned" ON customers;
CREATE POLICY "customers_select_assigned" ON customers
  FOR SELECT USING (
    assigned_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "customers_insert_assigned" ON customers;
CREATE POLICY "customers_insert_assigned" ON customers
  FOR INSERT WITH CHECK (
    assigned_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "customers_update_assigned" ON customers;
CREATE POLICY "customers_update_assigned" ON customers
  FOR UPDATE USING (
    assigned_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  ) WITH CHECK (
    assigned_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

-- ==========================================
-- LOANS: Same as customers (via customer ownership)
-- ==========================================
DROP POLICY IF EXISTS "loans_select_assigned" ON loans;
CREATE POLICY "loans_select_assigned" ON loans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = loans.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

DROP POLICY IF EXISTS "loans_insert_assigned" ON loans;
CREATE POLICY "loans_insert_assigned" ON loans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = loans.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

DROP POLICY IF EXISTS "loans_update_assigned" ON loans;
CREATE POLICY "loans_update_assigned" ON loans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = loans.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = loans.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

-- ==========================================
-- DEPOSITS: Same pattern
-- ==========================================
DROP POLICY IF EXISTS "deposits_select_assigned" ON deposits;
CREATE POLICY "deposits_select_assigned" ON deposits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = deposits.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

DROP POLICY IF EXISTS "deposits_insert_assigned" ON deposits;
CREATE POLICY "deposits_insert_assigned" ON deposits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = deposits.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

DROP POLICY IF EXISTS "deposits_update_assigned" ON deposits;
CREATE POLICY "deposits_update_assigned" ON deposits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = deposits.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = deposits.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

-- ==========================================
-- INTERACTIONS: Same pattern
-- ==========================================
DROP POLICY IF EXISTS "interactions_select_assigned" ON interactions;
CREATE POLICY "interactions_select_assigned" ON interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = interactions.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

DROP POLICY IF EXISTS "interactions_insert_assigned" ON interactions;
CREATE POLICY "interactions_insert_assigned" ON interactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = interactions.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

DROP POLICY IF EXISTS "interactions_update_assigned" ON interactions;
CREATE POLICY "interactions_update_assigned" ON interactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = interactions.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = interactions.customer_id 
      AND (c.assigned_manager_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')))
    )
  );

-- ==========================================
-- CROSS_SELL_RECORDS: Agent or admin
-- ==========================================
DROP POLICY IF EXISTS "cross_sell_records_select_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_select_assigned" ON cross_sell_records
  FOR SELECT USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "cross_sell_records_insert_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_insert_assigned" ON cross_sell_records
  FOR INSERT WITH CHECK (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "cross_sell_records_update_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_update_assigned" ON cross_sell_records
  FOR UPDATE USING (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  ) WITH CHECK (
    agent_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

-- ==========================================
-- ALLOWED_EMAILS: Admin only
-- ==========================================
DROP POLICY IF EXISTS "allowed_emails_admin_only" ON allowed_emails;
CREATE POLICY "allowed_emails_admin_only" ON allowed_emails
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

-- ==========================================
-- PLANS & PLAN_ASSIGNMENTS: Admin write, all read
-- ==========================================
DROP POLICY IF EXISTS "plans_select_all" ON plans;
CREATE POLICY "plans_select_all" ON plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "plans_write_admin" ON plans;
CREATE POLICY "plans_write_admin" ON plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "plan_assignments_select_all" ON plan_assignments;
CREATE POLICY "plan_assignments_select_all" ON plan_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_assignments_write_admin" ON plan_assignments;
CREATE POLICY "plan_assignments_write_admin" ON plan_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

-- ==========================================
-- AUDIT LOGS: Admin read, system write
-- ==========================================
DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

-- ==========================================
-- MANAGER TRANSFER REQUESTS: Involved parties or admin
-- ==========================================
DROP POLICY IF EXISTS "transfer_requests_select" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_select" ON manager_transfer_requests
  FOR SELECT USING (
    from_manager_id = auth.uid() OR
    to_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "transfer_requests_insert" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_insert" ON manager_transfer_requests
  FOR INSERT WITH CHECK (
    from_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

DROP POLICY IF EXISTS "transfer_requests_update" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_update" ON manager_transfer_requests
  FOR UPDATE USING (
    from_manager_id = auth.uid() OR
    to_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  ) WITH CHECK (
    from_manager_id = auth.uid() OR
    to_manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

-- ==========================================
-- SYSTEM_SETTINGS: Admin only
-- ==========================================
DROP POLICY IF EXISTS "system_settings_admin_only" ON system_settings;
CREATE POLICY "system_settings_admin_only" ON system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );

-- ==========================================
-- DAILY_MANAGER_SNAPSHOTS: Read all, write system
-- ==========================================
DROP POLICY IF EXISTS "snapshots_select_all" ON daily_manager_snapshots;
CREATE POLICY "snapshots_select_all" ON daily_manager_snapshots FOR SELECT USING (true);

-- ==========================================
-- CROSS_SELL_PRODUCTS: Read all, write admin
-- ==========================================
DROP POLICY IF EXISTS "products_select_all" ON cross_sell_products;
CREATE POLICY "products_select_all" ON cross_sell_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_write_admin" ON cross_sell_products;
CREATE POLICY "products_write_admin" ON cross_sell_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'))
  );
