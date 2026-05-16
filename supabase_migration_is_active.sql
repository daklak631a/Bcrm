-- Migration: Add is_active column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- RLS Policy: Only Admin L1 can manage profiles
-- (Run after enabling RLS if not already enabled)

-- Allow all authenticated users to read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow Admin L1 to read all profiles
CREATE POLICY "Admin L1 can read all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN_LEVEL_1'
    )
  );

-- Allow Admin L1 to insert profiles  
CREATE POLICY "Admin L1 can insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN_LEVEL_1'
    )
  );

-- Allow Admin L1 to update profiles
CREATE POLICY "Admin L1 can update all profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN_LEVEL_1'
    )
  );

-- Allow users to update their own full_name
CREATE POLICY "Users can update own name" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow Admin L1 to delete profiles
CREATE POLICY "Admin L1 can delete profiles" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN_LEVEL_1'
    )
  );
