-- Xóa lịch sử tương tác / bán hàng / kế hoạch / kanban — GIỮ NGUYÊN customers (+ loans, deposits).
-- Chạy trong Supabase SQL Editor hoặc qua API POST /api/admin/clear-activity-data (Admin L0/L1).

CREATE OR REPLACE FUNCTION public.clear_activity_keep_customers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  n bigint;
BEGIN
  DELETE FROM public.support_requests;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('support_requests', n);

  DELETE FROM public.cross_sell_records;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('cross_sell_records', n);

  DELETE FROM public.cross_sales;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('cross_sales', n);

  DELETE FROM public.interactions;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('interactions', n);

  DELETE FROM public.plan_assignments;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('plan_assignments', n);

  DELETE FROM public.weekly_plans;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('weekly_plans', n);

  DELETE FROM public.daily_plans;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('daily_plans', n);

  DELETE FROM public.plans;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('plans', n);

  DELETE FROM public.notifications;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('notifications', n);

  DELETE FROM public.daily_manager_snapshots;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('daily_manager_snapshots', n);

  DELETE FROM public.manager_transfer_requests;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('manager_transfer_requests', n);

  DELETE FROM public.audit_logs;
  GET DIAGNOSTICS n = ROW_COUNT;
  result := result || jsonb_build_object('audit_logs', n);

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_activity_keep_customers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_activity_keep_customers() TO service_role;
