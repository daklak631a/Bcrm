# Script xóa dữ liệu

Chạy trong **Supabase SQL Editor** (quyền `postgres` / `service_role`). **Không hoàn tác** — backup trước khi chạy production.

## Chọn script phù hợp

| File | Xóa gì | Giữ lại |
|------|--------|---------|
| [01_xoa_khach_hang.sql](./01_xoa_khach_hang.sql) | Toàn bộ `customers` + loans, deposits, interactions, cross_sales (CASCADE) | Users, danh mục sản phẩm, cấu hình |
| [02_xoa_log_lich_su.sql](./02_xoa_log_lich_su.sql) | `audit_logs` | Mọi dữ liệu nghiệp vụ |
| [03_xoa_tuong_tac.sql](./03_xoa_tuong_tac.sql) | `interactions`, `support_requests`, `manager_transfer_requests` | KH, KPI, báo cáo |
| [04_xoa_kpi_bao_cao.sql](./04_xoa_kpi_bao_cao.sql) | KPI ngày/tuần, giao KPI, snapshot báo cáo, bán hàng KPI | KH, tương tác, users |

## Xóa lịch sử hoạt động (giữ khách hàng)

Tương đương gộp **03 + 04** (một phần), không xóa KH/vay/tiền gửi:

1. **Trong app:** Cài đặt → **Xóa lịch sử hoạt động** (Admin L0/L1), nhập `XOA LICH SU`
2. **Trong DB:** Chạy RPC từ [../05-maintenance/migration_clear_activity_keep_customers_20260611.sql](../05-maintenance/migration_clear_activity_keep_customers_20260611.sql)

## Thứ tự gợi ý khi chạy nhiều script

```
04 (KPI) → 03 (tương tác) → 02 (log) → 01 (khách hàng)
```

## Tùy chỉnh

Mỗi file có dòng `WHERE ...` được comment — bỏ comment để xóa theo cán bộ, khoảng ngày, hoặc điều kiện khác.

## Deprecated

`../deprecated/clear_data.sql` — xóa cả loans/deposits, **không dùng**.
