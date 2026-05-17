# Nâng Cấp Gói Vay Doanh Nghiệp & Ô Tìm Kiếm Khách Hàng (Corporate Loan & Premium Search Dropdown Upgrade)

## Goal
Nâng cấp giao diện tạo khoản vay và bán sản phẩm chéo trong BCRM: tích hợp bộ lọc tìm kiếm khách hàng cao cấp, hỗ trợ thêm nhanh khách hàng trực tiếp, phân tách gói vay doanh nghiệp và cá nhân, và đồng bộ sản phẩm bán chéo từ Excel.

## Tasks
- [ ] **Task 1**: Đồng bộ và kiểm tra danh sách sản phẩm bán chéo. Đảm bảo toàn bộ 8 sản phẩm từ Sheet 1 Excel (`seed_products.sql`) hoạt động đúng trong DB và hiển thị trên giao diện Sản phẩm.
  - *Verify*: Truy cập trang `/products`, kiểm tra các sản phẩm hiển thị đủ 8 nhóm chính xác theo danh sách Excel.
- [ ] **Task 2**: Thiết kế & Nâng cấp ô chọn khách hàng (Premium Customer Combobox) trong `app/loans/page.tsx`. Hỗ trợ tìm kiếm theo Tên hoặc SĐT, hiển thị nhãn phân biệt `[Cá nhân]` / `[Doanh nghiệp]`, hiển thị số điện thoại và người đại diện, hỗ trợ nút thêm nhanh tiện lợi trực tiếp trong khung nhập liệu.
  - *Verify*: Nhập text tìm kiếm, danh sách lọc chính xác; hiển thị nút `[+ Thêm nhanh]` khi tìm không ra kết quả và tự điền tên vào form thêm mới.
- [ ] **Task 3**: Phân tách gói vay Doanh Nghiệp (Corporate) và Cá Nhân (Individual) trong `app/loans/page.tsx`.
  - Nếu chọn KH Cá Nhân: Hiển thị các gói vay cá nhân (Tiêu dùng, Mua nhà, Mua ô tô, Tín chấp...).
  - Nếu chọn KH Doanh Nghiệp: Chỉ hiển thị gói vay doanh nghiệp (Bổ sung vốn lưu động B2B, Đầu tư dự án B2B, Cấp mới HMTD, Thấu chi doanh nghiệp, Tài trợ thương mại...). Ẩn hoàn toàn gói vay cá nhân.
  - *Verify*: Thay đổi lựa chọn giữa KH Cá nhân và KH Doanh nghiệp trong form tạo khoản vay, kiểm tra các tùy chọn trong select "Loại khoản vay" thay đổi động và các trường B2B hiển thị/ẩn với style chuyên nghiệp.
- [ ] **Task 4**: Đồng bộ nâng cấp ô chọn khách hàng (Premium Customer Combobox) trong `app/products/page.tsx` (Form ghi nhận bán chéo sản phẩm).
  - *Verify*: Khi click "Bán Sản Phẩm", ô chọn khách hàng có tính năng search, nhãn hiển thị trực quan và nút thêm nhanh hoạt động tương tự như bên trang Khoản vay.
- [ ] **Task 5**: Chạy kiểm tra tĩnh (Lint) và xác thực giao diện (UX Audit/Test) để đảm bảo không lỗi cú pháp hoặc runtime.
  - *Verify*: Build thành công ứng dụng với `npm run build` và kiểm tra hoạt động trên trình duyệt.

## Done When
- [ ] Ô chọn khách hàng tại cả trang Khoản vay và Sản phẩm được thay thế bằng ô nhập liệu tìm kiếm cao cấp, tích hợp nút thêm nhanh tiện lợi.
- [ ] Khi chọn Khách hàng Doanh nghiệp, danh sách gói vay chỉ gồm các sản phẩm B2B thực tế thay vì các gói cá nhân tiêu dùng.
- [ ] Ứng dụng chạy mượt mà, không gặp lỗi cú pháp hay cảnh báo phân quyền RLS.
