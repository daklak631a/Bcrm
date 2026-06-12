-- Pilot CRM nâng cao cho B2B project + hạn mức.
-- File này để áp thủ công vào Supabase thử nghiệm riêng.
-- Không đặt trong thư mục migration production để tránh chạy nhầm vào DB hiện hữu.

create extension if not exists pgcrypto;

create schema if not exists pilot_crm;

create or replace function pilot_crm.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists pilot_crm.accounts (
  id uuid primary key default gen_random_uuid(),
  cif_code text,
  account_name text not null,
  customer_segment text not null default 'SME',
  tax_code text,
  owner_user_id uuid,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references pilot_crm.accounts(id) on delete cascade,
  full_name text not null,
  role_title text,
  phone text,
  email text,
  is_decision_maker boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.deals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references pilot_crm.accounts(id) on delete restrict,
  deal_name text not null,
  amount numeric(18,2) not null default 0,
  stage text not null default 'qualification',
  sale_type text not null default 'standard',
  requires_implementation boolean not null default false,
  requested_credit_limit numeric(18,2) not null default 0,
  expected_close_date date,
  owner_user_id uuid,
  advanced_workspace_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.credit_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references pilot_crm.accounts(id) on delete restrict,
  approved_limit numeric(18,2) not null default 0,
  requested_limit numeric(18,2) not null default 0,
  outstanding_balance numeric(18,2) not null default 0,
  payment_term_days int not null default 0,
  status text not null default 'draft',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.advanced_workspaces (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references pilot_crm.accounts(id) on delete restrict,
  deal_id uuid references pilot_crm.deals(id) on delete set null,
  workspace_code text not null unique,
  title text not null,
  mode text not null check (mode in ('project', 'credit', 'project_credit')),
  status text not null default 'active',
  current_stage text not null default 'activation',
  owner_user_id uuid,
  project_owner_user_id uuid,
  advisor_user_id uuid,
  planned_start_date date,
  planned_due_date date,
  scale_bucket text not null default 'pilot',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pilot_crm.deals
  add constraint deals_advanced_workspace_fk
  foreign key (advanced_workspace_id)
  references pilot_crm.advanced_workspaces(id)
  on delete set null
  deferrable initially deferred;

create table if not exists pilot_crm.workspace_participants (
  workspace_id uuid not null references pilot_crm.advanced_workspaces(id) on delete cascade,
  user_id uuid not null,
  role_code text not null,
  org_unit_id uuid,
  can_view boolean not null default true,
  can_act boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id, role_code)
);

create table if not exists pilot_crm.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references pilot_crm.advanced_workspaces(id) on delete cascade,
  kind text not null default 'activation',
  direction text not null default 'hybrid',
  status text not null default 'draft',
  current_step_order int not null default 0,
  idempotency_key text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references pilot_crm.workflow_instances(id) on delete cascade,
  step_order int not null,
  step_code text not null,
  status text not null default 'pending',
  assigned_user_id uuid,
  assigned_role_code text,
  due_at timestamptz,
  acted_by uuid,
  acted_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instance_id, step_order)
);

create table if not exists pilot_crm.work_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references pilot_crm.advanced_workspaces(id) on delete cascade,
  parent_id uuid references pilot_crm.work_items(id) on delete cascade,
  title text not null,
  item_type text not null default 'task',
  status text not null default 'todo',
  priority text not null default 'normal',
  owner_user_id uuid,
  reviewer_user_id uuid,
  planned_start_date date,
  due_date date,
  completed_at timestamptz,
  progress_pct numeric(5,2) not null default 0,
  sort_key numeric(18,6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.work_item_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references pilot_crm.advanced_workspaces(id) on delete cascade,
  predecessor_id uuid not null references pilot_crm.work_items(id) on delete cascade,
  successor_id uuid not null references pilot_crm.work_items(id) on delete cascade,
  dependency_type text not null default 'finish_to_start',
  created_at timestamptz not null default now(),
  unique (predecessor_id, successor_id)
);

create table if not exists pilot_crm.admin_members (
  user_id uuid primary key,
  admin_level text not null check (admin_level in ('lv1', 'lv2')),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.project_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text not null unique,
  template_name text not null,
  category text not null default 'CRM',
  direction text not null default 'hybrid',
  status text not null default 'lv2_review'
    check (status in ('draft', 'lv2_review', 'lv1_review', 'published', 'returned', 'archived')),
  current_version int not null default 1,
  scope text not null default '',
  approval_note text not null default '',
  created_by uuid,
  updated_by uuid,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.project_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references pilot_crm.project_templates(id) on delete cascade,
  version_no int not null,
  status text not null default 'lv2_review'
    check (status in ('draft', 'lv2_review', 'lv1_review', 'published', 'returned', 'archived')),
  snapshot jsonb not null default '{}'::jsonb,
  lv2_approved_by uuid,
  lv2_approved_at timestamptz,
  lv1_approved_by uuid,
  lv1_approved_at timestamptz,
  approval_note text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, version_no)
);

create table if not exists pilot_crm.project_template_phases (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references pilot_crm.project_template_versions(id) on delete cascade,
  phase_order int not null,
  title text not null,
  owner_role_code text not null default 'owner',
  receiver_role_code text not null default 'receiver',
  handoff_role_code text not null default 'approver',
  span_weeks int not null default 1 check (span_weeks > 0),
  acceptance_rule text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_version_id, phase_order)
);

create table if not exists pilot_crm.project_template_phase_timeline (
  id uuid primary key default gen_random_uuid(),
  template_phase_id uuid not null references pilot_crm.project_template_phases(id) on delete cascade,
  item_order int not null,
  title text not null,
  owner_role_code text not null default 'owner',
  default_due_offset_days int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_phase_id, item_order)
);

create table if not exists pilot_crm.project_template_checklists (
  id uuid primary key default gen_random_uuid(),
  template_phase_id uuid not null references pilot_crm.project_template_phases(id) on delete cascade,
  item_order int not null,
  title text not null,
  require_executor_tick boolean not null default true,
  require_approver_tick boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (template_phase_id, item_order)
);

create table if not exists pilot_crm.template_approval_logs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references pilot_crm.project_templates(id) on delete cascade,
  template_version_id uuid references pilot_crm.project_template_versions(id) on delete cascade,
  actor_user_id uuid,
  action_code text not null check (action_code in ('propose', 'update', 'lv2_approve', 'lv1_approve', 'return', 'apply')),
  from_status text,
  to_status text,
  note text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists pilot_crm.pilot_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null,
  user_id uuid not null default auth.uid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (snapshot_key, user_id)
);

create table if not exists pilot_crm.event_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references pilot_crm.advanced_workspaces(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  event_version int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists pilot_crm.search_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null default 'pilot',
  scope_type text not null,
  scope_id uuid not null,
  workspace_id uuid references pilot_crm.advanced_workspaces(id) on delete cascade,
  title text not null,
  body text not null default '',
  filters jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(body, '')), 'B')
  ) stored,
  updated_at timestamptz not null default now(),
  unique (scope_type, scope_id)
);

create table if not exists pilot_crm.dashboard_rollups (
  id uuid primary key default gen_random_uuid(),
  rollup_key text not null,
  scope_type text not null,
  scope_id uuid,
  metric_date date not null default current_date,
  metrics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (rollup_key, scope_type, scope_id, metric_date)
);

create table if not exists pilot_crm.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references pilot_crm.advanced_workspaces(id) on delete cascade,
  recipient_user_id uuid not null,
  notification_type text not null,
  title text not null,
  body text not null,
  channel text not null default 'in_app',
  status text not null default 'pending',
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists pilot_crm.api_clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_key text not null unique,
  status text not null default 'active',
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pilot_crm.integration_inbox (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references pilot_crm.api_clients(id) on delete set null,
  external_event_id text,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received',
  idempotency_key text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists pilot_crm.integration_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references pilot_crm.advanced_workspaces(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  idempotency_key text not null,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists pilot_crm.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references pilot_crm.advanced_workspaces(id) on delete set null,
  actor_user_id uuid,
  action_code text not null,
  entity_type text not null,
  entity_id uuid,
  from_state text,
  to_state text,
  request_id text,
  ip_address inet,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists accounts_owner_idx on pilot_crm.accounts(owner_user_id);
create index if not exists deals_account_stage_idx on pilot_crm.deals(account_id, stage, expected_close_date);
create index if not exists deals_activation_idx on pilot_crm.deals(sale_type, requires_implementation, requested_credit_limit);
create index if not exists credit_profiles_account_status_idx on pilot_crm.credit_profiles(account_id, status);
create index if not exists workspaces_account_status_idx on pilot_crm.advanced_workspaces(account_id, status);
create index if not exists workspaces_due_idx on pilot_crm.advanced_workspaces(planned_due_date) where status not in ('completed', 'cancelled');
create index if not exists participants_user_workspace_idx on pilot_crm.workspace_participants(user_id, workspace_id) where can_view = true;
create index if not exists work_items_workspace_status_due_idx on pilot_crm.work_items(workspace_id, status, due_date, sort_key);
create index if not exists work_items_owner_due_idx on pilot_crm.work_items(owner_user_id, due_date) where status not in ('done', 'cancelled');
create index if not exists workflow_steps_assignee_due_idx on pilot_crm.workflow_steps(assigned_user_id, due_at) where status = 'pending';
create index if not exists admin_members_level_idx on pilot_crm.admin_members(admin_level, status);
create index if not exists project_templates_status_category_idx on pilot_crm.project_templates(status, category, updated_at desc);
create index if not exists template_versions_template_status_idx on pilot_crm.project_template_versions(template_id, status, version_no desc);
create index if not exists template_phases_version_order_idx on pilot_crm.project_template_phases(template_version_id, phase_order);
create index if not exists template_timeline_phase_order_idx on pilot_crm.project_template_phase_timeline(template_phase_id, item_order);
create index if not exists template_checklists_phase_order_idx on pilot_crm.project_template_checklists(template_phase_id, item_order);
create index if not exists template_approval_logs_template_created_idx on pilot_crm.template_approval_logs(template_id, created_at desc);
create index if not exists pilot_state_snapshots_user_key_idx on pilot_crm.pilot_state_snapshots(user_id, snapshot_key);
create index if not exists event_log_workspace_created_idx on pilot_crm.event_log(workspace_id, created_at desc);
create index if not exists search_documents_vector_idx on pilot_crm.search_documents using gin(search_vector);
create index if not exists search_documents_filters_idx on pilot_crm.search_documents using gin(filters jsonb_path_ops);
create index if not exists rollups_key_date_idx on pilot_crm.dashboard_rollups(rollup_key, metric_date desc);
create index if not exists notification_pending_idx on pilot_crm.notification_outbox(status, next_attempt_at) where status = 'pending';
create index if not exists integration_outbox_pending_idx on pilot_crm.integration_outbox(status, next_attempt_at) where status = 'pending';
create index if not exists audit_workspace_created_idx on pilot_crm.audit_logs(workspace_id, created_at desc);

create trigger accounts_set_updated_at before update on pilot_crm.accounts
for each row execute function pilot_crm.set_updated_at();

create trigger contacts_set_updated_at before update on pilot_crm.contacts
for each row execute function pilot_crm.set_updated_at();

create trigger deals_set_updated_at before update on pilot_crm.deals
for each row execute function pilot_crm.set_updated_at();

create trigger credit_profiles_set_updated_at before update on pilot_crm.credit_profiles
for each row execute function pilot_crm.set_updated_at();

create trigger workspaces_set_updated_at before update on pilot_crm.advanced_workspaces
for each row execute function pilot_crm.set_updated_at();

create trigger workflow_instances_set_updated_at before update on pilot_crm.workflow_instances
for each row execute function pilot_crm.set_updated_at();

create trigger workflow_steps_set_updated_at before update on pilot_crm.workflow_steps
for each row execute function pilot_crm.set_updated_at();

create trigger work_items_set_updated_at before update on pilot_crm.work_items
for each row execute function pilot_crm.set_updated_at();

create trigger admin_members_set_updated_at before update on pilot_crm.admin_members
for each row execute function pilot_crm.set_updated_at();

create trigger project_templates_set_updated_at before update on pilot_crm.project_templates
for each row execute function pilot_crm.set_updated_at();

create trigger project_template_versions_set_updated_at before update on pilot_crm.project_template_versions
for each row execute function pilot_crm.set_updated_at();

create trigger project_template_phases_set_updated_at before update on pilot_crm.project_template_phases
for each row execute function pilot_crm.set_updated_at();

create trigger pilot_state_snapshots_set_updated_at before update on pilot_crm.pilot_state_snapshots
for each row execute function pilot_crm.set_updated_at();

create trigger notification_outbox_set_updated_at before update on pilot_crm.notification_outbox
for each row execute function pilot_crm.set_updated_at();

create trigger integration_outbox_set_updated_at before update on pilot_crm.integration_outbox
for each row execute function pilot_crm.set_updated_at();

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
      and wp.user_id = auth.uid()
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
    where am.user_id = auth.uid()
      and am.status = 'active'
      and (
        am.admin_level = p_level
        or (p_level = 'lv2' and am.admin_level = 'lv1')
      )
  );
$$;

create or replace function pilot_crm.propose_project_template(
  p_template_name text,
  p_category text,
  p_direction text,
  p_scope text,
  p_phases jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pilot_crm, public
as $$
declare
  v_template_id uuid;
  v_version_id uuid;
  v_phase record;
  v_phase_id uuid;
  v_timeline_title text;
  v_checklist_title text;
begin
  insert into pilot_crm.project_templates (
    template_code,
    template_name,
    category,
    direction,
    status,
    current_version,
    scope,
    approval_note,
    created_by,
    updated_by
  )
  values (
    'TPL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    p_template_name,
    coalesce(nullif(p_category, ''), 'CRM'),
    coalesce(nullif(p_direction, ''), 'hybrid'),
    'lv2_review',
    1,
    coalesce(p_scope, ''),
    'Template mới được đề xuất, chờ Admin LV2 kiểm tra.',
    auth.uid(),
    auth.uid()
  )
  returning id into v_template_id;

  insert into pilot_crm.project_template_versions (
    template_id,
    version_no,
    status,
    snapshot,
    approval_note,
    created_by
  )
  values (
    v_template_id,
    1,
    'lv2_review',
    coalesce(p_phases, '[]'::jsonb),
    'Template mới được đề xuất, chờ Admin LV2 kiểm tra.',
    auth.uid()
  )
  returning id into v_version_id;

  for v_phase in
    select *
    from jsonb_to_recordset(coalesce(p_phases, '[]'::jsonb)) as x(
      phase_order int,
      title text,
      owner_role_code text,
      receiver_role_code text,
      handoff_role_code text,
      span_weeks int,
      acceptance_rule text,
      timeline jsonb,
      checklists jsonb
    )
  loop
    insert into pilot_crm.project_template_phases (
      template_version_id,
      phase_order,
      title,
      owner_role_code,
      receiver_role_code,
      handoff_role_code,
      span_weeks,
      acceptance_rule
    )
    values (
      v_version_id,
      coalesce(v_phase.phase_order, 1),
      v_phase.title,
      coalesce(v_phase.owner_role_code, 'owner'),
      coalesce(v_phase.receiver_role_code, 'receiver'),
      coalesce(v_phase.handoff_role_code, 'approver'),
      greatest(coalesce(v_phase.span_weeks, 1), 1),
      coalesce(v_phase.acceptance_rule, '')
    )
    returning id into v_phase_id;

    for v_timeline_title in
      select value::text from jsonb_array_elements_text(coalesce(v_phase.timeline, '[]'::jsonb))
    loop
      insert into pilot_crm.project_template_phase_timeline (
        template_phase_id,
        item_order,
        title
      )
      values (
        v_phase_id,
        coalesce((select max(item_order) + 1 from pilot_crm.project_template_phase_timeline where template_phase_id = v_phase_id), 1),
        v_timeline_title
      );
    end loop;

    for v_checklist_title in
      select value::text from jsonb_array_elements_text(coalesce(v_phase.checklists, '[]'::jsonb))
    loop
      insert into pilot_crm.project_template_checklists (
        template_phase_id,
        item_order,
        title
      )
      values (
        v_phase_id,
        coalesce((select max(item_order) + 1 from pilot_crm.project_template_checklists where template_phase_id = v_phase_id), 1),
        v_checklist_title
      );
    end loop;
  end loop;

  insert into pilot_crm.template_approval_logs (
    template_id,
    template_version_id,
    actor_user_id,
    action_code,
    to_status,
    note,
    payload
  )
  values (
    v_template_id,
    v_version_id,
    auth.uid(),
    'propose',
    'lv2_review',
    'Đề xuất template từ cấu hình dự án.',
    jsonb_build_object('phase_count', jsonb_array_length(coalesce(p_phases, '[]'::jsonb)))
  );

  return v_template_id;
end;
$$;

create or replace function pilot_crm.update_project_template(
  p_template_id uuid,
  p_scope text,
  p_phases jsonb
)
returns int
language plpgsql
security definer
set search_path = pilot_crm, public
as $$
declare
  v_template pilot_crm.project_templates%rowtype;
  v_next_version int;
  v_version_id uuid;
  v_phase record;
  v_phase_id uuid;
  v_timeline_title text;
  v_checklist_title text;
begin
  select * into v_template
  from pilot_crm.project_templates
  where id = p_template_id
  for update;

  if not found then
    raise exception 'Không tìm thấy template';
  end if;

  if v_template.created_by is distinct from auth.uid()
     and not (pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1')) then
    raise exception 'Không có quyền cập nhật template';
  end if;

  v_next_version := v_template.current_version + 1;

  insert into pilot_crm.project_template_versions (
    template_id,
    version_no,
    status,
    snapshot,
    approval_note,
    created_by
  )
  values (
    p_template_id,
    v_next_version,
    'lv2_review',
    coalesce(p_phases, '[]'::jsonb),
    'Template được cập nhật, chờ Admin LV2 duyệt lại.',
    auth.uid()
  )
  returning id into v_version_id;

  for v_phase in
    select *
    from jsonb_to_recordset(coalesce(p_phases, '[]'::jsonb)) as x(
      phase_order int,
      title text,
      owner_role_code text,
      receiver_role_code text,
      handoff_role_code text,
      span_weeks int,
      acceptance_rule text,
      timeline jsonb,
      checklists jsonb
    )
  loop
    insert into pilot_crm.project_template_phases (
      template_version_id,
      phase_order,
      title,
      owner_role_code,
      receiver_role_code,
      handoff_role_code,
      span_weeks,
      acceptance_rule
    )
    values (
      v_version_id,
      coalesce(v_phase.phase_order, 1),
      v_phase.title,
      coalesce(v_phase.owner_role_code, 'owner'),
      coalesce(v_phase.receiver_role_code, 'receiver'),
      coalesce(v_phase.handoff_role_code, 'approver'),
      greatest(coalesce(v_phase.span_weeks, 1), 1),
      coalesce(v_phase.acceptance_rule, '')
    )
    returning id into v_phase_id;

    for v_timeline_title in
      select value::text from jsonb_array_elements_text(coalesce(v_phase.timeline, '[]'::jsonb))
    loop
      insert into pilot_crm.project_template_phase_timeline (
        template_phase_id,
        item_order,
        title
      )
      values (
        v_phase_id,
        coalesce((select max(item_order) + 1 from pilot_crm.project_template_phase_timeline where template_phase_id = v_phase_id), 1),
        v_timeline_title
      );
    end loop;

    for v_checklist_title in
      select value::text from jsonb_array_elements_text(coalesce(v_phase.checklists, '[]'::jsonb))
    loop
      insert into pilot_crm.project_template_checklists (
        template_phase_id,
        item_order,
        title
      )
      values (
        v_phase_id,
        coalesce((select max(item_order) + 1 from pilot_crm.project_template_checklists where template_phase_id = v_phase_id), 1),
        v_checklist_title
      );
    end loop;
  end loop;

  update pilot_crm.project_templates
  set current_version = v_next_version,
      status = 'lv2_review',
      scope = coalesce(p_scope, scope),
      approval_note = 'Template được cập nhật, chờ Admin LV2 duyệt lại.',
      updated_by = auth.uid(),
      published_at = null
  where id = p_template_id;

  insert into pilot_crm.template_approval_logs (
    template_id,
    template_version_id,
    actor_user_id,
    action_code,
    from_status,
    to_status,
    note,
    payload
  )
  values (
    p_template_id,
    v_version_id,
    auth.uid(),
    'update',
    v_template.status,
    'lv2_review',
    'Cập nhật template từ cấu hình dự án.',
    jsonb_build_object('version_no', v_next_version, 'phase_count', jsonb_array_length(coalesce(p_phases, '[]'::jsonb)))
  );

  return v_next_version;
end;
$$;

create or replace function pilot_crm.approve_project_template(
  p_template_id uuid,
  p_level text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = pilot_crm, public
as $$
declare
  v_template pilot_crm.project_templates%rowtype;
  v_version_id uuid;
  v_from_status text;
  v_to_status text;
begin
  if p_level not in ('lv1', 'lv2') then
    raise exception 'Cấp duyệt không hợp lệ';
  end if;

  if not pilot_crm.is_template_admin(p_level) then
    raise exception 'Không có quyền duyệt template cấp %', p_level;
  end if;

  select * into v_template
  from pilot_crm.project_templates
  where id = p_template_id
  for update;

  if not found then
    raise exception 'Không tìm thấy template';
  end if;

  select id into v_version_id
  from pilot_crm.project_template_versions
  where template_id = p_template_id
    and version_no = v_template.current_version
  for update;

  v_from_status := v_template.status;

  if p_level = 'lv2' then
    if v_template.status <> 'lv2_review' then
      raise exception 'Template không ở trạng thái chờ Admin LV2';
    end if;
    v_to_status := 'lv1_review';
    update pilot_crm.project_template_versions
    set status = v_to_status,
        lv2_approved_by = auth.uid(),
        lv2_approved_at = now(),
        lv1_approved_by = null,
        lv1_approved_at = null,
        approval_note = coalesce(nullif(p_note, ''), 'Admin LV2 đã duyệt.')
    where id = v_version_id;
    update pilot_crm.project_templates
    set status = v_to_status,
        approval_note = coalesce(nullif(p_note, ''), 'Admin LV2 đã duyệt, chờ Admin LV1.'),
        updated_by = auth.uid()
    where id = p_template_id;
  else
    if v_template.status <> 'lv1_review' then
      raise exception 'Template không ở trạng thái chờ Admin LV1';
    end if;
    v_to_status := 'published';
    update pilot_crm.project_template_versions
    set status = v_to_status,
        lv1_approved_by = auth.uid(),
        lv1_approved_at = now(),
        approval_note = coalesce(nullif(p_note, ''), 'Admin LV1 đã xuất bản template.')
    where id = v_version_id;
    update pilot_crm.project_templates
    set status = v_to_status,
        published_at = now(),
        approval_note = coalesce(nullif(p_note, ''), 'Template đã được Admin LV1 xuất bản.'),
        updated_by = auth.uid()
    where id = p_template_id;
  end if;

  insert into pilot_crm.template_approval_logs (
    template_id,
    template_version_id,
    actor_user_id,
    action_code,
    from_status,
    to_status,
    note
  )
  values (
    p_template_id,
    v_version_id,
    auth.uid(),
    case when p_level = 'lv2' then 'lv2_approve' else 'lv1_approve' end,
    v_from_status,
    v_to_status,
    coalesce(p_note, '')
  );
end;
$$;

create or replace function pilot_crm.return_project_template(
  p_template_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = pilot_crm, public
as $$
declare
  v_template pilot_crm.project_templates%rowtype;
  v_version_id uuid;
begin
  if not (pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1')) then
    raise exception 'Không có quyền trả template';
  end if;

  select * into v_template
  from pilot_crm.project_templates
  where id = p_template_id
  for update;

  if not found then
    raise exception 'Không tìm thấy template';
  end if;

  select id into v_version_id
  from pilot_crm.project_template_versions
  where template_id = p_template_id
    and version_no = v_template.current_version
  for update;

  update pilot_crm.project_template_versions
  set status = 'returned',
      approval_note = coalesce(nullif(p_note, ''), 'Template bị trả lại để bổ sung.')
  where id = v_version_id;

  update pilot_crm.project_templates
  set status = 'returned',
      approval_note = coalesce(nullif(p_note, ''), 'Template bị trả lại để bổ sung.'),
      updated_by = auth.uid()
  where id = p_template_id;

  insert into pilot_crm.template_approval_logs (
    template_id,
    template_version_id,
    actor_user_id,
    action_code,
    from_status,
    to_status,
    note
  )
  values (
    p_template_id,
    v_version_id,
    auth.uid(),
    'return',
    v_template.status,
    'returned',
    coalesce(p_note, '')
  );
end;
$$;

create or replace function pilot_crm.apply_project_template_to_workspace(
  p_workspace_id uuid,
  p_template_id uuid
)
returns void
language plpgsql
security definer
set search_path = pilot_crm, public
as $$
declare
  v_template pilot_crm.project_templates%rowtype;
  v_version_id uuid;
  v_phase record;
  v_work_item_id uuid;
  v_timeline record;
  v_checklist record;
begin
  if not pilot_crm.can_access_workspace(p_workspace_id) then
    raise exception 'Không có quyền áp template vào workspace';
  end if;

  select * into v_template
  from pilot_crm.project_templates
  where id = p_template_id;

  if not found or v_template.status <> 'published' then
    raise exception 'Template chưa được xuất bản';
  end if;

  select id into v_version_id
  from pilot_crm.project_template_versions
  where template_id = p_template_id
    and version_no = v_template.current_version
    and status = 'published';

  if v_version_id is null then
    raise exception 'Không tìm thấy version template đã xuất bản';
  end if;

  for v_phase in
    select *
    from pilot_crm.project_template_phases
    where template_version_id = v_version_id
    order by phase_order
  loop
    insert into pilot_crm.work_items (
      workspace_id,
      title,
      item_type,
      status,
      priority,
      sort_key,
      progress_pct,
      metadata
    )
    values (
      p_workspace_id,
      v_phase.title,
      'gantt_phase',
      'planned',
      'normal',
      v_phase.phase_order,
      0,
      jsonb_build_object(
        'template_id', p_template_id,
        'template_version_id', v_version_id,
        'span_weeks', v_phase.span_weeks,
        'owner_role_code', v_phase.owner_role_code,
        'receiver_role_code', v_phase.receiver_role_code,
        'handoff_role_code', v_phase.handoff_role_code,
        'acceptance_rule', v_phase.acceptance_rule
      )
    )
    returning id into v_work_item_id;

    for v_timeline in
      select *
      from pilot_crm.project_template_phase_timeline
      where template_phase_id = v_phase.id
      order by item_order
    loop
      insert into pilot_crm.work_items (
        workspace_id,
        parent_id,
        title,
        item_type,
        status,
        sort_key,
        metadata
      )
      values (
        p_workspace_id,
        v_work_item_id,
        v_timeline.title,
        'timeline_item',
        'todo',
        v_timeline.item_order,
        jsonb_build_object(
          'owner_role_code', v_timeline.owner_role_code,
          'default_due_offset_days', v_timeline.default_due_offset_days
        )
      );
    end loop;

    for v_checklist in
      select *
      from pilot_crm.project_template_checklists
      where template_phase_id = v_phase.id
      order by item_order
    loop
      insert into pilot_crm.work_items (
        workspace_id,
        parent_id,
        title,
        item_type,
        status,
        sort_key,
        metadata
      )
      values (
        p_workspace_id,
        v_work_item_id,
        v_checklist.title,
        'checklist_item',
        'todo',
        v_checklist.item_order,
        jsonb_build_object(
          'require_executor_tick', v_checklist.require_executor_tick,
          'require_approver_tick', v_checklist.require_approver_tick
        )
      );
    end loop;
  end loop;

  insert into pilot_crm.template_approval_logs (
    template_id,
    template_version_id,
    actor_user_id,
    action_code,
    to_status,
    note,
    payload
  )
  values (
    p_template_id,
    v_version_id,
    auth.uid(),
    'apply',
    'published',
    'Áp template vào workspace.',
    jsonb_build_object('workspace_id', p_workspace_id)
  );
end;
$$;

alter table pilot_crm.accounts enable row level security;
alter table pilot_crm.contacts enable row level security;
alter table pilot_crm.deals enable row level security;
alter table pilot_crm.credit_profiles enable row level security;
alter table pilot_crm.advanced_workspaces enable row level security;
alter table pilot_crm.workspace_participants enable row level security;
alter table pilot_crm.workflow_instances enable row level security;
alter table pilot_crm.workflow_steps enable row level security;
alter table pilot_crm.work_items enable row level security;
alter table pilot_crm.work_item_dependencies enable row level security;
alter table pilot_crm.admin_members enable row level security;
alter table pilot_crm.project_templates enable row level security;
alter table pilot_crm.project_template_versions enable row level security;
alter table pilot_crm.project_template_phases enable row level security;
alter table pilot_crm.project_template_phase_timeline enable row level security;
alter table pilot_crm.project_template_checklists enable row level security;
alter table pilot_crm.template_approval_logs enable row level security;
alter table pilot_crm.pilot_state_snapshots enable row level security;
alter table pilot_crm.event_log enable row level security;
alter table pilot_crm.search_documents enable row level security;
alter table pilot_crm.dashboard_rollups enable row level security;
alter table pilot_crm.notification_outbox enable row level security;
alter table pilot_crm.integration_inbox enable row level security;
alter table pilot_crm.integration_outbox enable row level security;
alter table pilot_crm.audit_logs enable row level security;

create policy "participants can read workspaces"
on pilot_crm.advanced_workspaces
for select
using (pilot_crm.can_access_workspace(id));

create policy "participants can read work items"
on pilot_crm.work_items
for select
using (pilot_crm.can_access_workspace(workspace_id));

create policy "participants can read workflow instances"
on pilot_crm.workflow_instances
for select
using (pilot_crm.can_access_workspace(workspace_id));

create policy "participants can read audit"
on pilot_crm.audit_logs
for select
using (workspace_id is not null and pilot_crm.can_access_workspace(workspace_id));

create policy "participants can read search docs"
on pilot_crm.search_documents
for select
using (workspace_id is null or pilot_crm.can_access_workspace(workspace_id));

create policy "users can read published templates"
on pilot_crm.project_templates
for select
using (status = 'published' or pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1'));

create policy "users can read readable template versions"
on pilot_crm.project_template_versions
for select
using (
  exists (
    select 1
    from pilot_crm.project_templates pt
    where pt.id = project_template_versions.template_id
      and (pt.status = 'published' or pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1'))
  )
);

create policy "users can read readable template phases"
on pilot_crm.project_template_phases
for select
using (
  exists (
    select 1
    from pilot_crm.project_template_versions tv
    join pilot_crm.project_templates pt on pt.id = tv.template_id
    where tv.id = project_template_phases.template_version_id
      and (pt.status = 'published' or pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1'))
  )
);

create policy "users can read readable template timeline"
on pilot_crm.project_template_phase_timeline
for select
using (
  exists (
    select 1
    from pilot_crm.project_template_phases tp
    join pilot_crm.project_template_versions tv on tv.id = tp.template_version_id
    join pilot_crm.project_templates pt on pt.id = tv.template_id
    where tp.id = project_template_phase_timeline.template_phase_id
      and (pt.status = 'published' or pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1'))
  )
);

create policy "users can read readable template checklists"
on pilot_crm.project_template_checklists
for select
using (
  exists (
    select 1
    from pilot_crm.project_template_phases tp
    join pilot_crm.project_template_versions tv on tv.id = tp.template_version_id
    join pilot_crm.project_templates pt on pt.id = tv.template_id
    where tp.id = project_template_checklists.template_phase_id
      and (pt.status = 'published' or pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1'))
  )
);

create policy "admins can read template approval logs"
on pilot_crm.template_approval_logs
for select
using (pilot_crm.is_template_admin('lv2') or pilot_crm.is_template_admin('lv1'));

create policy "admins can read admin member rows"
on pilot_crm.admin_members
for select
using (pilot_crm.is_template_admin('lv1') or user_id = auth.uid());

create policy "users can manage own pilot snapshots"
on pilot_crm.pilot_state_snapshots
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users can read own notifications"
on pilot_crm.notification_outbox
for select
using (recipient_user_id = auth.uid());

create policy "users can read own participant rows"
on pilot_crm.workspace_participants
for select
using (user_id = auth.uid());

-- Mutation production nên đi qua API/RPC service-role hoặc security definer function.
-- Không mở policy insert/update rộng trong bản pilot để tránh ghi sai core invariant.
