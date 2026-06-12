-- =============================================================================
-- 04 — XÓA KPI NGÀY, BÁO CÁO TỔNG HỢP, GIAO KPI
-- =============================================================================
-- Chạy trong Supabase SQL Editor (quyền postgres / service_role).
-- CẢNH BÁO: Không thể hoàn tác.
-- GIỮ NGUYÊN: customers, loans, deposits, interactions, profiles,
--             cross_sell_products (danh mục sản phẩm KPI).
--
-- Bao gồm:
--   - daily_plans              KPI / kế hoạch ngày (cá nhân)
--   - weekly_plans             KPI / kế hoạch tuần (cá nhân)
--   - plan_assignments         Phân công KPI (giao KPI cho cán bộ)
--   - plans                    Kế hoạch / dự án tổng (Admin giao KPI)
--   - daily_manager_snapshots  Snapshot số dư phục vụ báo cáo tổng hợp
--   - cross_sell_records       Thực hiện bán hàng (actual KPI động)
--   - cross_sales              Ghi nhận bán hàng KPI (BIDV Direct, BH, ...)
--
-- Hàm get_kpi_summary() tính từ các bảng trên — sau khi xóa, báo cáo = 0.
--
-- Tùy chọn: bỏ comment dòng WHERE hoặc khối kpi_target_configs nếu cần.
-- =============================================================================

BEGIN;

-- Phân công trước (FK → plans)
DELETE FROM public.plan_assignments;
-- WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Kế hoạch cá nhân
DELETE FROM public.daily_plans;
-- WHERE target_date >= '2026-01-01';

DELETE FROM public.weekly_plans;
-- WHERE start_date >= '2026-01-01';

-- Kế hoạch / giao KPI (Admin)
DELETE FROM public.plans;
-- WHERE target_date >= '2026-01-01';

-- Dữ liệu thực hiện & snapshot phục vụ báo cáo tổng hợp
DELETE FROM public.cross_sell_records;
-- WHERE sale_date >= '2026-01-01';

DELETE FROM public.cross_sales;
-- WHERE recorded_date >= '2026-01-01';

DELETE FROM public.daily_manager_snapshots;
-- WHERE snapshot_date >= '2026-01-01';

-- (Tùy chọn) Xóa cấu hình chỉ tiêu KPI mặc định — bỏ comment nếu muốn reset cả cấu hình:
-- DELETE FROM public.kpi_target_configs;

COMMIT;

-- Kiểm tra sau khi chạy:
-- SELECT COUNT(*) FROM public.daily_plans;
-- SELECT COUNT(*) FROM public.weekly_plans;
-- SELECT COUNT(*) FROM public.plans;
-- SELECT COUNT(*) FROM public.plan_assignments;
-- SELECT COUNT(*) FROM public.daily_manager_snapshots;
-- SELECT COUNT(*) FROM public.cross_sell_records;
-- SELECT COUNT(*) FROM public.cross_sales;
