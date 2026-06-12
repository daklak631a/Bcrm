ALTER TABLE public.plan_assignments
ADD COLUMN IF NOT EXISTS target_cif_moi INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_bidv_direct INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_bh_nhan_tho NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_bh_khoan_vay NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_huy_dong_tang_rong NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_du_no_ngan_han_tang_rong NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_du_no_trung_han_tang_rong NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_cap_moi_hmtd INT DEFAULT 0;
