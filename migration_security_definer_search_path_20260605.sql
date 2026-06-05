-- Harden SECURITY DEFINER functions against mutable search_path warnings.
-- Run after all existing function migrations.
--
-- This migration intentionally uses ALTER FUNCTION instead of redefining long
-- business functions, so it does not change KPI/trigger behavior.

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

-- Public auth/RLS helpers.
select pg_temp.set_function_search_path('public.get_current_user_role()', 'public');
select pg_temp.set_function_search_path('public.is_admin()', 'public');

-- Public KPI and workflow functions reported by Supabase security linter.
select pg_temp.set_function_search_path('public.snapshot_daily_balances()', 'public');
select pg_temp.set_function_search_path('public.get_kpi_summary(date,date)', 'public');
select pg_temp.set_function_search_path('public.handle_manager_transfer_approval()', 'public');

-- Pilot CRM functions already define search_path in the source migration, but
-- keep these ALTERs here to harden DBs created from earlier draft scripts.
select pg_temp.set_function_search_path('pilot_crm.can_access_workspace(uuid)', 'pilot_crm, public');
select pg_temp.set_function_search_path('pilot_crm.is_template_admin(text)', 'pilot_crm, public');
select pg_temp.set_function_search_path('pilot_crm.propose_project_template(text,text,text,text,jsonb)', 'pilot_crm, public');
select pg_temp.set_function_search_path('pilot_crm.update_project_template(uuid,text,jsonb)', 'pilot_crm, public');
select pg_temp.set_function_search_path('pilot_crm.approve_project_template(uuid,text,text)', 'pilot_crm, public');
select pg_temp.set_function_search_path('pilot_crm.return_project_template(uuid,text)', 'pilot_crm, public');
select pg_temp.set_function_search_path('pilot_crm.apply_project_template_to_workspace(uuid,uuid)', 'pilot_crm, public');

-- Keep direct RPC exposure tight for functions that should only run internally.
create or replace function pg_temp.revoke_function_execute(
  p_signature text,
  p_role text
)
returns void
language plpgsql
as $$
begin
  if to_regprocedure(p_signature) is null then
    return;
  end if;

  execute format('revoke execute on function %s from %I', p_signature, p_role);
end;
$$;

select pg_temp.revoke_function_execute('public.snapshot_daily_balances()', 'public');
select pg_temp.revoke_function_execute('public.handle_manager_transfer_approval()', 'public');
