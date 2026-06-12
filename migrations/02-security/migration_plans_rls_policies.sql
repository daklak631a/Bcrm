-- 1. Enable RLS on plans and plan_assignments if not already enabled
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Allow read plans to authenticated" ON public.plans;
DROP POLICY IF EXISTS "Allow manage plans to admins" ON public.plans;
DROP POLICY IF EXISTS "Allow select plan assignments" ON public.plan_assignments;
DROP POLICY IF EXISTS "Allow manage plan assignments to admins" ON public.plan_assignments;

-- 3. Create policies for plans table
CREATE POLICY "Allow read plans to authenticated" ON public.plans
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow manage plans to admins" ON public.plans
    FOR ALL TO authenticated
    USING (get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'));

-- 4. Create policies for plan_assignments table
CREATE POLICY "Allow select plan assignments" ON public.plan_assignments
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR 
        get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2')
    );

CREATE POLICY "Allow manage plan assignments to admins" ON public.plan_assignments
    FOR ALL TO authenticated
    USING (get_current_user_role() IN ('ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'));
