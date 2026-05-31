-- ==========================================
-- NEXUS BANKING CRM - RLS POLICIES AUDIT & HARDENING (FIXED RECURSION)
-- Apply comprehensive Row Level Security to all tables
-- ==========================================

-- 0. Helper Function to check Admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
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
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ==========================================
-- CUSTOMERS: Assigned manager or admin access
-- ==========================================
DROP POLICY IF EXISTS "customers_select_assigned" ON customers;
CREATE POLICY "customers_select_assigned" ON customers
  FOR SELECT USING (assigned_manager_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "customers_insert_assigned" ON customers;
CREATE POLICY "customers_insert_assigned" ON customers
  FOR INSERT WITH CHECK (assigned_manager_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "customers_update_assigned" ON customers;
CREATE POLICY "customers_update_assigned" ON customers
  FOR UPDATE USING (assigned_manager_id = auth.uid() OR is_admin())
  WITH CHECK (assigned_manager_id = auth.uid() OR is_admin());

-- ==========================================
-- LOANS / DEPOSITS / INTERACTIONS: Assigned manager or admin access
-- ==========================================
DROP POLICY IF EXISTS "loans_select_assigned" ON loans;
CREATE POLICY "loans_select_assigned" ON loans
  FOR SELECT USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "loans_insert_assigned" ON loans;
CREATE POLICY "loans_insert_assigned" ON loans
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "loans_update_assigned" ON loans;
CREATE POLICY "loans_update_assigned" ON loans
  FOR UPDATE USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "deposits_select_assigned" ON deposits;
CREATE POLICY "deposits_select_assigned" ON deposits
  FOR SELECT USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "deposits_insert_assigned" ON deposits;
CREATE POLICY "deposits_insert_assigned" ON deposits
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "deposits_update_assigned" ON deposits;
CREATE POLICY "deposits_update_assigned" ON deposits
  FOR UPDATE USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "interactions_select_assigned" ON interactions;
CREATE POLICY "interactions_select_assigned" ON interactions
  FOR SELECT USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "interactions_insert_assigned" ON interactions;
CREATE POLICY "interactions_insert_assigned" ON interactions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

DROP POLICY IF EXISTS "interactions_update_assigned" ON interactions;
CREATE POLICY "interactions_update_assigned" ON interactions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = auth.uid() OR is_admin())));

-- ==========================================
-- CROSS_SELL_RECORDS: Agent or admin
-- ==========================================
DROP POLICY IF EXISTS "cross_sell_records_select_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_select_assigned" ON cross_sell_records
  FOR SELECT USING (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "cross_sell_records_insert_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_insert_assigned" ON cross_sell_records
  FOR INSERT WITH CHECK (agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "cross_sell_records_update_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_update_assigned" ON cross_sell_records
  FOR UPDATE USING (agent_id = auth.uid() OR is_admin())
  WITH CHECK (agent_id = auth.uid() OR is_admin());

-- ==========================================
-- ADMIN ONLY TABLES
-- ==========================================
DROP POLICY IF EXISTS "allowed_emails_admin_only" ON allowed_emails;
CREATE POLICY "allowed_emails_admin_only" ON allowed_emails FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "plans_write_admin" ON plans;
CREATE POLICY "plans_write_admin" ON plans FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "plan_assignments_write_admin" ON plan_assignments;
CREATE POLICY "plan_assignments_write_admin" ON plan_assignments FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "system_settings_admin_only" ON system_settings;
CREATE POLICY "system_settings_admin_only" ON system_settings FOR ALL USING (is_admin());

-- ==========================================
-- READ ALL TABLES
-- ==========================================
DROP POLICY IF EXISTS "plans_select_all" ON plans;
CREATE POLICY "plans_select_all" ON plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_assignments_select_all" ON plan_assignments;
CREATE POLICY "plan_assignments_select_all" ON plan_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "snapshots_select_all" ON daily_manager_snapshots;
CREATE POLICY "snapshots_select_all" ON daily_manager_snapshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_select_all" ON cross_sell_products;
CREATE POLICY "products_select_all" ON cross_sell_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_write_admin" ON cross_sell_products;
CREATE POLICY "products_write_admin" ON cross_sell_products FOR ALL USING (is_admin());

-- ==========================================
-- MANAGER TRANSFER REQUESTS: Involved parties or admin
-- ==========================================
DROP POLICY IF EXISTS "transfer_requests_select" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_select" ON manager_transfer_requests
  FOR SELECT USING (requester_id = auth.uid() OR target_manager_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "transfer_requests_insert" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_insert" ON manager_transfer_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "transfer_requests_update" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_update" ON manager_transfer_requests
  FOR UPDATE USING (requester_id = auth.uid() OR target_manager_id = auth.uid() OR is_admin())
  WITH CHECK (requester_id = auth.uid() OR target_manager_id = auth.uid() OR is_admin());
