-- Safe follow-up fixes from the latest Supabase AI/linter review.
-- This file avoids dropping unused indexes and does not tighten notifications
-- INSERT policy yet because the current client code inserts notifications for
-- other users. Move notification writes behind a server route/RPC before
-- changing that policy.

-- =====================================================
-- 1. Helpers
-- =====================================================

create or replace function pg_temp.has_columns(
  p_schema text,
  p_table text,
  p_columns text[]
)
returns boolean
language sql
as $$
  select count(*) = cardinality(p_columns)
  from information_schema.columns c
  where c.table_schema = p_schema
    and c.table_name = p_table
    and c.column_name = any(p_columns);
$$;

create or replace function pg_temp.create_index_if_columns(
  p_schema text,
  p_table text,
  p_columns text[],
  p_sql text
)
returns void
language plpgsql
as $$
begin
  if to_regclass(format('%I.%I', p_schema, p_table)) is null then
    return;
  end if;

  if not pg_temp.has_columns(p_schema, p_table, p_columns) then
    return;
  end if;

  execute p_sql;
end;
$$;

create or replace function pg_temp.set_function_search_path(
  p_signature text,
  p_search_path text
)
returns void
language plpgsql
as $$
begin
  if to_regprocedure(p_signature) is null then
    return;
  end if;

  execute format('alter function %s set search_path = %s', p_signature, p_search_path);
end;
$$;

-- =====================================================
-- 2. Covering indexes for additional FK linter findings
-- =====================================================

select pg_temp.create_index_if_columns(
  'pilot_crm',
  'template_approval_logs',
  array['template_version_id'],
  'create index if not exists template_approval_logs_template_version_id_idx on pilot_crm.template_approval_logs(template_version_id) where template_version_id is not null'
);

select pg_temp.create_index_if_columns(
  'pilot_crm',
  'work_items',
  array['parent_id'],
  'create index if not exists work_items_parent_id_idx on pilot_crm.work_items(parent_id) where parent_id is not null'
);

select pg_temp.create_index_if_columns(
  'pilot_crm',
  'workflow_instances',
  array['workspace_id'],
  'create index if not exists workflow_instances_workspace_id_idx on pilot_crm.workflow_instances(workspace_id)'
);

select pg_temp.create_index_if_columns(
  'public',
  'allowed_emails',
  array['created_by'],
  'create index if not exists idx_allowed_emails_created_by on public.allowed_emails(created_by) where created_by is not null'
);

select pg_temp.create_index_if_columns(
  'public',
  'cross_sales',
  array['customer_id'],
  'create index if not exists idx_cross_sales_customer_id on public.cross_sales(customer_id) where customer_id is not null'
);

select pg_temp.create_index_if_columns(
  'public',
  'manager_transfer_requests',
  array['customer_id'],
  'create index if not exists idx_manager_transfer_requests_customer_id on public.manager_transfer_requests(customer_id)'
);

select pg_temp.create_index_if_columns(
  'public',
  'manager_transfer_requests',
  array['requester_id'],
  'create index if not exists idx_manager_transfer_requests_requester_id on public.manager_transfer_requests(requester_id)'
);

select pg_temp.create_index_if_columns(
  'public',
  'manager_transfer_requests',
  array['target_manager_id'],
  'create index if not exists idx_manager_transfer_requests_target_manager_id on public.manager_transfer_requests(target_manager_id)'
);

select pg_temp.create_index_if_columns(
  'public',
  'plans',
  array['created_by'],
  'create index if not exists idx_plans_created_by on public.plans(created_by) where created_by is not null'
);

select pg_temp.create_index_if_columns(
  'public',
  'role_delegations',
  array['delegator_id'],
  'create index if not exists idx_role_delegations_delegator_id on public.role_delegations(delegator_id) where delegator_id is not null'
);

-- =====================================================
-- 3. search_path hardening for regular and trigger functions
-- =====================================================

select pg_temp.set_function_search_path('public.unaccent_vietnamese(text)', 'public');
select pg_temp.set_function_search_path('public.sync_profiles_full_name_slug()', 'public');
select pg_temp.set_function_search_path('public.sync_allowed_emails_full_name_slug()', 'public');
select pg_temp.set_function_search_path('pilot_crm.set_updated_at()', 'pilot_crm, public');

-- =====================================================
-- 4. Optional notification policy hardening note
-- =====================================================
--
-- Do not apply this until notification writes are moved from the browser to a
-- server-side route/RPC. Current app code creates notifications for admins and
-- target managers from the authenticated client, so this would break those
-- flows if enabled now.
--
-- drop policy if exists "Authenticated can insert notifications" on public.notifications;
-- drop policy if exists "notifications_insert_own_or_admin" on public.notifications;
-- create policy "notifications_insert_own_or_admin"
--   on public.notifications
--   for insert
--   to authenticated
--   with check (user_id = (select auth.uid()) or public.is_admin());
