# Nâng Cấp BCRM V2: Mã CIF Khách Hàng & Tự Động Tạo Slug Chuyên Viên (CIF Code & Manager Name Slug Integration)

## Goal
Tích hợp mã số thông tin khách hàng (cif_code) và tự động hóa sinh đường dẫn thân thiện/slug không dấu cho chuyên viên (full_name_slug) thông qua triggers trong CSDL Supabase. Đồng thời, đồng bộ hóa toàn diện trường nhập liệu mới của V2 trên 3 màn hình phụ: Khoản vay (Loans), Huy động vốn (Deposits), và Tương tác (Interactions).

## Tasks
- [ ] **Task 1**: Thiết lập cấu trúc cơ sở dữ liệu (Supabase Database Migrations):
  * Viết script di cư `migration_cif_and_officer_slug.sql` để:
    * Thêm cột `cif_code` kiểu `TEXT` vào bảng `customers`.
    * Thiết lập chỉ mục duy nhất `idx_customers_cif_code_active` trên cột `cif_code` cho các bản ghi đang hoạt động (`WHERE deleted_at IS NULL AND cif_code IS NOT NULL`).
    * Thêm cột `full_name_slug` kiểu `TEXT` vào hai bảng `profiles` và `allowed_emails`.
    * Xây dựng hàm cơ sở dữ liệu `unaccent_vietnamese(text)` loại bỏ dấu tiếng Việt và chuyển đổi sang dạng slug/không dấu thân thiện (ví dụ: "Nguyễn Văn A" -> "nguyen-van-a").
    * Tạo database triggers tự động đồng bộ `full_name_slug` mỗi khi `full_name` được thêm mới hoặc cập nhật trên cả 2 bảng.
    * Chạy câu lệnh backfill chuyển đổi slug cho toàn bộ dữ liệu nhân sự cũ đang tồn tại trong DB.
  - *Verify*: Script được chạy thành công trên Database Supabase; xác nhận các trigger tự động hoạt động khi thêm/sửa profiles hoặc allowed_emails.

- [ ] **Task 2**: Cập nhật TypeScript Models & API Services:
  * Thêm thuộc tính `cif_code?: string | null;` vào interface `Customer` trong `types/models.ts`.
  * Thêm thuộc tính `full_name_slug?: string | null;` vào interface `Profile` và `AllowedEmail` trong `types/models.ts`.
  * Cập nhật các hàm API `createCustomer` và `updateCustomer` trong `lib/supabase/api.ts` để lưu trữ cột `cif_code` xuống Supabase.
  - *Verify*: `npm run lint` và `npx tsc --noEmit` chạy trơn tru, không có lỗi kiểu dữ liệu.

- [ ] **Task 3**: Nâng cấp Giao diện và Import/Export Khách hàng (Customers Page & Excel Processing):
  * Thêm ô nhập liệu "Mã CIF (Không bắt buộc)" vào Modal Thêm/Sửa Khách hàng mới ở trang `app/customers/page.tsx`.
  * Hiển thị mã CIF bên cạnh tên khách hàng như một thẻ tag/badge nổi bật, sắc nét trong bảng danh sách và trang chi tiết khách hàng `app/customers/[id]/page.tsx`.
  * Cập nhật tính năng Import/Export Excel: Nhận diện cột "Mã CIF" từ Excel để tự động điền/gộp dữ liệu dựa trên mã CIF, và export chính xác trường CIF ra file.
  - *Verify*: Tiến hành xuất file Excel và nhập thử file có cột Mã CIF, kiểm tra dữ liệu hiển thị chính xác trên UI và lưu đúng trong Database.

- [ ] **Task 4**: Đồng bộ hóa Modal thêm nhanh Khách hàng trên 3 màn hình phụ:
  * Cập nhật Modal tạo nhanh khách hàng trong:
    * `app/loans/page.tsx` (Màn hình Khoản vay).
    * `app/deposits/page.tsx` (Màn hình Huy động vốn).
    * `app/interactions/page.tsx` (Màn hình Tương tác).
  * Đồng bộ đầy đủ bộ quy tắc V2 mới: Lựa chọn loại khách hàng (Cá nhân / Doanh nghiệp), hiển thị form nhập tương ứng (Tên doanh nghiệp, Mã số thuế, Người đại diện hoặc Họ tên riêng lẻ), làm sạch số điện thoại chỉ lưu ký tự số, và bổ sung ô nhập liệu Mã CIF.
  - *Verify*: Mở từng trang phụ, mở modal thêm mới khách hàng, nhập liệu thử và kiểm tra tính nhất quán hoạt động.

- [ ] **Task 5**: Kiểm định chất lượng toàn diện (Pre-deploy Verification):
  * Chạy `npm run lint` và `npx tsc --noEmit` để đảm bảo hệ thống không có bất kỳ lỗi cú pháp hoặc cảnh báo kiểu TypeScript nào.
  * Tiến hành chạy build Next.js với `npm run build` để kiểm chứng độ ổn định ở môi trường production.

## Done When
- [ ] Cột `cif_code` được cấu hình đầy đủ trong CSDL, Typescript, API, Modal thêm mới và hiển thị tinh tế trên các trang khách hàng.
- [ ] Độc lập quản lý và tự động tạo `full_name_slug` cho nhân sự thông qua DB trigger.
- [ ] 3 modal tạo nhanh ở Loans, Deposits, Interactions đồng bộ hoàn hảo với form V2 chuẩn.
- [ ] Ứng dụng build thành công 100% không gặp lỗi runtime hay lỗi biên dịch.
