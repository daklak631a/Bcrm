-- 1. Alter Enum Type
-- Note: ALTER TYPE ADD VALUE cannot be executed inside a transaction block.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN_LEVEL_3';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADVISOR';

-- 2. Create role_delegations table
CREATE TABLE IF NOT EXISTS public.role_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID REFERENCES public.profiles(id),
  delegatee_id UUID REFERENCES public.profiles(id),
  delegated_role user_role NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.role_delegations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Delegations viewable by everyone" ON role_delegations;
CREATE POLICY "Delegations viewable by everyone" ON role_delegations 
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Delegations insertable by admin L1/L2" ON role_delegations;
CREATE POLICY "Delegations insertable by admin L1/L2" ON role_delegations 
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

DROP POLICY IF EXISTS "Delegations updatable by admin L1/L2" ON role_delegations;
CREATE POLICY "Delegations updatable by admin L1/L2" ON role_delegations 
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
  );

-- 3. Update get_current_user_role() to evaluate delegation
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
  v_delegation RECORD;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  
  -- If L3, check for active delegation
  IF v_role = 'ADMIN_LEVEL_3' THEN
    SELECT * INTO v_delegation 
    FROM public.role_delegations 
    WHERE delegatee_id = auth.uid() 
      AND status = 'ACTIVE' 
      AND current_date >= start_date 
      AND current_date <= end_date 
    LIMIT 1;
    
    IF FOUND THEN
      RETURN v_delegation.delegated_role;
    END IF;
  END IF;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update is_admin() to rely on get_current_user_role() so delegated L3 gets admin access
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ADVISOR Read-only policies
DROP POLICY IF EXISTS "advisor_select_customers" ON customers;
CREATE POLICY "advisor_select_customers" ON customers FOR SELECT USING (get_current_user_role() = 'ADVISOR');

DROP POLICY IF EXISTS "advisor_select_loans" ON loans;
CREATE POLICY "advisor_select_loans" ON loans FOR SELECT USING (get_current_user_role() = 'ADVISOR');

DROP POLICY IF EXISTS "advisor_select_deposits" ON deposits;
CREATE POLICY "advisor_select_deposits" ON deposits FOR SELECT USING (get_current_user_role() = 'ADVISOR');

DROP POLICY IF EXISTS "advisor_select_interactions" ON interactions;
CREATE POLICY "advisor_select_interactions" ON interactions FOR SELECT USING (get_current_user_role() = 'ADVISOR');

DROP POLICY IF EXISTS "advisor_select_cross_sell" ON cross_sell_records;
CREATE POLICY "advisor_select_cross_sell" ON cross_sell_records FOR SELECT USING (get_current_user_role() = 'ADVISOR');

-- Ensure profiles is fully readable for ADVISOR as well (usually it already is, but just in case)
DROP POLICY IF EXISTS "advisor_select_profiles" ON profiles;
CREATE POLICY "advisor_select_profiles" ON profiles FOR SELECT USING (get_current_user_role() = 'ADVISOR');
