-- =============================================================================
-- 01 — XÓA KHÁCH HÀNG (customers) và dữ liệu phụ thuộc
-- =============================================================================
-- Chạy trong Supabase SQL Editor (quyền postgres / service_role).
-- CẢNH BÁO: Không thể hoàn tác. Giữ nguyên profiles, cross_sell_products,
--           system_settings, allowed_emails.
--
-- Xóa kèm theo (ON DELETE CASCADE): loans, deposits, interactions, cross_sales
-- Yêu cầu chuyển quản lý: manager_transfer_requests (CASCADE)
-- Bản ghi bán hàng gắn KH: cross_sell_records (SET NULL → xóa trước khi xóa KH)
--
-- Tùy chọn: bỏ comment dòng WHERE để xóa theo điều kiện.
-- =============================================================================

BEGIN;

-- 1. Yêu cầu chuyển quản lý khách hàng
DELETE FROM public.manager_transfer_requests;
-- WHERE customer_id IN (SELECT id FROM public.customers WHERE ...);

-- 2. Bản ghi bán hàng có liên kết khách hàng (batch không có KH vẫn giữ)
DELETE FROM public.cross_sell_records
WHERE customer_id IS NOT NULL;
-- AND sale_date >= '2026-01-01';

-- 3. Xóa toàn bộ khách hàng → CASCADE: loans, deposits, interactions, cross_sales
DELETE FROM public.customers;
-- WHERE assigned_manager_id = '00000000-0000-0000-0000-000000000000';
-- WHERE deleted_at IS NOT NULL;  -- chỉ KH đã soft-delete

COMMIT;

-- Kiểm tra sau khi chạy:
-- SELECT COUNT(*) FROM public.customers;
-- SELECT COUNT(*) FROM public.loans;
-- SELECT COUNT(*) FROM public.deposits;
