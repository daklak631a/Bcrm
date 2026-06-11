-- Supabase linter fixes for RLS, FK indexes, duplicate indexes, and RPC grants.
-- Run after the existing BCRM and pilot_crm migrations.
--
-- Intent:
-- - Keep public authenticated flows working.
-- - Avoid broad pilot_crm write policies; mutations still go through RPC/service-role.
-- - Make policies use `(select auth.uid())` so Supabase/Postgres can init-plan cache auth values.

-- =====================================================
-- 1. Auth helper functions: avoid row-by-row auth.uid()
-- =====================================================

create or replace function public.get_current_user_role()
returns user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role user_role;
  v_delegation record;
begin
  select p.role
    into v_role
  from public.profiles p
  where p.id = v_user_id
  limit 1;

  if v_role::text = 'ADMIN_LEVEL_3' then
    select rd.*
      into v_delegation
    from public.role_delegations rd
    where rd.delegatee_id = v_user_id
      and rd.status = 'ACTIVE'
      and current_date >= rd.start_date
      and current_date <= rd.end_date
    limit 1;

    if found then
      return v_delegation.delegated_role;
    end if;
  end if;

  return v_role;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.get_current_user_role()::text in ('ADMIN_LEVEL_0', 'ADMIN_LEVEL_1', 'ADMIN_LEVEL_2'),
    false
  );
$$;

-- =====================================================
-- 2. Pilot CRM helper functions: avoid row-by-row auth.uid()
-- =====================================================

create or replace function pilot_crm.can_access_workspace(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pilot_crm, public
as $$
  select exists (
    select 1
    from pilot_crm.workspace_participants wp
    where wp.workspace_id = p_workspace_id
      and wp.user_id = (select auth.uid())
      and wp.can_view = true
  );
$$;

create or replace function pilot_crm.is_template_admin(p_level text)
returns boolean
language sql
stable
security definer
set search_path = pilot_crm, public
as $$
  select exists (
    select 1
    from pilot_crm.admin_members am
    where am.user_id = (select auth.uid())
      and am.status = 'active'
      and (
        am.admin_level = p_level
        or (p_level = 'lv2' and am.admin_level = 'lv1')
      )
  );
$$;

-- =====================================================
-- 3. Small helper to replace policies only when a table exists
-- =====================================================

create or replace function pg_temp.replace_policy(
  p_table text,
  p_policy_name text,
  p_create_policy_sql text
)
returns void
language plpgsql
as $$
begin
  if to_regclass(p_table) is null then
    return;
  end if;

  execute format('drop policy if exists %I on %s', p_policy_name, p_table);
  execute p_create_policy_sql;
end;
$$;

-- =====================================================
-- 4. Public table policies for tables reported as RLS-enabled without policy
-- =====================================================

alter table if exists public.kpi_target_configs enable row level security;

select pg_temp.replace_policy(
  'public.kpi_target_configs',
  'kpi_target_configs_select_authenticated',
  'create policy "kpi_target_configs_select_authenticated" on public.kpi_target_configs for select to authenticated using (true)'
);

select pg_temp.replace_policy(
  'public.kpi_target_configs',
  'kpi_target_configs_admin_write',
  'create policy "kpi_target_configs_admin_write" on public.kpi_target_configs for all to authenticated using (public.is_admin()) with check (public.is_admin())'
);

-- =====================================================
-- 5. Pilot CRM read policies for RLS-enabled tables that had no policy
-- =====================================================

select pg_temp.replace_policy(
  'pilot_crm.accounts',
  'accounts_select_owner_or_admin',
  'create policy "accounts_select_owner_or_admin" on pilot_crm.accounts for select to authenticated using (owner_user_id = (select auth.uid()) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.contacts',
  'contacts_select_account_owner_or_admin',
  'create policy "contacts_select_account_owner_or_admin" on pilot_crm.contacts for select to authenticated using (exists (select 1 from pilot_crm.accounts a where a.id = contacts.account_id and (a.owner_user_id = (select auth.uid()) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))))'
);

select pg_temp.replace_policy(
  'pilot_crm.deals',
  'deals_select_owner_account_workspace_or_admin',
  'create policy "deals_select_owner_account_workspace_or_admin" on pilot_crm.deals for select to authenticated using (owner_user_id = (select auth.uid()) or (advanced_workspace_id is not null and pilot_crm.can_access_workspace(advanced_workspace_id)) or exists (select 1 from pilot_crm.accounts a where a.id = deals.account_id and a.owner_user_id = (select auth.uid())) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.credit_profiles',
  'credit_profiles_select_account_owner_or_admin',
  'create policy "credit_profiles_select_account_owner_or_admin" on pilot_crm.credit_profiles for select to authenticated using (exists (select 1 from pilot_crm.accounts a where a.id = credit_profiles.account_id and (a.owner_user_id = (select auth.uid()) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))))'
);

select pg_temp.replace_policy(
  'pilot_crm.workflow_steps',
  'workflow_steps_select_participant_assignee_or_admin',
  'create policy "workflow_steps_select_participant_assignee_or_admin" on pilot_crm.workflow_steps for select to authenticated using (assigned_user_id = (select auth.uid()) or acted_by = (select auth.uid()) or exists (select 1 from pilot_crm.workflow_instances wi where wi.id = workflow_steps.instance_id and pilot_crm.can_access_workspace(wi.workspace_id)) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.work_item_dependencies',
  'work_item_dependencies_select_participant_or_admin',
  'create policy "work_item_dependencies_select_participant_or_admin" on pilot_crm.work_item_dependencies for select to authenticated using (pilot_crm.can_access_workspace(workspace_id) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.event_log',
  'event_log_select_participant_actor_or_admin',
  'create policy "event_log_select_participant_actor_or_admin" on pilot_crm.event_log for select to authenticated using (created_by = (select auth.uid()) or (workspace_id is not null and pilot_crm.can_access_workspace(workspace_id)) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.dashboard_rollups',
  'dashboard_rollups_select_admin',
  'create policy "dashboard_rollups_select_admin" on pilot_crm.dashboard_rollups for select to authenticated using (pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.api_clients',
  'api_clients_select_admin',
  'create policy "api_clients_select_admin" on pilot_crm.api_clients for select to authenticated using (pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.integration_inbox',
  'integration_inbox_select_admin',
  'create policy "integration_inbox_select_admin" on pilot_crm.integration_inbox for select to authenticated using (pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

select pg_temp.replace_policy(
  'pilot_crm.integration_outbox',
  'integration_outbox_select_workspace_or_admin',
  'create policy "integration_outbox_select_workspace_or_admin" on pilot_crm.integration_outbox for select to authenticated using ((workspace_id is not null and pilot_crm.can_access_workspace(workspace_id)) or pilot_crm.is_template_admin(''lv2'') or pilot_crm.is_template_admin(''lv1''))'
);

-- =====================================================
-- 6. Covering indexes for foreign keys reported by Supabase linter
-- =====================================================

create index if not exists contacts_account_id_idx
  on pilot_crm.contacts(account_id);

create index if not exists deals_advanced_workspace_id_idx
  on pilot_crm.deals(advanced_workspace_id)
  where advanced_workspace_id is not null;

create index if not exists advanced_workspaces_deal_id_idx
  on pilot_crm.advanced_workspaces(deal_id)
  where deal_id is not null;

create index if not exists integration_inbox_client_id_idx
  on pilot_crm.integration_inbox(client_id)
  where client_id is not null;

create index if not exists integration_outbox_workspace_id_idx
  on pilot_crm.integration_outbox(workspace_id)
  where workspace_id is not null;

create index if not exists notification_outbox_workspace_id_idx
  on pilot_crm.notification_outbox(workspace_id)
  where workspace_id is not null;

create index if not exists search_documents_workspace_id_idx
  on pilot_crm.search_documents(workspace_id)
  where workspace_id is not null;

create index if not exists work_item_dependencies_workspace_id_idx
  on pilot_crm.work_item_dependencies(workspace_id);

create index if not exists work_item_dependencies_successor_id_idx
  on pilot_crm.work_item_dependencies(successor_id);

create index if not exists workflow_steps_instance_id_idx
  on pilot_crm.workflow_steps(instance_id);

-- =====================================================
-- 7. Drop known duplicate public.customer indexes when their canonical pair exists
-- =====================================================

do $$
begin
  if to_regclass('public.idx_customers_manager') is not null
     and to_regclass('public.idx_customers_assigned_manager') is not null then
    drop index public.idx_customers_assigned_manager;
  end if;

  if to_regclass('public.idx_customers_active_manager_created') is not null
     and to_regclass('public.idx_customers_manager_active_created') is not null then
    drop index public.idx_customers_manager_active_created;
  end if;
end;
$$;

-- =====================================================
-- 8. Tighten execute grants on SECURITY DEFINER functions
-- =====================================================

create or replace function pg_temp.apply_function_grant(
  p_signature text,
  p_revoke_from text,
  p_grant_to text default null
)
returns void
language plpgsql
as $$
begin
  if to_regprocedure(p_signature) is null then
    return;
  end if;

  execute format('revoke execute on function %s from %I', p_signature, p_revoke_from);

  if p_grant_to is not null then
    execute format('grant execute on function %s to %I', p_signature, p_grant_to);
  end if;
end;
$$;

select pg_temp.apply_function_grant('public.get_current_user_role()', 'anon', 'authenticated');
select pg_temp.apply_function_grant('public.is_admin()', 'anon', 'authenticated');
select pg_temp.apply_function_grant('public.get_kpi_summary(date,date)', 'anon', 'authenticated');
select pg_temp.apply_function_grant('public.snapshot_daily_balances()', 'public', null);
select pg_temp.apply_function_grant('public.handle_manager_transfer_approval()', 'public', null);

select pg_temp.apply_function_grant('pilot_crm.can_access_workspace(uuid)', 'anon', 'authenticated');
select pg_temp.apply_function_grant('pilot_crm.is_template_admin(text)', 'anon', 'authenticated');
select pg_temp.apply_function_grant('pilot_crm.propose_project_template(text,text,text,text,jsonb)', 'anon', 'authenticated');
select pg_temp.apply_function_grant('pilot_crm.update_project_template(uuid,text,jsonb)', 'anon', 'authenticated');
select pg_temp.apply_function_grant('pilot_crm.approve_project_template(uuid,text,text)', 'anon', 'authenticated');
select pg_temp.apply_function_grant('pilot_crm.return_project_template(uuid,text)', 'anon', 'authenticated');
select pg_temp.apply_function_grant('pilot_crm.apply_project_template_to_workspace(uuid,uuid)', 'anon', 'authenticated');
