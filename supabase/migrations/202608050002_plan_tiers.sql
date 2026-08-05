-- Plan tiers and their enforced limits.
--
-- Two paid tiers. The 7-day free trial is not a tier of its own — it grants
-- base-tier (Pro) access for a week, so a trialling firm and a paying Pro firm
-- see exactly the same product and the same client-book limit.

create type public.plan_tier as enum ('pro', 'ultra');

-- What the visitor asked for at signup, so approval is an informed decision.
alter table public.access_requests
  add column requested_tier public.plan_tier not null default 'pro';

-- What the workspace was actually granted.
alter table public.subscriptions
  add column tier public.plan_tier not null default 'pro';

-- Replaces the earlier signature: the signup path now supplies a tier.
drop function if exists public.record_access_request(uuid, text, text, text, text);

create or replace function public.record_access_request(
  request_auth_user_id uuid,
  request_email text,
  request_full_name text default null,
  request_avatar_url text default null,
  request_provider text default null,
  request_tier public.plan_tier default 'pro'
)
returns table (status public.access_state, is_new boolean, requested_tier public.plan_tier)
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
    -- A returning visitor may have changed their mind about the plan, but an
    -- already-decided account keeps the tier the operator approved.
    update public.access_requests
       set last_seen_at = now(),
           auth_user_id = coalesce(request_auth_user_id, auth_user_id),
           full_name = coalesce(full_name, request_full_name),
           avatar_url = coalesce(request_avatar_url, avatar_url),
           provider = coalesce(provider, request_provider),
           requested_tier = case
             when existing.status = 'pending' then request_tier
             else existing.requested_tier
           end
     where id = existing.id;

    return query select existing.status, false, existing.requested_tier;
  end if;

  insert into public.access_requests (
    auth_user_id, email, normalized_email, full_name, avatar_url, provider, requested_tier
  ) values (
    request_auth_user_id, btrim(request_email), normalized,
    nullif(btrim(coalesce(request_full_name, '')), ''),
    nullif(btrim(coalesce(request_avatar_url, '')), ''),
    nullif(btrim(coalesce(request_provider, '')), ''),
    request_tier
  );

  return query select 'pending'::public.access_state, true, request_tier;
end;
$$;

revoke all on function public.record_access_request(uuid, text, text, text, text, public.plan_tier) from public;
grant execute on function public.record_access_request(uuid, text, text, text, text, public.plan_tier) to service_role;

-- Enforce the client-book limit in the database, not only in the UI: a tier cap
-- that lives only in the app is bypassed by any other caller.
create or replace function public.workspace_client_limit(target_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  -- null means unlimited
  select case coalesce(s.tier, 'pro')
           when 'ultra' then null
           else 6
         end
    from public.workspaces w
    left join public.subscriptions s on s.workspace_id = w.id
   where w.id = target_workspace_id;
$$;

grant execute on function public.workspace_client_limit(uuid) to authenticated, service_role;

create or replace function public.enforce_client_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed integer := public.workspace_client_limit(new.workspace_id);
  used integer;
begin
  if allowed is null then
    return new;
  end if;

  select count(*) into used
    from public.clients
   where workspace_id = new.workspace_id
     and status = 'active';

  if used >= allowed then
    raise exception 'client_limit_reached'
      using hint = 'This plan covers ' || allowed || ' client companies.';
  end if;

  return new;
end;
$$;

drop trigger if exists clients_enforce_limit on public.clients;
create trigger clients_enforce_limit
  before insert on public.clients
  for each row execute function public.enforce_client_limit();
