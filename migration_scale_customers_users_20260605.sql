-- Scale readiness for 10k+ customers and 5k-6k users.
-- Run this in Supabase SQL Editor or your migration pipeline.

create extension if not exists pg_trgm;

-- Customer list: scope by manager, ignore soft-deleted rows, sort by latest.
create index if not exists idx_customers_active_manager_created
  on public.customers (assigned_manager_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_customers_active_created
  on public.customers (created_at desc)
  where deleted_at is null;

create index if not exists idx_customers_active_cif
  on public.customers (lower(cif_code))
  where deleted_at is null and cif_code is not null;

create index if not exists idx_customers_active_tax_code
  on public.customers (lower(tax_code))
  where deleted_at is null and tax_code is not null;

create index if not exists idx_customers_search_full_name_trgm
  on public.customers using gin (full_name gin_trgm_ops)
  where deleted_at is null;

create index if not exists idx_customers_search_business_name_trgm
  on public.customers using gin (business_name gin_trgm_ops)
  where deleted_at is null and business_name is not null;

create index if not exists idx_customers_search_phone_trgm
  on public.customers using gin (phone gin_trgm_ops)
  where deleted_at is null and phone is not null;

create index if not exists idx_customers_search_email_trgm
  on public.customers using gin (email gin_trgm_ops)
  where deleted_at is null and email is not null;

create index if not exists idx_customers_search_cif_trgm
  on public.customers using gin (cif_code gin_trgm_ops)
  where deleted_at is null and cif_code is not null;

create index if not exists idx_customers_search_tax_trgm
  on public.customers using gin (tax_code gin_trgm_ops)
  where deleted_at is null and tax_code is not null;

-- User list and department scoping.
create index if not exists idx_profiles_active_department_role
  on public.profiles (department_id, role, created_at desc)
  where is_active = true;

create index if not exists idx_profiles_active_created
  on public.profiles (created_at desc)
  where is_active = true;

create index if not exists idx_profiles_search_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists idx_profiles_search_email_trgm
  on public.profiles using gin (email gin_trgm_ops);

create index if not exists idx_profiles_search_department_trgm
  on public.profiles using gin (department_id gin_trgm_ops)
  where department_id is not null;

create index if not exists idx_allowed_emails_department_created
  on public.allowed_emails (department_id, created_at desc);

create index if not exists idx_allowed_emails_email_lower
  on public.allowed_emails (lower(email));

create index if not exists idx_allowed_emails_search_full_name_trgm
  on public.allowed_emails using gin (full_name gin_trgm_ops);

create index if not exists idx_allowed_emails_search_email_trgm
  on public.allowed_emails using gin (email gin_trgm_ops);
