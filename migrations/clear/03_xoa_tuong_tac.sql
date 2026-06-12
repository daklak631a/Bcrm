-- =============================================================================
-- 03 — XÓA THÔNG TIN TƯƠNG TÁC
-- =============================================================================
-- Chạy trong Supabase SQL Editor (quyền postgres / service_role).
-- CẢNH BÁO: Không thể hoàn tác.
-- GIỮ NGUYÊN: customers, loans, deposits, KPI / kế hoạch / báo cáo.
--
-- Bao gồm:
--   - interactions          Lịch sử gọi / gặp / SMS / email / thăm KH
--   - support_requests      Kanban hỗ trợ bán hàng
--   - manager_transfer_requests  Yêu cầu chuyển quản lý KH
--
-- Tùy chọn: bỏ comment dòng WHERE để xóa theo cán bộ / khoảng thời gian.
-- =============================================================================

BEGIN;

-- Kanban hỗ trợ (không FK trực tiếp tới interactions)
DELETE FROM public.support_requests;
-- WHERE scheduled_date < CURRENT_DATE - INTERVAL '30 days';

-- Yêu cầu chuyển quản lý
DELETE FROM public.manager_transfer_requests;
-- WHERE customer_id IN (SELECT id FROM public.customers WHERE assigned_manager_id = '...');

-- Lịch sử tương tác
DELETE FROM public.interactions;
-- WHERE manager_id = '00000000-0000-0000-0000-000000000000';
-- WHERE interaction_date >= '2026-01-01' AND interaction_date < '2026-02-01';
-- WHERE customer_id = '00000000-0000-0000-0000-000000000000';

COMMIT;

-- Kiểm tra sau khi chạy:
-- SELECT COUNT(*) FROM public.interactions;
-- SELECT COUNT(*) FROM public.support_requests;
-- SELECT COUNT(*) FROM public.manager_transfer_requests;
