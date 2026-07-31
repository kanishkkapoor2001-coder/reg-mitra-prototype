-- Reg Mitra connector foundation
-- Append-only source observations, connector health, and execution truth.

create type public.connector_system as enum ('tally', 'gst', 'income_tax', 'mca');
create type public.connector_mode as enum ('local_companion', 'approved_api', 'browser_bridge');
create type public.connector_status as enum (
  'not_connected',
  'pairing',
  'healthy',
  'attention',
  'offline',
  'disabled'
);
create type public.connector_run_state as enum ('running', 'succeeded', 'partial', 'failed');
create type public.action_truth_state as enum (
  'identified',
  'prepared',
  'awaiting_approval',
  'submitted',
  'verified_complete',
  'pending',
  'manual_confirmation',
  'failed',
  'stale'
);

create table public.connector_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  system public.connector_system not null,
  mode public.connector_mode not null,
  status public.connector_status not null default 'not_connected',
  display_name text not null check (char_length(display_name) between 1 and 160),
  external_account_fingerprint text,
  scopes text[] not null default '{}',
  last_checked_at timestamptz,
  last_succeeded_at timestamptz,
  last_error_code text,
  connector_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, client_id, system)
);
create index connector_accounts_workspace_idx
  on public.connector_accounts(workspace_id, status, system);

create table public.connector_sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connector_account_id uuid not null references public.connector_accounts(id) on delete cascade,
  state public.connector_run_state not null default 'running',
  trigger text not null check (trigger in ('manual', 'scheduled', 'webhook')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  observed_count integer not null default 0 check (observed_count >= 0),
  error_code text,
  error_detail_safe text,
  request_id text,
  connector_version text,
  created_at timestamptz not null default now()
);
create index connector_sync_runs_account_time_idx
  on public.connector_sync_runs(connector_account_id, started_at desc);

create table public.connector_observations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  connector_account_id uuid references public.connector_accounts(id) on delete set null,
  sync_run_id uuid references public.connector_sync_runs(id) on delete set null,
  obligation_key text not null check (char_length(obligation_key) between 1 and 180),
  period_key text not null check (char_length(period_key) between 1 and 80),
  state public.action_truth_state not null,
  source_reference text,
  receipt_reference text,
  source_url text,
  observed_at timestamptz not null,
  fresh_until timestamptz not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_summary jsonb not null default '{}'::jsonb,
  connector_version text not null,
  created_at timestamptz not null default now(),
  constraint submitted_requires_receipt check (
    state <> 'submitted' or nullif(trim(receipt_reference), '') is not null
  ),
  constraint verified_requires_source check (
    state <> 'verified_complete'
    or (
      nullif(trim(source_reference), '') is not null
      and connector_account_id is not null
    )
  )
);
create index connector_observations_latest_idx
  on public.connector_observations(
    workspace_id,
    client_id,
    obligation_key,
    period_key,
    observed_at desc
  );

create view public.latest_connector_observations
with (security_invoker = true)
as
select distinct on (
  observation.workspace_id,
  observation.client_id,
  observation.obligation_key,
  observation.period_key
)
  observation.*
from public.connector_observations observation
order by
  observation.workspace_id,
  observation.client_id,
  observation.obligation_key,
  observation.period_key,
  observation.observed_at desc;

alter table public.connector_accounts enable row level security;
alter table public.connector_sync_runs enable row level security;
alter table public.connector_observations enable row level security;

create policy connector_accounts_member_select on public.connector_accounts
  for select using (public.is_workspace_member(workspace_id));
create policy connector_accounts_admin_write on public.connector_accounts
  for all using (
    public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])
  ) with check (
    public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])
    and created_by = auth.uid()
  );

create policy connector_runs_member_select on public.connector_sync_runs
  for select using (public.is_workspace_member(workspace_id));
create policy connector_observations_member_select on public.connector_observations
  for select using (public.is_workspace_member(workspace_id));

-- Sync runs and source observations are append-only from trusted connector
-- services using the service role. Browser clients cannot manufacture a
-- source-verified or submitted status.
