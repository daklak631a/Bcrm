-- Migration to add financial columns and cross-sell flags to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS loan_short_term NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS loan_mid_long_term NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hdv_dau_ky NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hdv_phat_sinh NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS hdv_tang_rong NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS limit_approval_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS cif_moi BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS smart_banking BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bao_hiem_nhan_tho BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bao_hiem_khoan_vay BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS the_tin_dung BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS chuyen_tien_ngoai BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS merchant_qr BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sp_khac TEXT;

-- Create an index to query customers by assigned manager and type
CREATE INDEX IF NOT EXISTS idx_customers_assigned_manager ON public.customers(assigned_manager_id);
