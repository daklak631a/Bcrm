-- Xoá dữ liệu cũ (tuỳ chọn, nếu muốn làm sạch và đồng bộ lại chính xác)
TRUNCATE TABLE cross_sell_products CASCADE;

INSERT INTO cross_sell_products (name, short_name, kpi_category, type, description, target, metric_type, unit_label) VALUES
('CIF MỚI',                                  'CIF Mới',          'cif_moi',                   'Tài khoản',    'Mở mới CIF khách hàng',                             100, 'QUANTITY', 'KH'),
('BIDV DIRECT',                              'BIDV Direct',      'bidv_direct',               'Dịch vụ khác', 'Đăng ký dịch vụ BIDV Direct',                       100, 'QUANTITY', 'KH'),
('BẢO HIỂM NHÂN THỌ',                        'BH Nhân thọ',      'bh_nhan_tho',               'Bảo hiểm',     'Bảo hiểm nhân thọ (Triệu đồng)',                    500, 'AMOUNT',   'Triệu đồng'),
('BẢO HIỂM KHOẢN VAY',                       'BH Khoản vay',     'bh_khoan_vay',              'Bảo hiểm',     'Bảo hiểm khoản vay (Triệu đồng)',                   500, 'AMOUNT',   'Triệu đồng'),
('HUY ĐỘNG VỐN TĂNG RÒNG',                   'HĐV Tăng ròng',    'huy_dong_tang_rong',        'Huy động vốn', 'Huy động vốn tăng ròng (Tỷ đồng)',                  10,  'AMOUNT',   'Tỷ đồng'),
('DƯ NỢ TÍN DỤNG TĂNG RÒNG (Ngắn hạn)',      'DN Ngắn hạn',      'du_no_ngan_han_tang_rong',  'Tín dụng',     'Dư nợ tín dụng tăng ròng ngắn hạn (Tỷ đồng)',      10,  'AMOUNT',   'Tỷ đồng'),
('DƯ NỢ TÍN DỤNG TĂNG RÒNG (Trung dài hạn)', 'DN Trung dài hạn', 'du_no_trung_han_tang_rong', 'Tín dụng',     'Dư nợ tín dụng tăng ròng trung dài hạn (Tỷ đồng)', 10,  'AMOUNT',   'Tỷ đồng'),
('CẤP MỚI HMTD',                             'Cấp HMTD',         'cap_moi_hmtd',              'Tín dụng',     'Cấp mới hạn mức tín dụng (Mục tiêu SL KH)',         50,  'QUANTITY', 'KH');
