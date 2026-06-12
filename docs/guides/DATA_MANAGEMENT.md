# Quản lý dữ liệu

## Import khách hàng

### Qua giao diện web

- Trang Khách hàng → Import (nếu có) hoặc thêm thủ công.

### Qua Desktop (Excel hàng loạt)

1. Build tool: `npm run build:import-desktop`
2. Cấu hình URL API + token trong app Electron.
3. Chi tiết: [desktop/customer-import/README.md](../../desktop/customer-import/README.md)

API: `POST /api/customers/import` (cần auth + rate limit).

### Background job (Inngest)

Upload Excel lớn có thể qua webhook `/api/inngest` — xem `inngest/functions/processExcel.ts`.

## Seed dữ liệu mẫu

**Sản phẩm KPI** (bắt buộc cho báo cáo):

```bash
# Cách 1: SQL
# migrations/04-seeds/seed_products.sql

# Cách 2: Node (đọc .env.local)
node scripts/seed_products.js
```

Hai cách seed cùng nội dung — chọn một.

## Xóa dữ liệu

### Trong ứng dụng (an toàn, có xác nhận)

**Cài đặt → Xóa lịch sử hoạt động**

- Role: `ADMIN_LEVEL_0` hoặc `ADMIN_LEVEL_1`
- Nhập: `XOA LICH SU`
- **Giữ:** customers, loans, deposits, users, danh mục sản phẩm
- **Xóa:** tương tác, bán hàng, KPI, plans, audit (xem `lib/admin/clear-activity-data.ts`)

### Script SQL theo nhóm

| Nhu cầu | Script |
|---------|--------|
| Xóa khách hàng (+ vay, tiền gửi) | `migrations/clear/01_xoa_khach_hang.sql` |
| Xóa log audit | `migrations/clear/02_xoa_log_lich_su.sql` |
| Xóa tương tác | `migrations/clear/03_xoa_tuong_tac.sql` |
| Xóa KPI & báo cáo | `migrations/clear/04_xoa_kpi_bao_cao.sql` |

Chi tiết: [migrations/clear/README.md](../../migrations/clear/README.md).

### Pilot localStorage

Sau khi clear DB activity, pilot workflow có thể còn cache browser:

- Keys: `bcrm-advanced-workflow-pilot:v1`, `bcrm-advanced-workflow-template-admin:v1`
- UI Cài đặt tự xóa khi dùng chức năng clear activity.

## Soft delete khách hàng

Bảng `customers` có cột `deleted_at`. App mặc định lọc `deleted_at IS NULL`. Hard delete chỉ qua SQL script `01_xoa_khach_hang.sql`.

## Backup khuyến nghị

Trước khi chạy script xóa trên production:

1. Supabase Dashboard → Database → Backups (Pro plan) hoặc
2. `pg_dump` / export bảng quan trọng qua SQL Editor.

## Không xóa / không commit

- `profiles`, `allowed_emails` — tài khoản hệ thống
- `cross_sell_products` — danh mục KPI (trừ khi reset toàn bộ)
- `system_settings`, `workflow_configs` — cấu hình app
