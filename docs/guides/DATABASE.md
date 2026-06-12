# Hướng dẫn Database (Supabase)

## Yêu cầu

- Dự án Supabase (PostgreSQL 15+)
- Bật Auth (email/password hoặc magic link theo cấu hình team)
- Row Level Security (RLS) — migration đã bao gồm policies

## Biến môi trường

| Biến | Mục đích |
|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — bypass RLS, import, admin |

**Không** expose service role key ra client (`NEXT_PUBLIC_`).

Pilot B2B (tùy chọn, project riêng):

- `NEXT_PUBLIC_PILOT_SUPABASE_URL`
- `NEXT_PUBLIC_PILOT_SUPABASE_ANON_KEY`

## Cài DB mới

1. Tạo project Supabase mới.
2. Mở **SQL Editor**, chạy:
   ```
   migrations/00-bootstrap/full_migration.sql
   ```
3. Chạy tuần tự các file còn lại theo [migrations/README.md](../../migrations/README.md) (nhóm `01-core` → `02-security` → `03-performance`).
4. Seed sản phẩm KPI:
   ```
   migrations/04-seeds/seed_products.sql
   ```
   hoặc `node scripts/seed_products.js`
5. Chạy maintenance RPC (nếu cần xóa activity từ UI):
   ```
   migrations/05-maintenance/migration_clear_activity_keep_customers_20260611.sql
   ```
6. Tạo user đầu tiên qua Supabase Auth, insert `profiles` với role `ADMIN_LEVEL_1`.
7. Cập nhật types: `npm run gen:types`

## DB đã có — áp migration mới

1. Xác định file chưa chạy (so với bảng thứ tự trong `migrations/README.md`).
2. Chạy từng file trong SQL Editor.
3. Kiểm tra RLS: đăng nhập USER vs ADMIN, thử truy cập KH phòng ban khác.
4. `npm run gen:types` nếu schema đổi.

## RLS & phân quyền

| Role | Phạm vi |
|------|---------|
| `USER` | KH được giao, tương tác/bán hàng của mình |
| `ADMIN_LEVEL_2` | Toàn phòng ban (department) |
| `ADMIN_LEVEL_1` | Toàn hệ thống |
| `ADMIN_LEVEL_0` | Super admin (maintenance, clear data) |

Helper: `get_current_user_role()`, `is_admin()` (trong migration security).

## RPC quan trọng

| Function | File nguồn |
|----------|------------|
| `get_kpi_summary(start, end)` | `01-core/migration_dynamic_kpi.sql` |
| `snapshot_daily_balances()` | `00-bootstrap/supabase_migration_kpi.sql` |
| `clear_activity_keep_customers()` | `05-maintenance/migration_clear_activity_keep_customers_20260611.sql` |
| `claim_customer(uuid)` | `03-performance/migration_rpc_claim_customer_20260605.sql` |

## Pilot schema (`pilot_crm`)

File: [docs/pilot/advanced-crm-pilot-migration.sql](../pilot/advanced-crm-pilot-migration.sql)

- Schema `pilot_crm` — **không** trộn với `public` production.
- Chạy trên Supabase project thử nghiệm riêng.
- UI: `/advanced-workflow-pilot` (state localStorage + pilot Supabase nếu cấu hình).

## Troubleshooting

| Vấn đề | Hướng xử lý |
|--------|-------------|
| API clear activity báo thiếu RPC | Chạy `05-maintenance/migration_clear_activity_keep_customers_20260611.sql` |
| Báo cáo KPI = 0 | Kiểm tra `cross_sell_records`, `daily_manager_snapshots` |
| Lỗi RLS khi insert | Kiểm tra `assigned_manager_id`, role trong `profiles` |
| TypeScript lệch schema | `npm run gen:types` với `DATABASE_URL` hoặc Supabase CLI |
