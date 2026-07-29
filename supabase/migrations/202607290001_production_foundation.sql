-- Reg Mitra production foundation
-- Supabase Postgres migration: identity, tenancy, compliance workflow and audit.

create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.workspace_role as enum ('owner', 'admin', 'reviewer', 'member', 'viewer');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'expired');
create type public.review_state as enum ('not_reviewed', 'in_review', 'approved', 'rejected');
create type public.task_state as enum ('open', 'in_progress', 'blocked', 'completed', 'dismissed');
create type public.source_state as enum ('current', 'superseded', 'withdrawn', 'unverified');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  provider_customer_id text unique,
  provider_subscription_id text unique,
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 1 and 240),
  display_name text not null check (char_length(display_name) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'archived')),
  sector text,
  state_code text,
  created_by uuid not null references auth.users(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_workspace_idx on public.clients(workspace_id, status, display_name);

create table public.client_identifiers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('gstin', 'pan', 'cin', 'llpin', 'tan', 'fssai', 'rbi', 'other')),
  value_ciphertext text not null,
  value_fingerprint text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, kind, value_fingerprint)
);

create table public.client_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  fact_key text not null,
  value jsonb not null,
  valid_from date,
  valid_to date,
  source_label text,
  source_url text,
  recorded_by uuid not null references auth.users(id),
  recorded_at timestamptz not null default now(),
  superseded_at timestamptz
);
create index client_facts_current_idx
  on public.client_facts(workspace_id, client_id, fact_key)
  where superseded_at is null;

create table public.regulatory_sources (
  id uuid primary key default gen_random_uuid(),
  authority text not null,
  canonical_url text not null unique,
  title text not null,
  publication_reference text,
  published_at timestamptz,
  effective_from date,
  effective_to date,
  state public.source_state not null default 'unverified',
  content_sha256 text,
  retrieved_at timestamptz not null,
  supersedes_source_id uuid references public.regulatory_sources(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index regulatory_sources_authority_date_idx
  on public.regulatory_sources(authority, published_at desc);

create table public.regulatory_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.regulatory_sources(id) on delete cascade,
  parser_version text not null,
  content text not null,
  content_sha256 text not null,
  parse_status text not null check (parse_status in ('ready', 'partial', 'failed')),
  parse_notes text,
  created_at timestamptz not null default now(),
  unique (source_id, content_sha256, parser_version)
);

create table public.regulatory_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.regulatory_documents(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  heading text,
  provision text,
  content text not null,
  embedding vector(768),
  token_count integer check (token_count is null or token_count > 0),
  created_at timestamptz not null default now(),
  unique (document_id, ordinal)
);
create index regulatory_chunks_embedding_idx
  on public.regulatory_chunks using hnsw (embedding vector_cosine_ops);

create table public.client_regulatory_impacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  source_id uuid not null references public.regulatory_sources(id),
  applicability text not null,
  applicability_evidence jsonb not null default '[]'::jsonb,
  confidence numeric(4,3) check (confidence between 0 and 1),
  review_state public.review_state not null default 'not_reviewed',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, client_id, source_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  impact_id uuid references public.client_regulatory_impacts(id) on delete set null,
  title text not null check (char_length(title) between 1 and 280),
  description text,
  state public.task_state not null default 'open',
  priority smallint not null default 2 check (priority between 0 and 3),
  due_at timestamptz,
  assigned_to uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_queue_idx on public.tasks(workspace_id, state, priority desc, due_at);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  title text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  mode text not null default 'ask' check (mode in ('ask', 'act')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  model text,
  prompt_version text,
  review_state public.review_state not null default 'not_reviewed',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

create table public.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  request_id text,
  ip_hash text,
  user_agent text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_workspace_time_idx
  on public.audit_events(workspace_id, created_at desc);

create table public.billing_events (
  provider_event_id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing', 'processed', 'error')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = auth.uid()
  );
$$;

create or replace function public.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships membership
    where membership.workspace_id = target_workspace_id
      and membership.user_id = auth.uid()
      and membership.role = any(allowed_roles)
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.clients enable row level security;
alter table public.client_identifiers enable row level security;
alter table public.client_facts enable row level security;
alter table public.regulatory_sources enable row level security;
alter table public.regulatory_documents enable row level security;
alter table public.regulatory_chunks enable row level security;
alter table public.client_regulatory_impacts enable row level security;
alter table public.tasks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.audit_events enable row level security;
alter table public.billing_events enable row level security;

create policy profiles_self_select on public.profiles
  for select using (user_id = auth.uid());
create policy profiles_self_update on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy workspaces_member_select on public.workspaces
  for select using (public.is_workspace_member(id));
create policy memberships_member_select on public.workspace_memberships
  for select using (public.is_workspace_member(workspace_id));
create policy memberships_admin_write on public.workspace_memberships
  for all using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy subscriptions_member_select on public.subscriptions
  for select using (public.is_workspace_member(workspace_id));

create policy clients_member_select on public.clients
  for select using (public.is_workspace_member(workspace_id));
create policy clients_member_insert on public.clients
  for insert with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
    and created_by = auth.uid()
  );
create policy clients_member_update on public.clients
  for update using (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  ) with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  );

create policy identifiers_member_select on public.client_identifiers
  for select using (public.is_workspace_member(workspace_id));
create policy identifiers_member_insert on public.client_identifiers
  for insert with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
    and created_by = auth.uid()
  );
create policy identifiers_member_update on public.client_identifiers
  for update using (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  ) with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  );
create policy identifiers_admin_delete on public.client_identifiers
  for delete using (
    public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])
  );

create policy facts_member_select on public.client_facts
  for select using (public.is_workspace_member(workspace_id));
create policy facts_member_insert on public.client_facts
  for insert with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
    and recorded_by = auth.uid()
  );
create policy facts_member_update on public.client_facts
  for update using (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  ) with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  );

create policy impacts_member_select on public.client_regulatory_impacts
  for select using (public.is_workspace_member(workspace_id));
create policy impacts_member_insert on public.client_regulatory_impacts
  for insert with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
    and created_by = auth.uid()
  );
create policy impacts_member_update on public.client_regulatory_impacts
  for update using (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  ) with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  );

create policy tasks_member_select on public.tasks
  for select using (public.is_workspace_member(workspace_id));
create policy tasks_member_insert on public.tasks
  for insert with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
    and created_by = auth.uid()
  );
create policy tasks_member_update on public.tasks
  for update using (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  ) with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  );

create policy conversations_member_select on public.conversations
  for select using (public.is_workspace_member(workspace_id));
create policy conversations_member_insert on public.conversations
  for insert with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
    and created_by = auth.uid()
  );
create policy conversations_member_update on public.conversations
  for update using (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  ) with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  );

create policy messages_member_select on public.messages
  for select using (public.is_workspace_member(workspace_id));
create policy messages_member_insert on public.messages
  for insert with check (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer','member']::public.workspace_role[])
  );
create policy audit_member_select on public.audit_events
  for select using (
    public.has_workspace_role(workspace_id, array['owner','admin','reviewer']::public.workspace_role[])
  );

-- Regulatory source tables are intentionally read-only to authenticated product
-- users. Ingestion writes them with a server-only service role.
create policy sources_authenticated_read on public.regulatory_sources
  for select to authenticated using (true);
create policy documents_authenticated_read on public.regulatory_documents
  for select to authenticated using (true);
create policy chunks_authenticated_read on public.regulatory_chunks
  for select to authenticated using (true);

-- Audit events and subscription state are written only through trusted server
-- code using the service role. No client-side insert/update policy is provided.

create or replace function public.create_workspace(workspace_name text, workspace_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(workspace_name)) not between 1 and 160 then
    raise exception 'Invalid workspace name';
  end if;
  if workspace_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(workspace_slug) > 80 then
    raise exception 'Invalid workspace slug';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(workspace_name), workspace_slug, current_user_id)
  returning id into new_workspace_id;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new_workspace_id, current_user_id, 'owner');

  insert into public.subscriptions (workspace_id, status, trial_ends_at)
  values (new_workspace_id, 'trialing', now() + interval '7 days');

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    after_state
  )
  values (
    new_workspace_id,
    current_user_id,
    'workspace.created',
    'workspace',
    new_workspace_id::text,
    jsonb_build_object('name', trim(workspace_name), 'slug', workspace_slug)
  );

  return new_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
grant execute on function public.create_workspace(text, text) to authenticated;

create or replace function public.create_client(
  target_workspace_id uuid,
  legal_name text,
  display_name text,
  sector text default null,
  state_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_client_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not public.has_workspace_role(
    target_workspace_id,
    array['owner','admin','reviewer','member']::public.workspace_role[]
  ) then
    raise exception 'Insufficient workspace role';
  end if;
  if char_length(trim(legal_name)) not between 1 and 240
    or char_length(trim(display_name)) not between 1 and 160 then
    raise exception 'Invalid client name';
  end if;

  insert into public.clients (
    workspace_id,
    legal_name,
    display_name,
    sector,
    state_code,
    created_by
  )
  values (
    target_workspace_id,
    trim(legal_name),
    trim(display_name),
    nullif(trim(sector), ''),
    nullif(upper(trim(state_code)), ''),
    current_user_id
  )
  returning id into new_client_id;

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    after_state
  )
  values (
    target_workspace_id,
    current_user_id,
    'client.created',
    'client',
    new_client_id::text,
    jsonb_build_object(
      'legal_name', trim(legal_name),
      'display_name', trim(display_name),
      'sector', nullif(trim(sector), ''),
      'state_code', nullif(upper(trim(state_code)), '')
    )
  );

  return new_client_id;
end;
$$;

revoke all on function public.create_client(uuid, text, text, text, text) from public;
grant execute on function public.create_client(uuid, text, text, text, text) to authenticated;

create or replace function public.review_task(target_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task public.tasks%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target_task
  from public.tasks
  where id = target_task_id;

  if target_task.id is null
    or not public.has_workspace_role(
      target_task.workspace_id,
      array['owner','admin','reviewer']::public.workspace_role[]
    ) then
    raise exception 'Insufficient workspace role';
  end if;

  update public.tasks
  set reviewed_by = current_user_id,
      reviewed_at = now(),
      updated_at = now()
  where id = target_task_id;

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    after_state
  )
  values (
    target_task.workspace_id,
    current_user_id,
    'task.reviewed',
    'task',
    target_task_id::text,
    jsonb_build_object('reviewed_at', now())
  );
end;
$$;

revoke all on function public.review_task(uuid) from public;
grant execute on function public.review_task(uuid) to authenticated;

create or replace function public.review_message(target_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_message public.messages%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target_message
  from public.messages
  where id = target_message_id
    and role = 'assistant';

  if target_message.id is null
    or not public.has_workspace_role(
      target_message.workspace_id,
      array['owner','admin','reviewer']::public.workspace_role[]
    ) then
    raise exception 'Insufficient workspace role';
  end if;

  update public.messages
  set review_state = 'approved'
  where id = target_message_id;

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    after_state
  )
  values (
    target_message.workspace_id,
    current_user_id,
    'assistant_message.approved',
    'message',
    target_message_id::text,
    jsonb_build_object('review_state', 'approved')
  );
end;
$$;

revoke all on function public.review_message(uuid) from public;
grant execute on function public.review_message(uuid) to authenticated;
