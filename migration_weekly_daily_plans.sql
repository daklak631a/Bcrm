-- Migration: Create weekly_plans and daily_plans tables for User-managed plans
-- Run this on Supabase SQL Editor

-- 1. Create weekly_plans table
CREATE TABLE IF NOT EXISTS weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_loans_amount DECIMAL(15, 2) DEFAULT 0,
    target_deposits_amount DECIMAL(15, 2) DEFAULT 0,
    target_calls INT DEFAULT 0,
    target_cif_moi INT DEFAULT 0,
    target_bidv_direct INT DEFAULT 0,
    target_bh_nhan_tho DECIMAL(15, 2) DEFAULT 0,
    target_bh_khoan_vay DECIMAL(15, 2) DEFAULT 0,
    target_huy_dong_tang_rong DECIMAL(15, 2) DEFAULT 0,
    target_du_no_ngan_han_tang_rong DECIMAL(15, 2) DEFAULT 0,
    target_du_no_trung_han_tang_rong DECIMAL(15, 2) DEFAULT 0,
    target_cap_moi_hmtd INT DEFAULT 0,
    product_targets JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_weekly UNIQUE (user_id, start_date)
);

-- 2. Create daily_plans table
CREATE TABLE IF NOT EXISTS daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    target_loans_amount DECIMAL(15, 2) DEFAULT 0,
    target_deposits_amount DECIMAL(15, 2) DEFAULT 0,
    target_calls INT DEFAULT 0,
    target_cif_moi INT DEFAULT 0,
    target_bidv_direct INT DEFAULT 0,
    target_bh_nhan_tho DECIMAL(15, 2) DEFAULT 0,
    target_bh_khoan_vay DECIMAL(15, 2) DEFAULT 0,
    target_huy_dong_tang_rong DECIMAL(15, 2) DEFAULT 0,
    target_du_no_ngan_han_tang_rong DECIMAL(15, 2) DEFAULT 0,
    target_du_no_trung_han_tang_rong DECIMAL(15, 2) DEFAULT 0,
    target_cap_moi_hmtd INT DEFAULT 0,
    product_targets JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_daily UNIQUE (user_id, target_date)
);

ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS product_targets JSONB DEFAULT '{}'::jsonb;

ALTER TABLE daily_plans
  ADD COLUMN IF NOT EXISTS product_targets JSONB DEFAULT '{}'::jsonb;

ALTER TABLE plan_assignments
  ADD COLUMN IF NOT EXISTS product_targets JSONB DEFAULT '{}'::jsonb;

ALTER TABLE cross_sell_products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Enable RLS
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Allow select weekly plans" ON weekly_plans;
DROP POLICY IF EXISTS "Allow modify own weekly plans" ON weekly_plans;
DROP POLICY IF EXISTS "Allow select daily plans" ON daily_plans;
DROP POLICY IF EXISTS "Allow modify own daily plans" ON daily_plans;

-- 5. Create policies
-- Select policies
CREATE POLICY "Allow select weekly plans" ON weekly_plans
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
    );

CREATE POLICY "Allow select daily plans" ON daily_plans
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
    );

-- Modify policies (insert/update/delete)
CREATE POLICY "Allow modify own weekly plans" ON weekly_plans
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow modify own daily plans" ON daily_plans
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
