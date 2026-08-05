-- Fix: `return query` does not end a PL/pgSQL function.
--
-- The existing-row branch appended its result and then fell through to the
-- INSERT, so every repeat sign-in raised a duplicate-key error. The callback
-- treats that as "cannot establish standing" and holds the user at /pending —
-- meaning an already-approved firm would be locked out on their second visit.
-- An explicit `return` after each branch is the whole fix.

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
    return;
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
  return;
end;
$$;

revoke all on function public.record_access_request(uuid, text, text, text, text, public.plan_tier) from public;
grant execute on function public.record_access_request(uuid, text, text, text, text, public.plan_tier) to service_role;
