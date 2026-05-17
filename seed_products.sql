-- Xoá dữ liệu cũ (tuỳ chọn, nếu muốn làm sạch và đồng bộ lại chính xác)
TRUNCATE TABLE cross_sell_products CASCADE;

INSERT INTO cross_sell_products (name, type, description, target) VALUES
('CIF MỚI', 'Tài khoản', 'Mở mới CIF khách hàng', 100),
('BIDV DIRECT', 'Dịch vụ khác', 'Đăng ký dịch vụ BIDV Direct', 100),
('BẢO HIỂM NHÂN THỌ', 'Bảo hiểm', 'Bảo hiểm nhân thọ (Triệu đồng)', 500),
('BẢO HIỂM KHOẢN VAY', 'Bảo hiểm', 'Bảo hiểm khoản vay (Triệu đồng)', 500),
('HUY ĐỘNG VỐN TĂNG RÒNG', 'Huy động vốn', 'Huy động vốn tăng ròng (Tỷ đồng)', 10),
('DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)', 'Tín dụng', 'Dư nợ tín dụng tăng ròng ngắn hạn (Tỷ đồng)', 10),
('DƯ NỢ TÍN DỤNG TĂNG RÒNG (Trung dài hạn)', 'Tín dụng', 'Dư nợ tín dụng tăng ròng trung dài hạn (Tỷ đồng)', 10),
('CẤP MỚI HMTD', 'Tín dụng', 'Cấp mới hạn mức tín dụng (Mục tiêu SL KH)', 50);
