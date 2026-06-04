-- 1. Cho phép user insert profile của chính mình
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Cho phép user tự update profile của mình
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 3. Cho phép tất cả authenticated users đọc profiles (cần để kiểm tra Admin)
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Set mặc định admin hệ thống cho daklak631a@gmail.com
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN_LEVEL_0';

INSERT INTO allowed_emails (email, full_name, role, is_active)
VALUES ('daklak631a@gmail.com', 'Admin Hệ Thống (daklak631a)', 'ADMIN_LEVEL_0', true)
ON CONFLICT (email) DO UPDATE 
SET full_name = EXCLUDED.full_name, role = 'ADMIN_LEVEL_0', is_active = true;
