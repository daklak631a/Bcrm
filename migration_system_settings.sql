-- Migration: Create system_settings table for dynamic logo, favicon and app name
-- Run this on Supabase SQL Editor

-- 1. Create table
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 2. Insert default values if not present
INSERT INTO system_settings (key, value) VALUES
  ('app_name', 'Nexus Banking CRM'),
  ('logo_url', ''),
  ('favicon_url', '')
ON CONFLICT (key) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Allow read settings to all authenticated users" ON system_settings;
DROP POLICY IF EXISTS "Allow read settings to anonymous" ON system_settings;
DROP POLICY IF EXISTS "Allow write settings to admins" ON system_settings;

-- 5. Create policies
-- Allow read to authenticated users
CREATE POLICY "Allow read settings to all authenticated users" ON system_settings
  FOR SELECT TO authenticated USING (true);

-- Allow read to anonymous (needed for login page before user is authenticated)
CREATE POLICY "Allow read settings to anonymous" ON system_settings
  FOR SELECT TO anon USING (true);

-- Allow write access only to ADMIN_LEVEL_1
CREATE POLICY "Allow write settings to admins" ON system_settings
  FOR ALL TO authenticated USING (
    (SELECT role::text FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'ADMIN_LEVEL_1'
  );
