-- Trial lead capture and one-trial-per-organization enforcement.

create type public.trial_request_state as enum (
  'requested',
  'duplicate_organization',
  'approved',
  'declined',
  'activated'
);

alter table public.workspaces
  add column organization_domain text
  check (
    organization_domain is null
    or organization_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  );

create table public.trial_organizations (
  id uuid primary key default gen_random_uuid(),
  normalized_domain text not null unique
    check (normalized_domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'),
  display_name text not null check (char_length(display_name) between 2 and 160),
  workspace_id uuid unique references public.workspaces(id) on delete restrict,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  trial_organization_id uuid not null references public.trial_organizations(id) on delete restrict,
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  email text not null,
  normalized_email text not null unique,
  organization_name text not null check (char_length(organization_name) between 2 and 160),
  organization_domain text not null,
  status public.trial_request_state not null,
  request_count integer not null default 1 check (request_count > 0),
  ip_hash text,
  user_agent text,
  first_requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now()
);

create index trial_requests_organization_idx
  on public.trial_requests(trial_organization_id, last_requested_at desc);

alter table public.trial_organizations enable row level security;
alter table public.trial_requests enable row level security;

-- Trial request records contain contact data and are intentionally accessible
-- only to trusted server code using the service role.

create or replace function public.submit_trial_request(
  request_contact_name text,
  request_email text,
  request_organization_domain text,
  request_organization_name text,
  request_ip_hash text default null,
  request_user_agent text default null
)
returns table(request_id uuid, eligible boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_request_email text := lower(trim(request_email));
  normalized_request_domain text := lower(trim(request_organization_domain));
  organization_id uuid;
  existing_request_id uuid;
  organization_created boolean := false;
begin
  if normalized_request_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or char_length(normalized_request_email) > 254 then
    raise exception 'Invalid email';
  end if;
  if normalized_request_domain !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' then
    raise exception 'Invalid organization domain';
  end if;

  select id into existing_request_id
  from public.trial_requests
  where normalized_email = normalized_request_email;

  if existing_request_id is not null then
    update public.trial_requests
    set request_count = request_count + 1,
        last_requested_at = now()
    where id = existing_request_id;

    return query
      select existing_request_id, status in ('requested', 'approved')
      from public.trial_requests
      where id = existing_request_id;
    return;
  end if;

  insert into public.trial_organizations (normalized_domain, display_name)
  values (normalized_request_domain, trim(request_organization_name))
  on conflict (normalized_domain) do nothing
  returning id into organization_id;

  if organization_id is null then
    select id into organization_id
    from public.trial_organizations
    where normalized_domain = normalized_request_domain;
  else
    organization_created := true;
  end if;

  insert into public.trial_requests (
    trial_organization_id,
    contact_name,
    email,
    normalized_email,
    organization_name,
    organization_domain,
    status,
    ip_hash,
    user_agent
  )
  values (
    organization_id,
    trim(request_contact_name),
    normalized_request_email,
    normalized_request_email,
    trim(request_organization_name),
    normalized_request_domain,
    case
      when organization_created then 'requested'::public.trial_request_state
      else 'duplicate_organization'::public.trial_request_state
    end,
    nullif(trim(request_ip_hash), ''),
    nullif(trim(request_user_agent), '')
  )
  returning id into existing_request_id;

  return query select existing_request_id, organization_created;
end;
$$;

revoke all on function public.submit_trial_request(text, text, text, text, text, text) from public;

drop function public.create_workspace(text, text);

create function public.create_workspace(
  workspace_name text,
  workspace_slug text,
  workspace_domain text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  current_user_id uuid := auth.uid();
  normalized_workspace_domain text := lower(trim(workspace_domain));
  organization_record_id uuid;
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
  if normalized_workspace_domain !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' then
    raise exception 'Invalid organization domain';
  end if;

  select id into organization_record_id
  from public.trial_organizations
  where normalized_domain = normalized_workspace_domain
  for update;

  if organization_record_id is null then
    insert into public.trial_organizations (normalized_domain, display_name)
    values (normalized_workspace_domain, trim(workspace_name))
    returning id into organization_record_id;
  elsif exists (
    select 1
    from public.trial_organizations
    where id = organization_record_id
      and workspace_id is not null
  ) then
    raise exception 'Organization trial already claimed';
  end if;

  insert into public.workspaces (name, slug, organization_domain, created_by)
  values (trim(workspace_name), workspace_slug, normalized_workspace_domain, current_user_id)
  returning id into new_workspace_id;

  update public.trial_organizations
  set workspace_id = new_workspace_id,
      claimed_at = now(),
      updated_at = now()
  where id = organization_record_id;

  update public.trial_requests
  set status = 'activated'::public.trial_request_state,
      last_requested_at = now()
  where trial_organization_id = organization_record_id
    and status in ('requested', 'approved');

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
    jsonb_build_object(
      'name', trim(workspace_name),
      'slug', workspace_slug,
      'organization_domain', normalized_workspace_domain
    )
  );

  return new_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text, text, text) from public;
grant execute on function public.create_workspace(text, text, text) to authenticated;
