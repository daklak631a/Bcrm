-- SQL Script to fix database errors for Loans and Deposits tables
-- Run this in your Supabase SQL Editor (https://supabase.com)

-- 1. Add missing columns to the LOANS table
ALTER TABLE public.loans 
ADD COLUMN IF NOT EXISTS loan_type TEXT,
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS term_type TEXT DEFAULT 'SHORT_TERM';

-- 2. Add missing columns to the DEPOSITS table
ALTER TABLE public.deposits 
ADD COLUMN IF NOT EXISTS deposit_type TEXT;

-- 3. Make due_date in LOANS optional (nullable)
ALTER TABLE public.loans 
ALTER COLUMN due_date DROP NOT NULL;

-- 4. Notify Supabase to reload schema cache
NOTIFY pgrst, 'reload schema';
