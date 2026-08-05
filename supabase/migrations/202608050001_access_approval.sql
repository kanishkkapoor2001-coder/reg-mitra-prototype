-- Manual-approval access control.
--
-- Payment is collected offline, so signing in is not the same as being allowed
-- in. Anyone may authenticate with Google or Microsoft; the resulting account
-- stays in `pending` until an operator approves it. The product routes read
-- this table on every request, so approval takes effect on the next page load
-- with no re-login.

create type public.access_state as enum ('pending', 'approved', 'rejected');

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text not null,
  normalized_email text not null unique,
  full_name text,
  avatar_url text,
  provider text,
  organization_name text,
  status public.access_state not null default 'pending',
  notes text,
  requested_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);

create index access_requests_status_idx
  on public.access_requests(status, requested_at desc);

alter table public.access_requests enable row level security;

-- Contact data: reachable only by trusted server code using the service role.
-- No policies are defined, so the anon and authenticated roles get nothing.
revoke all on public.access_requests from anon, authenticated;

-- Records a sign-in and returns the caller's current standing.
--
-- `is_new` drives the operator notification: it is true only the first time an
-- email is seen, so repeat sign-ins never re-notify. An existing row's status
-- is never modified here — only an operator changes that.
create or replace function public.record_access_request(
  request_auth_user_id uuid,
  request_email text,
  request_full_name text default null,
  request_avatar_url text default null,
  request_provider text default null
)
returns table (status public.access_state, is_new boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(btrim(request_email));
  existing public.access_requests%rowtype;
begin
  if normalized = '' or position('@' in normalized) = 0 then
    raise exception 'invalid email';
  end if;

  select * into existing
    from public.access_requests
   where normalized_email = normalized;

  if found then
    update public.access_requests
       set last_seen_at = now(),
           auth_user_id = coalesce(request_auth_user_id, auth_user_id),
           full_name = coalesce(full_name, request_full_name),
           avatar_url = coalesce(request_avatar_url, avatar_url),
           provider = coalesce(provider, request_provider)
     where id = existing.id;

    return query select existing.status, false;
  end if;

  insert into public.access_requests (
    auth_user_id, email, normalized_email, full_name, avatar_url, provider
  ) values (
    request_auth_user_id, btrim(request_email), normalized,
    nullif(btrim(coalesce(request_full_name, '')), ''),
    nullif(btrim(coalesce(request_avatar_url, '')), ''),
    nullif(btrim(coalesce(request_provider, '')), '')
  );

  return query select 'pending'::public.access_state, true;
end;
$$;

revoke all on function public.record_access_request(uuid, text, text, text, text) from public;
grant execute on function public.record_access_request(uuid, text, text, text, text) to service_role;

-- Read-only standing check used by the request path on every product page.
create or replace function public.access_status(request_email text)
returns public.access_state
language sql
security definer
set search_path = public
as $$
  select status
    from public.access_requests
   where normalized_email = lower(btrim(request_email));
$$;

revoke all on function public.access_status(text) from public;
grant execute on function public.access_status(text) to service_role;

-- Operators are approved up front so a locked-out owner is impossible.
insert into public.access_requests (email, normalized_email, full_name, status, decided_at, decided_by)
values
  ('kanishk@learno.ai', 'kanishk@learno.ai', 'Kanishk Kapoor', 'approved', now(), 'seed'),
  ('kanishk@5avenures.in', 'kanishk@5avenures.in', 'Kanishk Kapoor', 'approved', now(), 'seed')
on conflict (normalized_email) do nothing;
