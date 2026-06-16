-- Add short_name column to cross_sell_products for compact mobile button display
ALTER TABLE cross_sell_products ADD COLUMN IF NOT EXISTS short_name TEXT;

-- Populate short_name for existing seeded products
UPDATE cross_sell_products SET short_name = 'CIF Mới'        WHERE UPPER(name) LIKE '%CIF%' AND UPPER(name) LIKE '%MỚI%';
UPDATE cross_sell_products SET short_name = 'BIDV Direct'    WHERE UPPER(name) LIKE '%DIRECT%';
UPDATE cross_sell_products SET short_name = 'BH Nhân thọ'   WHERE UPPER(name) LIKE '%NHÂN THỌ%';
UPDATE cross_sell_products SET short_name = 'BH Khoản vay'  WHERE UPPER(name) LIKE '%KHOẢN VAY%' AND UPPER(name) LIKE '%BẢO HIỂM%';
UPDATE cross_sell_products SET short_name = 'HĐV Tăng ròng' WHERE UPPER(name) LIKE '%HUY ĐỘNG%';
UPDATE cross_sell_products SET short_name = 'DN Ngắn hạn'   WHERE UPPER(name) LIKE '%DƯ NỢ%' AND (UPPER(name) LIKE '%NGẮN%' OR UPPER(name) LIKE '%NGAN%');
UPDATE cross_sell_products SET short_name = 'DN Trung dài hạn' WHERE UPPER(name) LIKE '%DƯ NỢ%' AND (UPPER(name) LIKE '%TRUNG%' OR UPPER(name) LIKE '%DÀI%');
UPDATE cross_sell_products SET short_name = 'Cấp HMTD'      WHERE UPPER(name) LIKE '%HMTD%';
