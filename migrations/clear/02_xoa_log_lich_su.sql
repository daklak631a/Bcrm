-- =============================================================================
-- 02 — XÓA LOG LỊCH SỬ (audit_logs)
-- =============================================================================
-- Chạy trong Supabase SQL Editor (quyền postgres / service_role).
-- CẢNH BÁO: Không thể hoàn tác. Chỉ xóa nhật ký thao tác hệ thống.
-- Không ảnh hưởng dữ liệu nghiệp vụ (KH, tương tác, KPI, ...).
--
-- Tùy chọn: bỏ comment dòng WHERE để xóa theo thời gian / loại thực thể.
-- =============================================================================

BEGIN;

DELETE FROM public.audit_logs;
-- WHERE created_at < NOW() - INTERVAL '90 days';
-- WHERE entity_type IN ('CUSTOMER', 'INTERACTION', 'LOAN');
-- WHERE user_id = '00000000-0000-0000-0000-000000000000';

COMMIT;

-- (Tùy chọn) Xóa thêm thông báo hệ thống — bỏ comment nếu cần:
-- BEGIN;
-- DELETE FROM public.notifications;
-- COMMIT;

-- Kiểm tra sau khi chạy:
-- SELECT COUNT(*) FROM public.audit_logs;
