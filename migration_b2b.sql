-- Cập nhật bảng customers hỗ trợ khách hàng Doanh nghiệp
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'INDIVIDUAL',
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS tax_code TEXT,
ADD COLUMN IF NOT EXISTS representative_name TEXT;

-- Cập nhật bảng cross_sales để thêm product_id liên kết từ cross_sell_products (tùy chọn nếu cần chuẩn hoá thêm)
-- ALTER TABLE public.cross_sales
-- ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES cross_sell_products(id);
