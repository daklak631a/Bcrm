-- DEPRECATED: Script cũ — XÓA CẢ loans/deposits.
-- Nếu chỉ muốn xóa lịch sử tương tác/bán hàng/dự án/kanban và GIỮ KH:
--   → migrations/migration_clear_activity_keep_customers_20260611.sql
--   → hoặc Cài đặt hệ thống → "Xóa lịch sử hoạt động" (Admin L0/L1)

-- Disable triggers temporarily to avoid audit log spam during deletion
SET session_replication_role = 'replica';

TRUNCATE TABLE 
    loans,
    deposits,
    cross_sales,
    cross_sell_records,
    interactions,
    plans,
    plan_assignments,
    weekly_plans,
    daily_plans,
    manager_transfer_requests,
    role_delegations,
    notifications,
    audit_logs,
    daily_manager_snapshots
CASCADE;

SET session_replication_role = 'origin';
