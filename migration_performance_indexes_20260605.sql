-- Performance indexes for BCRM operational screens.
-- Safe to run more than once. These indexes target frequent filters/sorts used by
-- dashboard, customer, sales, interaction, KPI, notification, and delegation flows.

CREATE INDEX IF NOT EXISTS idx_customers_active_created
  ON public.customers (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_manager_active_created
  ON public.customers (assigned_manager_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_cif_active
  ON public.customers (cif_code)
  WHERE deleted_at IS NULL AND cif_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loans_customer_created
  ON public.loans (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_loans_status_created
  ON public.loans (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposits_customer_created
  ON public.deposits (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deposits_status_created
  ON public.deposits (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_manager_date
  ON public.interactions (manager_id, interaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_customer_date
  ON public.interactions (customer_id, interaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_result_date
  ON public.interactions (result, interaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_cross_sell_records_agent_sale_date
  ON public.cross_sell_records (agent_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_cross_sell_records_customer_sale_date
  ON public.cross_sell_records (customer_id, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_cross_sell_records_status_sale_date
  ON public.cross_sell_records (status, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_cross_sell_records_batch_unallocated
  ON public.cross_sell_records (agent_id, sale_date DESC)
  WHERE is_batch_entry = true AND is_allocated = false;

CREATE INDEX IF NOT EXISTS idx_plan_assignments_plan_updated
  ON public.plan_assignments (plan_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_assignments_user_updated
  ON public.plan_assignments (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_plans_target_created
  ON public.plans (target_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_start
  ON public.weekly_plans (user_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user_target
  ON public.daily_plans (user_id, target_date);

CREATE INDEX IF NOT EXISTS idx_daily_manager_snapshots_manager_date
  ON public.daily_manager_snapshots (manager_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_manager_transfer_requests_status_created
  ON public.manager_transfer_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_role_delegations_delegatee_active_dates
  ON public.role_delegations (delegatee_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_support_requests_requester_created
  ON public.support_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_requests_admin_created
  ON public.support_requests (support_admin_id, created_at DESC);
