# BCRM 2.0 — Nexus Banking CRM

Ứng dụng CRM ngân hàng: **Next.js 16**, **React 19**, **TypeScript**, **Supabase**.

## Thành phần trong repo

| Thành phần | Thư mục | Mô tả |
|------------|---------|-------|
| **Web app** | `/` (root) | CRM chính — KH, vay, KPI, báo cáo |
| **GAS portal** | `gas-frontend/` | Portal trên Google Apps Script + Sheets |
| **Import desktop** | `desktop/customer-import/` | Tool Electron import Excel (Windows) |

## Yêu cầu

- Node.js 20+
- npm
- Dự án Supabase đã chạy migration (xem bên dưới)

## Chạy local (web app)

```bash
npm ci
cp .env.example .env.local   # điền Supabase keys
npm run dev
```

Mặc định: `http://localhost:3000`

## Biến môi trường

**Bắt buộc**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — chỉ server, **không** dùng tiền tố `NEXT_PUBLIC_`

**Tùy chọn**

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — rate limit phân tán
- `NEXT_PUBLIC_PILOT_SUPABASE_URL`, `NEXT_PUBLIC_PILOT_SUPABASE_ANON_KEY` — pilot B2B (project riêng)

## Database (Supabase)

1. DB mới: chạy `migrations/00-bootstrap/full_migration.sql`
2. Tiếp theo: các file trong `01-core/` → `02-security/` → `03-performance/` theo thứ tự trong [migrations/README.md](./migrations/README.md)
3. Seed: `migrations/04-seeds/seed_products.sql` hoặc `node scripts/seed_products.js`
4. Cập nhật types: `npm run gen:types`

Chi tiết: [docs/guides/DATABASE.md](./docs/guides/DATABASE.md)

## Tài liệu

| Tài liệu | Nội dung |
|----------|----------|
| [docs/README.md](./docs/README.md) | Mục lục tài liệu |
| [docs/guides/PROJECT_STRUCTURE.md](./docs/guides/PROJECT_STRUCTURE.md) | Cấu trúc repo & module |
| [docs/guides/DATA_MANAGEMENT.md](./docs/guides/DATA_MANAGEMENT.md) | Import, xóa dữ liệu |
| [migrations/clear/README.md](./migrations/clear/README.md) | Script SQL xóa theo nhóm |
| [desktop/customer-import/README.md](./desktop/customer-import/README.md) | Tool import Excel |
| [gas-frontend/README.md](./gas-frontend/README.md) | Portal GAS |

## Kiểm tra chất lượng

```bash
npm run check:mojibake
npm test
npm run test:coverage
npm run lint
npm run build
```

CI: `.github/workflows/quality.yml` (coverage, lint, build).

## Triển khai production

1. Cấu hình biến môi trường trên nền tảng host (Vercel, v.v.).
2. Đảm bảo migration Supabase đã áp đủ — [migrations/README.md](./migrations/README.md).
3. Kiểm tra RLS với tài khoản USER / ADMIN thử nghiệm.
4. `npm run build` trước khi release.
5. **Không** commit `.env.local`, service role key, token Upstash.
6. Pilot B2B dùng Supabase **riêng** — không trùng URL production.

## Cấu trúc thư mục (tóm tắt)

```
app/           Pages & API routes
components/    UI React
lib/           Supabase, auth, business logic
migrations/    SQL theo nhóm: bootstrap → core → security → performance
docs/          Hướng dẫn, kế hoạch, pilot
scripts/       gen types, seed, GAS report
gas-frontend/  Vite SPA cho Google Apps Script
desktop/       Electron import tool
```
