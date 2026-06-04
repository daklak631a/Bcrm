ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN_LEVEL_0';

INSERT INTO allowed_emails (email, full_name, role, is_active)
VALUES ('daklak631a@gmail.com', 'Admin Hệ Thống (daklak631a)', 'ADMIN_LEVEL_0', true)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = 'ADMIN_LEVEL_0',
    is_active = true;

UPDATE profiles
SET role = 'ADMIN_LEVEL_0',
    full_name = COALESCE(NULLIF(full_name, ''), 'Admin Hệ Thống (daklak631a)'),
    is_active = true,
    updated_at = timezone('utc'::text, now())
WHERE email = 'daklak631a@gmail.com';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() IN ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1', 'ADMIN_LEVEL_2');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
