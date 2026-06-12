# Cấu trúc dự án BCRM 2.0

CRM ngân hàng: Next.js 16 + Supabase + TypeScript. Repo gồm **ứng dụng web chính** và **2 công cụ phụ**.

## Tổng quan

```
bcrm-2.0/
├── app/                    # Next.js App Router — pages & API
├── components/             # UI React (layout, customer, dashboard, …)
├── lib/                    # Logic server/client (supabase, auth, validation)
├── store/                  # Zustand (auth)
├── providers/              # React context (auth, react-query)
├── hooks/                  # Custom hooks
├── types/                  # TypeScript models + Supabase generated types
├── inngest/                # Background jobs (xử lý Excel)
├── e2e/                    # Playwright tests
├── migrations/             # SQL Supabase — xem migrations/README.md
├── docs/                   # Tài liệu — xem docs/README.md
├── scripts/                # Tiện ích CLI — xem scripts/README.md
├── gas-frontend/           # Portal Google Apps Script (Vite SPA)
├── desktop/customer-import/# Tool import KH hàng loạt (Electron)
├── proxy.ts                # Auth guard + rate limit (Next.js 16)
└── package.json            # App chính
```

## Ứng dụng web chính

### Routing (`app/`)

| Nhóm | Đường dẫn | Chức năng |
|------|-----------|-----------|
| Auth | `/login`, `/auth/callback` | Đăng nhập Supabase |
| CRM | `/customers`, `/loans`, `/deposits` | Quản lý KH, vay, tiền gửi |
| Hoạt động | `/interactions`, `/sales`, `/sales-support` | Tương tác, bán hàng, kanban |
| KPI | `/kpi-targets`, `/reports` | Chỉ tiêu & báo cáo tổng hợp |
| Quản trị | `/team`, `/audit-logs`, `/settings`, `/manager-transfers` | Nhân sự, audit, cài đặt |
| Pilot | `/advanced-workflow-pilot` | Workflow B2B thử nghiệm |

### API (`app/api/`)

| Route | Mục đích |
|-------|----------|
| `/api/auth/verify` | Xác minh session |
| `/api/customers/import` | Import Excel (desktop tool) |
| `/api/admin/clear-activity-data` | Xóa lịch sử hoạt động |
| `/api/support/requests` | Kanban hỗ trợ |
| `/api/reports/kpi-summary` | Báo cáo KPI |
| `/api/inngest` | Webhook job nền |

### Thư viện (`lib/`)

| Thư mục | Vai trò |
|---------|---------|
| `lib/supabase/` | Truy vấn DB theo entity (customers, loans, plans, …) |
| `lib/auth/` | Route public/protected |
| `lib/admin/` | Clear activity data |
| `lib/customers/` | Logic import |
| `lib/advanced-workflow-pilot/` | State pilot B2B (localStorage) |

### Components

- `components/layout/` — Sidebar, Header, DashboardLayout (layout chính)
- `components/ui/` — Primitives shadcn/Radix
- `components/customer/`, `dashboard/`, `sales-support/` — Feature UI

## Sub-project: GAS Frontend

```
gas-frontend/
├── src/           # React source (Vite)
├── gas-app/       # Code.gs + index.html deploy lên Google Apps Script
└── package.json
```

Portal chạy trên Google Sheets — đồng bộ báo cáo, quản lý KH qua GAS. Build: `npm run build:gas` trong thư mục `gas-frontend/`.

Script báo cáo Google Sheets: `scripts/gas/masterscript.gs`.

## Sub-project: Desktop Import

```
desktop/customer-import/
├── src/main.js, preload.js, renderer/
└── package.json
```

Electron Windows — import Excel qua `POST /api/customers/import`. Build: `npm run build:import-desktop` từ root.

## Database

Schema PostgreSQL trên Supabase. Bảng chính:

| Bảng | Mô tả |
|------|-------|
| `profiles` | User (liên kết auth.users) |
| `customers`, `loans`, `deposits` | Khách hàng & tài chính |
| `interactions` | Lịch sử tương tác |
| `cross_sell_records`, `cross_sales` | Bán hàng / KPI thực hiện |
| `daily_plans`, `weekly_plans`, `plans`, `plan_assignments` | KPI & giao chỉ tiêu |
| `daily_manager_snapshots` | Snapshot phục vụ báo cáo |
| `audit_logs` | Nhật ký thao tác |

Chi tiết migration: [DATABASE.md](./DATABASE.md).

## Kiểm thử & CI

```bash
npm run check:mojibake   # UTF-8 / tiếng Việt
npm test                 # Vitest
npm run test:e2e         # Playwright
npm run lint && npm run build
```

GitHub Actions: `.github/workflows/quality.yml`.

## Quy ước phát triển

1. **DB thay đổi** → thêm file SQL vào `migrations/01-core/` (hoặc nhóm phù hợp), cập nhật `migrations/README.md`.
2. **Truy vấn Supabase** → đặt trong `lib/supabase/`, không gọi trực tiếp từ component.
3. **Pilot B2B** → schema riêng `docs/pilot/`, env `NEXT_PUBLIC_PILOT_SUPABASE_*` tách khỏi production.
4. **Tiếng Việt** → chạy `npm run check:mojibake` trước commit khi sửa chuỗi UI/SQL.
