-- ==============================================================================
-- FIX SUPABASE SECURITY ADVISOR WARNINGS — 2026-06-17
-- Xử lý các cảnh báo từ Security Advisor (preset=WARN):
--   1. Function Search Path Mutable       (is_admin, kpi_category_of, get_kpi_summary, ...)
--   2. RLS Policy Always True             (public.notifications)
--   3. Public Can Execute SECURITY DEFINER Function   -> REVOKE FROM PUBLIC
--   4. Signed-In Users Can Execute SECURITY DEFINER   -> REVOKE FROM authenticated
--                                                        (chỉ với trigger/admin-only)
--
-- Idempotent: chạy lại nhiều lần đều an toàn. Dùng to_regprocedure() để bỏ qua
-- function không tồn tại trong DB. ALTER FUNCTION không đổi thân hàm nên không
-- ảnh hưởng logic KPI/trigger.
--
-- Chạy trong Supabase SQL Editor, sau đó bấm "Rerun linter" ở Advisors.
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- Helper: set search_path (bỏ qua nếu function không tồn tại)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.fix_search_path(p_signature text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF to_regprocedure(p_signature) IS NULL THEN RETURN; END IF;
  EXECUTE format('ALTER FUNCTION %s SET search_path = public', p_signature);
END;
$$;

-- Helper: thu hồi execute từ 1 role (bỏ qua nếu function không tồn tại)
CREATE OR REPLACE FUNCTION pg_temp.revoke_exec(p_signature text, p_role text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF to_regprocedure(p_signature) IS NULL THEN RETURN; END IF;
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM %I', p_signature, p_role);
END;
$$;

-- Helper: cấp execute cho 1 role (bỏ qua nếu function không tồn tại)
CREATE OR REPLACE FUNCTION pg_temp.grant_exec(p_signature text, p_role text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF to_regprocedure(p_signature) IS NULL THEN RETURN; END IF;
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', p_signature, p_role);
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. FUNCTION SEARCH PATH MUTABLE
-- ----------------------------------------------------------------------------
SELECT pg_temp.fix_search_path('public.is_admin()');
SELECT pg_temp.fix_search_path('public.get_current_user_role()');
SELECT pg_temp.fix_search_path('public.kpi_category_of(text,text)');
SELECT pg_temp.fix_search_path('public.get_kpi_summary(date,date)');
SELECT pg_temp.fix_search_path('public.claim_customer(uuid)');
SELECT pg_temp.fix_search_path('public.clear_activity_keep_customers()');
SELECT pg_temp.fix_search_path('public.snapshot_daily_balances()');
SELECT pg_temp.fix_search_path('public.handle_manager_transfer_approval()');
SELECT pg_temp.fix_search_path('public.protect_profile_privileged_columns()');

-- ----------------------------------------------------------------------------
-- 2. LOCK DOWN EXECUTE GRANTS TRÊN SECURITY DEFINER FUNCTIONS
-- ----------------------------------------------------------------------------

-- 2a. Trigger functions: không bao giờ gọi trực tiếp. Thu hồi PUBLIC + authenticated.
--     (Trigger vẫn chạy bình thường vì thực thi theo quyền owner của bảng.)
SELECT pg_temp.revoke_exec('public.handle_manager_transfer_approval()', 'public');
SELECT pg_temp.revoke_exec('public.handle_manager_transfer_approval()', 'authenticated');
SELECT pg_temp.revoke_exec('public.handle_manager_transfer_approval()', 'anon');
SELECT pg_temp.revoke_exec('public.protect_profile_privileged_columns()', 'public');
SELECT pg_temp.revoke_exec('public.protect_profile_privileged_columns()', 'authenticated');
SELECT pg_temp.revoke_exec('public.protect_profile_privileged_columns()', 'anon');

-- 2b. Admin / server-only: chỉ chạy qua service_role hoặc gọi nội bộ từ function khác.
SELECT pg_temp.revoke_exec('public.clear_activity_keep_customers()', 'public');
SELECT pg_temp.revoke_exec('public.clear_activity_keep_customers()', 'authenticated');
SELECT pg_temp.revoke_exec('public.clear_activity_keep_customers()', 'anon');
SELECT pg_temp.grant_exec ('public.clear_activity_keep_customers()', 'service_role');

SELECT pg_temp.revoke_exec('public.snapshot_daily_balances()', 'public');
SELECT pg_temp.revoke_exec('public.snapshot_daily_balances()', 'authenticated');
SELECT pg_temp.revoke_exec('public.snapshot_daily_balances()', 'anon');
SELECT pg_temp.grant_exec ('public.snapshot_daily_balances()', 'service_role');

-- 2c. RPC hợp lệ cho user đăng nhập: thu hồi PUBLIC/anon, GIỮ authenticated.
--     (Cảnh báo "Signed-In Users Can Execute" với nhóm này là CÓ CHỦ ĐÍCH —
--      app cần gọi được; is_admin/get_current_user_role còn dùng trong RLS.)
SELECT pg_temp.revoke_exec('public.claim_customer(uuid)', 'public');
SELECT pg_temp.revoke_exec('public.claim_customer(uuid)', 'anon');
SELECT pg_temp.grant_exec ('public.claim_customer(uuid)', 'authenticated');

SELECT pg_temp.revoke_exec('public.get_kpi_summary(date,date)', 'public');
SELECT pg_temp.revoke_exec('public.get_kpi_summary(date,date)', 'anon');
SELECT pg_temp.grant_exec ('public.get_kpi_summary(date,date)', 'authenticated');

SELECT pg_temp.revoke_exec('public.is_admin()', 'public');
SELECT pg_temp.revoke_exec('public.is_admin()', 'anon');
SELECT pg_temp.grant_exec ('public.is_admin()', 'authenticated');

SELECT pg_temp.revoke_exec('public.get_current_user_role()', 'public');
SELECT pg_temp.revoke_exec('public.get_current_user_role()', 'anon');
SELECT pg_temp.grant_exec ('public.get_current_user_role()', 'authenticated');

-- kpi_category_of là helper IMMUTABLE (không phải SECURITY DEFINER) — chỉ cần authenticated.
SELECT pg_temp.revoke_exec('public.kpi_category_of(text,text)', 'public');
SELECT pg_temp.revoke_exec('public.kpi_category_of(text,text)', 'anon');
SELECT pg_temp.grant_exec ('public.kpi_category_of(text,text)', 'authenticated');

-- ----------------------------------------------------------------------------
-- 3. RLS POLICY ALWAYS TRUE — public.notifications
--    Dựng lại bộ policy chặt: user chỉ thấy/sửa notification của mình;
--    insert chỉ cho chính mình hoặc admin. Xóa mọi policy "always true" cũ.
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications"   ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own_or_admin"        ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_strict"              ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated"       ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_all"                 ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own"                 ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own"                 ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR (select public.is_admin()));

-- INSERT giữ mở cho authenticated: app tạo thông báo cho NGƯỜI KHÁC từ client
-- (vd lib/supabase/transfers.ts gửi cho quản lý đích + admin khi đề xuất chuyển KH).
-- Siết về user_id = auth.uid() sẽ làm hỏng luồng này. Fix triệt để = chuyển việc
-- tạo notification sang server (service_role) rồi mới siết INSERT.
CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR (select public.is_admin()))
  WITH CHECK (user_id = (select auth.uid()) OR (select public.is_admin()));
