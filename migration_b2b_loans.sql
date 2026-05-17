-- Migration to update loans table for B2B corporate support
ALTER TABLE public.loans
ADD COLUMN IF NOT EXISTS business_sector TEXT,
ADD COLUMN IF NOT EXISTS disbursement_purpose TEXT,
ADD COLUMN IF NOT EXISTS collateral_assets TEXT,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS loan_method TEXT;
