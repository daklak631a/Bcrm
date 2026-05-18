-- Migration for BCRM V2: CIF Code and Officer Full Name Slugs
-- Author: Antigravity

-- 1. Extend customers table with cif_code
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cif_code TEXT;

-- Create unique constraint index for active customer CIFs (allowing multiple soft-deleted NULL/duplicate CIFs)
DROP INDEX IF EXISTS idx_customers_cif_code_active;
CREATE UNIQUE INDEX idx_customers_cif_code_active 
ON public.customers(cif_code) 
WHERE deleted_at IS NULL AND cif_code IS NOT NULL;

-- 2. Extend profiles and allowed_emails with full_name_slug
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name_slug TEXT;
ALTER TABLE public.allowed_emails ADD COLUMN IF NOT EXISTS full_name_slug TEXT;

-- 3. Create robust unaccent_vietnamese function to strip accents and generate slug
CREATE OR REPLACE FUNCTION public.unaccent_vietnamese(str TEXT)
RETURNS TEXT AS $$
DECLARE
    normalized TEXT;
BEGIN
    IF str IS NULL THEN
        RETURN NULL;
    END IF;
    
    normalized := lower(str);
    
    -- Strip Vietnamese accents
    normalized := translate(normalized, 
        'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
    );
    
    -- Strip uppercase equivalents just in case translate has issues
    normalized := translate(normalized, 
        'ÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
    );
    
    -- Replace non-alphanumeric chars (except space and hyphen)
    normalized := regexp_replace(normalized, '[^a-z0-9\s\-]', '', 'g');
    
    -- Clean spaces and dashes
    normalized := regexp_replace(normalized, '\s+', ' ', 'g');
    normalized := trim(normalized);
    normalized := replace(normalized, ' ', '-');
    normalized := regexp_replace(normalized, '\-+', '-', 'g');
    
    RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 4. Create trigger functions for profiles and allowed_emails
CREATE OR REPLACE FUNCTION public.sync_profiles_full_name_slug()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name_slug := public.unaccent_vietnamese(NEW.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_allowed_emails_full_name_slug()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name_slug := public.unaccent_vietnamese(NEW.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach BEFORE INSERT OR UPDATE triggers to keep slugs fully synced
DROP TRIGGER IF EXISTS trg_sync_profiles_slug ON public.profiles;
CREATE TRIGGER trg_sync_profiles_slug
BEFORE INSERT OR UPDATE OF full_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profiles_full_name_slug();

DROP TRIGGER IF EXISTS trg_sync_allowed_emails_slug ON public.allowed_emails;
CREATE TRIGGER trg_sync_allowed_emails_slug
BEFORE INSERT OR UPDATE OF full_name ON public.allowed_emails
FOR EACH ROW
EXECUTE FUNCTION public.sync_allowed_emails_full_name_slug();

-- 6. Backfill existing records
UPDATE public.profiles SET full_name_slug = public.unaccent_vietnamese(full_name) WHERE full_name_slug IS NULL OR full_name_slug = '';
UPDATE public.allowed_emails SET full_name_slug = public.unaccent_vietnamese(full_name) WHERE full_name_slug IS NULL OR full_name_slug = '';
