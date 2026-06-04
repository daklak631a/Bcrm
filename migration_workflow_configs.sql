-- Migration: Store Admin LV0 workflow configuration in Supabase
-- Run this on Supabase SQL Editor before relying on shared workflow config.

CREATE TABLE IF NOT EXISTS public.workflow_configs (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read workflow configs" ON public.workflow_configs;
DROP POLICY IF EXISTS "Admin LV0 writes workflow configs" ON public.workflow_configs;

CREATE POLICY "Read workflow configs" ON public.workflow_configs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin LV0 writes workflow configs" ON public.workflow_configs
  FOR ALL TO authenticated
  USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'ADMIN_LEVEL_0'
  )
  WITH CHECK (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'ADMIN_LEVEL_0'
  );

INSERT INTO public.workflow_configs (key, payload)
VALUES ('bcrm-workflow-config:v1', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;
