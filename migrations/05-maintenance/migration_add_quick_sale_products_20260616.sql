-- Bổ sung 3 sản phẩm còn thiếu để 7 nút sản phẩm nhanh trên trang Khách Hàng
-- (CIF/NHS/BHNT/BHKV/TTD/CTN/QR) đều map được sang cross_sell_products.
-- TTD/CTN/QR trước đây chỉ là cờ boolean trên customers, chưa có sản phẩm bán
-- tương ứng -> không tạo được giao dịch cross_sell_records.
--
-- Nhóm KPI: 'other_spdv' (Sản phẩm khác) vì các SP này không thuộc KPI cố định.
-- Dùng INSERT ... WHERE NOT EXISTS để chạy lại an toàn (idempotent).

INSERT INTO cross_sell_products (name, short_name, kpi_category, type, description, target, metric_type, unit_label)
SELECT 'THẺ TÍN DỤNG', 'Thẻ tín dụng', 'other_spdv', 'Thẻ', 'Phát hành thẻ tín dụng', 0, 'QUANTITY', 'Thẻ'
WHERE NOT EXISTS (SELECT 1 FROM cross_sell_products WHERE name = 'THẺ TÍN DỤNG');

INSERT INTO cross_sell_products (name, short_name, kpi_category, type, description, target, metric_type, unit_label)
SELECT 'CHUYỂN TIỀN NGOÀI', 'Chuyển tiền ngoài', 'other_spdv', 'Dịch vụ khác', 'Dịch vụ chuyển tiền ra ngoài hệ thống', 0, 'QUANTITY', 'Giao dịch'
WHERE NOT EXISTS (SELECT 1 FROM cross_sell_products WHERE name = 'CHUYỂN TIỀN NGOÀI');

INSERT INTO cross_sell_products (name, short_name, kpi_category, type, description, target, metric_type, unit_label)
SELECT 'MERCHANT QR', 'Merchant QR', 'other_spdv', 'Dịch vụ khác', 'Đăng ký điểm chấp nhận thanh toán Merchant QR', 0, 'QUANTITY', 'Điểm'
WHERE NOT EXISTS (SELECT 1 FROM cross_sell_products WHERE name = 'MERCHANT QR');
