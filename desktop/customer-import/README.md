# BCRM Nhập Khách Hàng (Desktop)

Công cụ Windows `.exe` để Admin upload file Excel khách hàng lên API `POST /api/customers/import`.

## Cách dùng (end user)

1. Chạy `BCRM-Nhap-Khach-Hang-1.0.0.exe`
2. Nhập **URL CRM**, **Supabase URL**, **Anon Key** → **Lưu cấu hình**
3. **Đăng nhập bằng Google** (tài khoản đã được cấp quyền)
4. **Chọn file .xlsx** → **Upload lên server**
5. Xem kết quả (tổng / thành công / lỗi)

## Cấu hình Supabase (một lần)

Thêm redirect URL trong Supabase Dashboard → **Authentication** → **URL Configuration**:

```
http://127.0.0.1:38472/auth/callback
```

## Build file .exe (developer)

```bash
cd desktop/customer-import
npm install
npm run dist
```

File output: `desktop/customer-import/dist/BCRM-Nhap-Khach-Hang-1.0.0.exe`

Chạy thử trước khi build:

```bash
npm start
```

## So với upload trên web

| Web (trình duyệt) | Desktop (.exe) |
|-------------------|----------------|
| Khách hàng → nút **Nhập** → chọn file | Mở app → chọn file → Upload |
| Cùng API backend | Cùng API backend |
| Cần đăng nhập CRM trên browser | Đăng nhập Google trong app |
