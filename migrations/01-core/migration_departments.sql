-- Danh sách phòng ban chuẩn + gắn phòng cho khách hàng
-- Chạy trong Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments (is_active, name);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS department_id TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_department ON public.customers (department_id)
  WHERE deleted_at IS NULL;

-- Seed từ phòng đang dùng trong profiles / allowed_emails
INSERT INTO public.departments (code, name)
SELECT DISTINCT TRIM(source.department_id), TRIM(source.department_id)
FROM (
  SELECT department_id FROM public.profiles WHERE department_id IS NOT NULL AND TRIM(department_id) <> ''
  UNION
  SELECT department_id FROM public.allowed_emails WHERE department_id IS NOT NULL AND TRIM(department_id) <> ''
) AS source
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.departments (code, name) VALUES
  ('Phòng KHDN1', 'Phòng Kinh doanh Doanh nghiệp 1'),
  ('Phòng KHDN2', 'Phòng Kinh doanh Doanh nghiệp 2')
ON CONFLICT (code) DO NOTHING;

-- Gán phòng KH theo phòng của cán bộ phụ trách (dữ liệu cũ)
UPDATE public.customers c
SET department_id = p.department_id
FROM public.profiles p
WHERE c.assigned_manager_id = p.id
  AND p.department_id IS NOT NULL
  AND TRIM(p.department_id) <> ''
  AND (c.department_id IS NULL OR TRIM(c.department_id) = '');

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
CREATE POLICY "departments_select_authenticated" ON public.departments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "departments_admin_write" ON public.departments;
CREATE POLICY "departments_admin_write" ON public.departments
  FOR ALL TO authenticated
  USING (get_current_user_role() IN ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1'))
  WITH CHECK (get_current_user_role() IN ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1'));
