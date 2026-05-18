# Kế hoạch Tích hợp Google Sheets & Triển khai Cổng Frontend qua Google Apps Script (GAS)

## Tổng quan (Overview)
- **Mục tiêu**: Xây dựng một cổng truy cập dự phòng qua Google Apps Script (GAS) để né việc mạng nội bộ chặn Vercel, đảm bảo UI/UX giống hệt ứng dụng gốc. Đồng thời, thiết lập luồng đồng bộ dữ liệu 1 chiều từ Supabase sang Google Sheets để phục vụ lưu trữ/báo cáo.
- **Loại dự án**: WEB (Single Page Application nhúng vào GAS) & BACKEND (Supabase Webhooks).

## Tiêu chí thành công (Success Criteria)
1. **Frontend GAS**: Người dùng có thể truy cập qua link `script.google.com`, giao diện hoạt động y hệt bản Vercel hiện tại.
2. **Xác thực (Auth)**: Người dùng đăng nhập được bằng Tài khoản Google (Google OAuth) và Supabase cấp session hợp lệ.
3. **Đồng bộ Dữ liệu**: Khi có thay đổi dữ liệu (Customer, Loan, Deposit) trên Supabase, dữ liệu tự động hoặc định kỳ đẩy về 1 file Google Sheets được chỉ định.

## Tech Stack (Công nghệ sử dụng)
- **Frontend Framework cho GAS**: React + Vite + `vite-plugin-singlefile`. (GAS yêu cầu toàn bộ HTML/CSS/JS nằm trong 1 file duy nhất để render qua `HtmlService`, plugin này giúp đóng gói toàn bộ build React vào `index.html`).
- **Styling**: Tailwind CSS (nhúng cùng file).
- **Backend/Cơ sở dữ liệu**: Supabase (như hiện tại).
- **GAS Backend (`Code.gs`)**: Cung cấp hàm `doGet` để render Frontend, và hàm `doPost` (Webhook Endpoint) nhận dữ liệu từ Supabase đẩy sang Sheets.

## Cấu trúc thư mục dự kiến (File Structure)
Sẽ tạo thêm một thư mục con trong project hiện tại để chứa code frontend cho GAS.
```
bcrm/
├── gas-frontend/               # Nơi chứa React code đặc biệt build cho GAS
│   ├── vite.config.ts          # Cấu hình vite-plugin-singlefile
│   ├── src/
│   │   ├── App.tsx             # Giao diện chính (Port từ Next.js qua)
│   │   └── ...
├── gas-backend/
│   └── Code.gs                 # File kịch bản chạy trên Google Apps Script (doGet, doPost)
└── ... (Source code Next.js hiện tại)
```

## Phân chia Task (Task Breakdown)

### Task 1: Khởi tạo môi trường React cho GAS (GAS Frontend Setup)
- **Agent**: `frontend-specialist`
- **Mô tả**: Tạo thư mục `gas-frontend`, cài đặt Vite, React, Tailwind và `vite-plugin-singlefile`.
- **INPUT**: Cấu trúc project hiện tại.
- **OUTPUT**: Thư mục `gas-frontend` với khả năng build ra một file `index.html` duy nhất chạy được mọi logic.
- **VERIFY**: Chạy `npm run build` sinh ra đúng 1 file `dist/index.html` chứa toàn bộ thẻ `<script>` và `<style>` inline.

### Task 2: Port giao diện & Thiết lập Đăng nhập (Google OAuth)
- **Agent**: `frontend-specialist` & `security-auditor`
- **Mô tả**: Sao chép các Component chính từ Next.js sang. Chuyển đổi cơ chế routing (từ Next App Router sang React Router DOM). Tích hợp đăng nhập Supabase Google OAuth.
- **INPUT**: Code trong `app/` và `components/`.
- **OUTPUT**: App hoạt động được trên localhost của Vite với giao diện y hệt, có chức năng Login bằng Google.
- **VERIFY**: Đăng nhập thành công, fetch được dữ liệu từ Supabase (bằng API calls từ client) trên môi trường Vite dev.

### Task 3: Triển khai lên Google Apps Script
- **Agent**: `devops-engineer`
- **Mô tả**: Thiết lập `clasp` (CLI của Google) hoặc hướng dẫn copy-paste file `index.html` vào dự án GAS. Viết hàm `doGet(e)` trong `Code.gs` để serve giao diện.
- **INPUT**: File `dist/index.html` từ Task 2.
- **OUTPUT**: Đường link web app `script.google.com/...` hoạt động ổn định.
- **VERIFY**: Mở link bằng trình duyệt nội bộ ẩn danh, đăng nhập và thao tác bình thường.

### Task 4: Xây dựng Endpoint nhận Webhook (GAS Backend)
- **Agent**: `backend-specialist`
- **Mô tả**: Viết hàm `doPost(e)` trong `Code.gs` của GAS. Hàm này nhận HTTP Request từ Supabase, parse dữ liệu JSON và ghi vào các trang tính (Sheets) tương ứng (VD: sheet "Khách hàng", "Khoản vay").
- **INPUT**: Yêu cầu đồng bộ 1 chiều.
- **OUTPUT**: URL Webhook của GAS sẵn sàng nhận dữ liệu.
- **VERIFY**: Dùng Postman bắn thử 1 request JSON vào URL Webhook, dữ liệu xuất hiện trên Google Sheets.

### Task 5: Cấu hình Database Webhooks trên Supabase
- **Agent**: `database-architect`
- **Mô tả**: Tạo Trigger hoặc sử dụng Supabase Webhook trong Dashboard để tự động gọi tới URL của GAS mỗi khi có hành động `INSERT/UPDATE/DELETE` trên các bảng dữ liệu cốt lõi.
- **INPUT**: URL Webhook từ Task 4.
- **OUTPUT**: Các trigger hoạt động ngầm trên Postgres.
- **VERIFY**: Thử tạo một khách hàng mới trên App, kiểm tra Google Sheets xem dòng mới đã được tự động thêm vào chưa.

## Phase X: Verification (Xác nhận hoàn thành)
- [ ] Mở ứng dụng từ mạng bị chặn Vercel thông qua link Google Script thành công.
- [ ] Xác thực Google Auth hoạt động trơn tru (không bị lỗi Cross-Origin trên iframe của GAS).
- [ ] Giao diện (UI) và tính năng chính phản hồi mượt mà như bản Next.js.
- [ ] Dữ liệu khách hàng mới xuất hiện real-time (hoặc gần real-time) trên Google Sheets.
- [ ] Ngày hoàn thành: [Chưa xác định]
