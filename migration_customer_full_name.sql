-- Migration to merge customer first_name and last_name into full_name
-- Also updates indexes and ensures smooth transition.

-- 1. Add full_name column
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Populate full_name from last_name and first_name
-- In Vietnamese naming: last_name (Họ) + first_name (Tên)
UPDATE public.customers 
SET full_name = TRIM(COALESCE(last_name, '') || ' ' || COALESCE(first_name, ''))
WHERE full_name IS NULL;

-- 3. Set NOT NULL constraint on full_name
ALTER TABLE public.customers ALTER COLUMN full_name SET NOT NULL;

-- 4. Drop first_name and last_name columns
ALTER TABLE public.customers DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.customers DROP COLUMN IF EXISTS last_name;

-- 5. Update index for customer name
DROP INDEX IF EXISTS public.idx_customers_name;
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);
