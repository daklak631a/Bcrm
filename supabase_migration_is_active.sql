-- Table for pre-approved users (Admin creates entries here)
-- When a user signs in with Google and their email matches, a profile is auto-created
CREATE TABLE IF NOT EXISTS allowed_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    department_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add is_active to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- RLS for allowed_emails
ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

-- Admin L1 full access on allowed_emails
CREATE POLICY "Admin L1 can manage allowed_emails" ON allowed_emails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.role = 'ADMIN_LEVEL_1'
    )
  );

-- Everyone can read allowed_emails (needed for login check)  
CREATE POLICY "Authenticated can read allowed_emails" ON allowed_emails
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- SETUP ADMIN: Run this AFTER your first Google login
-- ============================================
-- Step 1: Sign in with Google on the app (you'll be rejected - that's OK)
-- Step 2: Find your auth.users UUID:
--   SELECT id, email FROM auth.users WHERE email = 'YOUR_GOOGLE_EMAIL@gmail.com';
-- Step 3: Insert your profile as Admin L1:
--   INSERT INTO profiles (id, email, full_name, role, is_active)
--   VALUES ('YOUR_UUID_HERE', 'YOUR_GOOGLE_EMAIL@gmail.com', 'Giám Đốc', 'ADMIN_LEVEL_1', true);
-- Step 4: Also add yourself to allowed_emails:
--   INSERT INTO allowed_emails (email, full_name, role, is_active)
--   VALUES ('YOUR_GOOGLE_EMAIL@gmail.com', 'Giám Đốc', 'ADMIN_LEVEL_1', true);
-- Step 5: Sign in again - you're now Admin!
