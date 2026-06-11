-- SQL Script to fix the UUID type error for profiles.department_id
-- Run this in your Supabase SQL Editor (https://supabase.com)

-- 1. Alter the column department_id in profiles table to be TEXT instead of UUID
ALTER TABLE public.profiles 
ALTER COLUMN department_id TYPE TEXT USING department_id::TEXT;

-- 2. Verify that there are no active constraints on department_id requiring UUID format
-- This enables users to sign in and be automatically assigned departments like "Phòng KHDN2" as raw text.
