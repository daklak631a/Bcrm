# Tài liệu BCRM 2.0

## Hướng dẫn vận hành

| Tài liệu | Nội dung |
|----------|----------|
| [guides/PROJECT_STRUCTURE.md](./guides/PROJECT_STRUCTURE.md) | Cấu trúc repo, module, sub-project |
| [guides/DATABASE.md](./guides/DATABASE.md) | Supabase, migration, RLS |
| [guides/DATA_MANAGEMENT.md](./guides/DATA_MANAGEMENT.md) | Import KH, xóa dữ liệu, seed |

## Kế hoạch triển khai (`plans/`)

| File | Chủ đề |
|------|--------|
| [PLAN-gas-frontend-sync.md](./plans/PLAN-gas-frontend-sync.md) | Đồng bộ GAS + Google Sheets |
| [PLAN-b2b-workflow-upgrade.md](./plans/PLAN-b2b-workflow-upgrade.md) | Nâng cấp workflow B2B |

## Đặc tả tính năng (`features/`)

| File | Chủ đề |
|------|--------|
| [bcrm-v2-cif-slugs.md](./features/bcrm-v2-cif-slugs.md) | Mã CIF, slug cán bộ |
| [corporate-loan-dropdown-upgrade.md](./features/corporate-loan-dropdown-upgrade.md) | UI vay doanh nghiệp |
| [advanced-crm-pilot-checklog.md](./features/advanced-crm-pilot-checklog.md) | Checklist pilot CRM nâng cao |

## Pilot & nghiên cứu

| Thư mục | Nội dung |
|---------|----------|
| [pilot/](./pilot/) | SQL schema pilot (`pilot_crm`) — DB riêng |
| [research/](./research/) | Báo cáo nghiên cứu |
| [assets/](./assets/) | File Excel, tài liệu tham chiếu (không phải mã nguồn) |

## Liên kết ngoài thư mục docs

- [README.md](../README.md) — Cài đặt, chạy local, deploy
- [migrations/README.md](../migrations/README.md) — Thứ tự migration SQL
- [desktop/customer-import/README.md](../desktop/customer-import/README.md) — Tool import Excel (Electron)
- [gas-frontend/README.md](../gas-frontend/README.md) — Portal GAS (Vite)
