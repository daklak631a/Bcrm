# GAS Frontend — Portal CRM trên Google Sheets

SPA React (Vite) build thành một file HTML nhúng vào **Google Apps Script**.

## Cấu trúc

```
gas-frontend/
├── src/           # React source
├── gas-app/
│   ├── Code.gs    # Backend GAS (doGet, doPost, sync Sheets)
│   └── index.html # Bundle sau build (deploy lên GAS)
└── package.json
```

Script báo cáo Google Sheets (master report): `../scripts/gas/masterscript.gs`

Kế hoạch đồng bộ: [docs/plans/PLAN-gas-frontend-sync.md](../docs/plans/PLAN-gas-frontend-sync.md)

## Phát triển

```bash
cd gas-frontend
npm ci
npm run dev          # Vite dev server
npm run build:gas    # Build + copy vào gas-app/index.html
```

## Deploy lên Google Apps Script

1. Chạy `npm run build:gas`
2. Mở project GAS, dán `gas-app/Code.gs`
3. Upload / cập nhật `gas-app/index.html` làm web app
4. Cấu hình quyền truy cập Sheets theo hướng dẫn trong `Code.gs`

## Liên quan repo chính

- Web CRM: root Next.js app (`npm run dev` từ root)
- Import Excel: `desktop/customer-import/`
- Tài liệu tổng: [README.md](../README.md)
