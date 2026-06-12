# Database Migrations — BCRM 2.0

Thư mục chứa toàn bộ script SQL cho Supabase (PostgreSQL). Chạy trong **Supabase SQL Editor** hoặc qua CLI với quyền `postgres` / `service_role`.

## Cấu trúc thư mục

```
migrations/
├── 00-bootstrap/     # Khởi tạo schema (DB mới)
├── 01-core/          # Tính năng nghiệp vụ (chạy tuần tự)
├── 02-security/      # RLS, hardening, phân quyền
├── 03-performance/   # Index, linter, scale, RPC
├── 04-seeds/         # Dữ liệu mẫu (sản phẩm KPI)
├── 05-maintenance/   # RPC bảo trì (clear activity, …)
├── clear/            # Script xóa dữ liệu theo nhóm (xem clear/README.md)
└── deprecated/       # Script cũ — không dùng
```

## DB mới — cài đặt nhanh

**Cách 1 (khuyến nghị):** Chạy một file bootstrap idempotent:

```
migrations/00-bootstrap/full_migration.sql
```

Sau đó chạy **tuần tự** các file trong `01-core/`, `02-security/`, `03-performance/` theo bảng bên dưới (bỏ qua file đã được gộp trong `full_migration` nếu bảng/RLS đã tồn tại — hầu hết file dùng `IF NOT EXISTS`).

**Cách 2 (legacy):** Chỉ dùng khi cần tham chiếu lịch sử:

```
00-bootstrap/supabase_migration_base.sql   → supabase_migration_kpi.sql → supabase_migration_admin.sql
```

## DB đã có — migration tuần tự

Chạy **theo thứ tự** trong từng nhóm. Bỏ qua file đã chạy trước đó.

### 01-core (nghiệp vụ)

| # | File | Mô tả |
|---|------|-------|
| 1 | `migration_customer_full_name.sql` | Gộp first/last name → full_name |
| 2 | `add_short_name.sql` | Tên viết tắt cán bộ |
| 3 | `add_missing_loan_deposit_columns.sql` | Cột bổ sung loans/deposits |
| 4 | `fix_department_id_type.sql` | Sửa kiểu department_id |
| 5 | `migration_cif_and_officer_slug.sql` | Mã CIF, slug cán bộ |
| 6 | `migration_cross_sell_products.sql` | Cột sản phẩm trên customers |
| 7 | `migration_financial_and_cross_sell.sql` | Cross-sell tài chính |
| 8 | `migration_product_metrics.sql` | Metric sản phẩm |
| 9 | `migration_b2b.sql` | Khách hàng doanh nghiệp |
| 10 | `migration_b2b_loans.sql` | Vay B2B |
| 11 | `migration_batch_sales.sql` | Bán hàng theo lô |
| 12 | `migration_weekly_daily_plans.sql` | KPI tuần / ngày |
| 13 | `migration_plan_assignment_product_targets.sql` | Target sản phẩm trên plan |
| 14 | `migration_dynamic_kpi.sql` | RPC get_kpi_summary động |
| 15 | `update_get_kpi_summary.sql` | Cập nhật RPC KPI |
| 16 | `migration_support_requests.sql` | Kanban hỗ trợ bán |
| 17 | `migration_manager_transfer_requests.sql` | Chuyển quản lý KH |
| 18 | `migration_workflow_configs.sql` | Cấu hình workflow |
| 19 | `migration_system_settings.sql` | Cài đặt hệ thống |
| 20 | `migration_roles_and_delegation.sql` | Ủy quyền vai trò |

### 02-security

| # | File | Mô tả |
|---|------|-------|
| 1 | `migration_admin_level_0.sql` | Role ADMIN_LEVEL_0 |
| 2 | `migration_plans_rls_policies.sql` | RLS plans |
| 3 | `migration_rls_policies_audit.sql` | RLS audit_logs |
| 4 | `migration_security_hardening_support_delegations.sql` | Hardening support/delegation |
| 5 | `migration_security_hardening_profiles_plans_20260610.sql` | Hardening profiles/plans |
| 6 | `migration_security_definer_search_path_20260605.sql` | search_path cho SECURITY DEFINER |

### 03-performance

| # | File | Mô tả |
|---|------|-------|
| 1 | `migration_supabase_linter_fixes_20260605.sql` | Sửa cảnh báo linter |
| 2 | `migration_supabase_linter_optimizations_20260605.sql` | Tối ưu RLS/policy |
| 3 | `migration_supabase_linter_followup_safe_20260605.sql` | Follow-up an toàn |
| 4 | `migration_performance_indexes_20260605.sql` | Index hiệu năng |
| 5 | `migration_scale_customers_users_20260605.sql` | Scale KH/user |
| 6 | `migration_rpc_claim_customer_20260605.sql` | RPC claim customer |

### 04-seeds

| File | Mô tả |
|------|-------|
| `seed_products.sql` | Danh mục sản phẩm KPI mặc định |

Hoặc chạy từ Node: `node scripts/seed_products.js` (cần `.env.local`).

### 05-maintenance

| File | Mô tả |
|------|-------|
| `migration_clear_activity_keep_customers_20260611.sql` | RPC `clear_activity_keep_customers()` — dùng bởi Cài đặt → Xóa lịch sử hoạt động |

## Xóa dữ liệu

Xem [clear/README.md](./clear/README.md).

## Pilot B2B (schema riêng)

Không nằm trong `migrations/`. Schema thử nghiệm: [docs/pilot/advanced-crm-pilot-migration.sql](../docs/pilot/advanced-crm-pilot-migration.sql) — chạy trên **Supabase project riêng**, không dùng chung production.

## Lưu ý

- Luôn **backup** trước khi chạy script xóa hoặc trên production.
- File trong `deprecated/` không dùng cho môi trường mới.
- Sau migration lớn: `npm run gen:types` để cập nhật `types/database.generated.ts`.
