-- Migration: Allow batch sales without customer (cuối ngày theo lô)
-- Run this on Supabase SQL editor

-- 1. Allow customer_id to be NULL in cross_sell_records
ALTER TABLE cross_sell_records 
  ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Add columns for batch entry tracking
ALTER TABLE cross_sell_records
  ADD COLUMN IF NOT EXISTS is_batch_entry boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS batch_note text,
  ADD COLUMN IF NOT EXISTS is_allocated boolean DEFAULT false;

-- 3. Index for fast batch lookup
CREATE INDEX IF NOT EXISTS idx_cross_sell_records_batch 
  ON cross_sell_records (agent_id, is_batch_entry, is_allocated)
  WHERE is_batch_entry = true;
