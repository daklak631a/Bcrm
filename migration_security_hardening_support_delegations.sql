-- Harden support request and role delegation RLS policies.
-- This script is safe to rerun. It creates support_requests if that migration
-- has not been applied yet, and skips role_delegations hardening if absent.

CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  requester_id UUID REFERENCES public.profiles(id),
  support_admin_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'PENDING',
  scheduled_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support requests viewable by all" ON public.support_requests;
DROP POLICY IF EXISTS "Support requests insertable by users" ON public.support_requests;
DROP POLICY IF EXISTS "Support requests updatable by requester or admin" ON public.support_requests;
DROP POLICY IF EXISTS "support_requests_select_scoped" ON public.support_requests;
DROP POLICY IF EXISTS "support_requests_insert_self" ON public.support_requests;
DROP POLICY IF EXISTS "support_requests_update_scoped" ON public.support_requests;

CREATE POLICY "support_requests_select_scoped" ON public.support_requests
  FOR SELECT USING (
    auth.uid() = requester_id
    OR auth.uid() = support_admin_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'ADMIN_LEVEL_1'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles current_profile
      JOIN public.profiles requester_profile ON requester_profile.id = support_requests.requester_id
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'ADMIN_LEVEL_2'
        AND requester_profile.department_id = current_profile.department_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles current_profile
      JOIN public.profiles support_profile ON support_profile.id = support_requests.support_admin_id
      WHERE current_profile.id = auth.uid()
        AND current_profile.role = 'ADMIN_LEVEL_2'
        AND support_profile.department_id = current_profile.department_id
    )
  );

CREATE POLICY "support_requests_insert_self" ON public.support_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles support_profile
      WHERE support_profile.id = support_admin_id
        AND support_profile.is_active IS DISTINCT FROM false
        AND support_profile.role IN ('ADMIN_LEVEL_2', 'ADMIN_LEVEL_3', 'ADVISOR')
    )
  );

CREATE POLICY "support_requests_update_scoped" ON public.support_requests
  FOR UPDATE USING (
    auth.uid() = requester_id
    OR auth.uid() = support_admin_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'ADMIN_LEVEL_1'
    )
  )
  WITH CHECK (
    auth.uid() = requester_id
    OR auth.uid() = support_admin_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'ADMIN_LEVEL_1'
    )
  );

DO $$
BEGIN
  IF to_regclass('public.role_delegations') IS NOT NULL THEN
    ALTER TABLE public.role_delegations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Delegations viewable by everyone" ON public.role_delegations;
    DROP POLICY IF EXISTS "Delegations insertable by admin L1/L2" ON public.role_delegations;
    DROP POLICY IF EXISTS "Delegations updatable by admin L1/L2" ON public.role_delegations;
    DROP POLICY IF EXISTS "role_delegations_select_scoped" ON public.role_delegations;
    DROP POLICY IF EXISTS "role_delegations_insert_scoped" ON public.role_delegations;
    DROP POLICY IF EXISTS "role_delegations_update_scoped" ON public.role_delegations;

    CREATE POLICY "role_delegations_select_scoped" ON public.role_delegations
      FOR SELECT USING (
        auth.uid() = delegator_id
        OR auth.uid() = delegatee_id
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN_LEVEL_1'
        )
        OR EXISTS (
          SELECT 1
          FROM public.profiles current_profile
          JOIN public.profiles delegatee_profile ON delegatee_profile.id = role_delegations.delegatee_id
          WHERE current_profile.id = auth.uid()
            AND current_profile.role = 'ADMIN_LEVEL_2'
            AND delegatee_profile.department_id = current_profile.department_id
        )
      );

    CREATE POLICY "role_delegations_insert_scoped" ON public.role_delegations
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN_LEVEL_1'
        )
        OR EXISTS (
          SELECT 1
          FROM public.profiles current_profile
          JOIN public.profiles delegatee_profile ON delegatee_profile.id = delegatee_id
          WHERE current_profile.id = auth.uid()
            AND current_profile.role = 'ADMIN_LEVEL_2'
            AND delegatee_profile.department_id = current_profile.department_id
        )
      );

    CREATE POLICY "role_delegations_update_scoped" ON public.role_delegations
      FOR UPDATE USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN_LEVEL_1'
        )
        OR EXISTS (
          SELECT 1
          FROM public.profiles current_profile
          JOIN public.profiles delegatee_profile ON delegatee_profile.id = role_delegations.delegatee_id
          WHERE current_profile.id = auth.uid()
            AND current_profile.role = 'ADMIN_LEVEL_2'
            AND delegatee_profile.department_id = current_profile.department_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN_LEVEL_1'
        )
        OR EXISTS (
          SELECT 1
          FROM public.profiles current_profile
          JOIN public.profiles delegatee_profile ON delegatee_profile.id = role_delegations.delegatee_id
          WHERE current_profile.id = auth.uid()
            AND current_profile.role = 'ADMIN_LEVEL_2'
            AND delegatee_profile.department_id = current_profile.department_id
        )
      );
  END IF;
END $$;
