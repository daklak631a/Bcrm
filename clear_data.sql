-- Script to clear all user-inputted transactional data
-- Run this in the Supabase SQL Editor

-- Disable triggers temporarily to avoid audit log spam during deletion
SET session_replication_role = 'replica';

-- Truncate all transactional tables, keeping profiles, products, and system configurations
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
    support_requests,
    role_delegations,
    notifications,
    audit_logs,
    daily_manager_snapshots
CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Note:
-- The profiles table is NOT truncated so users can still log in.
-- The products table is NOT truncated so your product catalog remains.
-- The system_settings table is NOT truncated so your dynamic KPI configs remain.
