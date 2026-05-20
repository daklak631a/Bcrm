ALTER TABLE public.cross_sell_products
ADD COLUMN IF NOT EXISTS metric_type TEXT NOT NULL DEFAULT 'QUANTITY';

ALTER TABLE public.cross_sell_products
ADD COLUMN IF NOT EXISTS unit_label TEXT NOT NULL DEFAULT 'SL';

ALTER TABLE public.cross_sell_records
ADD COLUMN IF NOT EXISTS result_value DECIMAL(15, 2) NOT NULL DEFAULT 0;

UPDATE public.cross_sell_products
SET metric_type = 'AMOUNT', unit_label = 'Triệu đồng'
WHERE UPPER(COALESCE(name, '')) LIKE '%BẢO HIỂM%'
   OR UPPER(COALESCE(type, '')) = 'BẢO HIỂM';

UPDATE public.cross_sell_products
SET metric_type = 'AMOUNT', unit_label = 'Tỷ đồng'
WHERE UPPER(COALESCE(name, '')) LIKE '%HUY ĐỘNG%'
   OR UPPER(COALESCE(type, '')) = 'HUY ĐỘNG VỐN';

UPDATE public.cross_sell_products
SET metric_type = 'AMOUNT', unit_label = 'Tỷ đồng'
WHERE UPPER(COALESCE(name, '')) LIKE '%DƯ NỢ%';

UPDATE public.cross_sell_products
SET metric_type = 'QUANTITY', unit_label = 'KH'
WHERE UPPER(COALESCE(name, '')) LIKE '%HMTD%'
   OR UPPER(COALESCE(name, '')) LIKE '%CIF%'
   OR UPPER(COALESCE(name, '')) LIKE '%DIRECT%'
   OR UPPER(COALESCE(name, '')) LIKE '%SMARTBANKING%'
   OR UPPER(COALESCE(type, '')) = 'TÀI KHOẢN'
   OR UPPER(COALESCE(type, '')) = 'SMARTBANKING';

UPDATE public.cross_sell_records AS records
SET result_value = 1
FROM public.cross_sell_products AS products
WHERE records.product_id = products.id
  AND COALESCE(records.result_value, 0) = 0
  AND products.metric_type = 'QUANTITY'
  AND UPPER(COALESCE(records.status, '')) = 'COMPLETED';
