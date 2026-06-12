# Scripts tiện ích

Các script hỗ trợ phát triển và vận hành — chạy từ **root** repo (trừ khi ghi chú khác).

| Script | Lệnh | Mô tả |
|--------|------|-------|
| `gen-supabase-types.mjs` | `npm run gen:types` | Sinh `types/database.generated.ts` từ Supabase |
| `check-mojibake.mjs` | `npm run check:mojibake` | Kiểm tra lỗi encoding UTF-8 / tiếng Việt |
| `seed_products.js` | `node scripts/seed_products.js` | Seed danh mục sản phẩm KPI (cần `.env.local`) |
| `generate_docs.py` | `python scripts/generate_docs.py` | Sinh tài liệu (nếu dùng) |

## Google Apps Script

| File | Mục đích |
|------|----------|
| [gas/masterscript.gs](./gas/masterscript.gs) | Tạo/cập nhật sheet báo cáo Google Sheets (Tổng quan, phòng, cán bộ) |
| `../gas-frontend/gas-app/Code.gs` | Backend GAS cho portal CRM trên Sheets |

Deploy GAS frontend: xem [gas-frontend/README.md](../gas-frontend/README.md).

## Liên quan npm scripts (root)

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm test                 # Mojibake + Vitest
npm run build:import-desktop  # Electron import tool
```
