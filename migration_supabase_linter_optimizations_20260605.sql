-- ==============================================================================
-- NEXUS BANKING CRM - LINTER FOLLOW-UP OPTIMIZATIONS
-- Date: 2026-06-05
-- Resolves: 
-- 1. Moving pg_trgm out of public schema.
-- 2. Revoking PUBLIC EXECUTE on SECURITY DEFINER functions.
-- 3. Fixing public.notifications permissive INSERT.
-- 4. Optimizing RLS performance with (select auth.uid()).
-- ==============================================================================

-- 1. Move pg_trgm to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 2. Revoke PUBLIC EXECUTE for SECURITY DEFINER functions
DO $$
DECLARE
    func text;
BEGIN
    FOR func IN 
        SELECT oid::regprocedure::text
        FROM pg_proc
        WHERE proname IN ('is_admin', 'get_current_user_role', 'get_kpi_summary', 'snapshot_daily_balances', 'handle_manager_transfer_approval')
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', func);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', func);
    END LOOP;
END;
$$;

-- 3. Update is_admin() to also use the optimized (select auth.uid())
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid())
    AND role IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix public.notifications permissive policy
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own_or_admin" ON public.notifications;

CREATE POLICY "notifications_insert_strict" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) OR (select public.is_admin())
  );

-- ==============================================================================
-- 5. RLS Performance Optimization: Wrap auth.uid() & is_admin() in (select ...)
-- ==============================================================================

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_select_assigned" ON customers;
CREATE POLICY "customers_select_assigned" ON customers FOR SELECT USING (assigned_manager_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS "customers_insert_assigned" ON customers;
CREATE POLICY "customers_insert_assigned" ON customers FOR INSERT WITH CHECK (assigned_manager_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS "customers_update_assigned" ON customers;
CREATE POLICY "customers_update_assigned" ON customers FOR UPDATE USING (assigned_manager_id = (select auth.uid()) OR (select public.is_admin())) WITH CHECK (assigned_manager_id = (select auth.uid()) OR (select public.is_admin()));

-- LOANS
DROP POLICY IF EXISTS "loans_select_assigned" ON loans;
CREATE POLICY "loans_select_assigned" ON loans FOR SELECT USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

DROP POLICY IF EXISTS "loans_insert_assigned" ON loans;
CREATE POLICY "loans_insert_assigned" ON loans FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

DROP POLICY IF EXISTS "loans_update_assigned" ON loans;
CREATE POLICY "loans_update_assigned" ON loans FOR UPDATE USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin())))) WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = loans.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

-- DEPOSITS
DROP POLICY IF EXISTS "deposits_select_assigned" ON deposits;
CREATE POLICY "deposits_select_assigned" ON deposits FOR SELECT USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

DROP POLICY IF EXISTS "deposits_insert_assigned" ON deposits;
CREATE POLICY "deposits_insert_assigned" ON deposits FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

DROP POLICY IF EXISTS "deposits_update_assigned" ON deposits;
CREATE POLICY "deposits_update_assigned" ON deposits FOR UPDATE USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin())))) WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = deposits.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

-- INTERACTIONS
DROP POLICY IF EXISTS "interactions_select_assigned" ON interactions;
CREATE POLICY "interactions_select_assigned" ON interactions FOR SELECT USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

DROP POLICY IF EXISTS "interactions_insert_assigned" ON interactions;
CREATE POLICY "interactions_insert_assigned" ON interactions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

DROP POLICY IF EXISTS "interactions_update_assigned" ON interactions;
CREATE POLICY "interactions_update_assigned" ON interactions FOR UPDATE USING (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin())))) WITH CHECK (EXISTS (SELECT 1 FROM customers c WHERE c.id = interactions.customer_id AND (c.assigned_manager_id = (select auth.uid()) OR (select public.is_admin()))));

-- CROSS_SELL_RECORDS
DROP POLICY IF EXISTS "cross_sell_records_select_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_select_assigned" ON cross_sell_records FOR SELECT USING (agent_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS "cross_sell_records_insert_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_insert_assigned" ON cross_sell_records FOR INSERT WITH CHECK (agent_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS "cross_sell_records_update_assigned" ON cross_sell_records;
CREATE POLICY "cross_sell_records_update_assigned" ON cross_sell_records FOR UPDATE USING (agent_id = (select auth.uid()) OR (select public.is_admin())) WITH CHECK (agent_id = (select auth.uid()) OR (select public.is_admin()));

-- MANAGER_TRANSFER_REQUESTS
DROP POLICY IF EXISTS "transfer_requests_select" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_select" ON manager_transfer_requests FOR SELECT USING (requester_id = (select auth.uid()) OR target_manager_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS "transfer_requests_insert" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_insert" ON manager_transfer_requests FOR INSERT WITH CHECK (requester_id = (select auth.uid()) OR (select public.is_admin()));

DROP POLICY IF EXISTS "transfer_requests_update" ON manager_transfer_requests;
CREATE POLICY "transfer_requests_update" ON manager_transfer_requests FOR UPDATE USING (requester_id = (select auth.uid()) OR target_manager_id = (select auth.uid()) OR (select public.is_admin())) WITH CHECK (requester_id = (select auth.uid()) OR target_manager_id = (select auth.uid()) OR (select public.is_admin()));

-- ADMIN ONLY TABLES
DROP POLICY IF EXISTS "allowed_emails_admin_only" ON allowed_emails;
CREATE POLICY "allowed_emails_admin_only" ON allowed_emails FOR ALL USING ((select public.is_admin()));

DROP POLICY IF EXISTS "plans_write_admin" ON plans;
CREATE POLICY "plans_write_admin" ON plans FOR ALL USING ((select public.is_admin()));

DROP POLICY IF EXISTS "plan_assignments_write_admin" ON plan_assignments;
CREATE POLICY "plan_assignments_write_admin" ON plan_assignments FOR ALL USING ((select public.is_admin()));

DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING ((select public.is_admin()));

DROP POLICY IF EXISTS "system_settings_admin_only" ON system_settings;
CREATE POLICY "system_settings_admin_only" ON system_settings FOR ALL USING ((select public.is_admin()));

DROP POLICY IF EXISTS "products_write_admin" ON cross_sell_products;
CREATE POLICY "products_write_admin" ON cross_sell_products FOR ALL USING ((select public.is_admin()));
