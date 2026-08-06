-- P0 SECURITY FIX — privileged functions were callable by anonymous users.
--
-- Root cause: Supabase grants EXECUTE on new public-schema functions to the
-- `anon` and `authenticated` roles by default. Earlier migrations wrote
--     revoke all on function ... from public;
--     grant execute on function ... to service_role;
-- which removes the PUBLIC grant but leaves the explicit anon/authenticated
-- grants in place. Those functions are SECURITY DEFINER, so they ran with
-- owner rights and bypassed RLS.
--
-- Proven exploitable before this fix: a caller holding only the public anon key
-- (which ships in the browser bundle) could POST to
-- /rest/v1/rpc/review_client_impact with no session and flip another firm's
-- regulatory impact to approved/rejected, stamping an arbitrary reviewer —
-- forging a chartered accountant's sign-off on a compliance decision.
--
-- Two changes:
--   1. Revoke EXECUTE from anon + authenticated on every function that is only
--      ever called by trusted server code holding the service role.
--   2. Add a membership check inside review_client_impact. It is called from
--      the browser session (not the service role), so it must verify the caller
--      belongs to the workspace rather than trusting a caller-supplied id.

-- 1. Service-role-only surface -------------------------------------------------

revoke execute on function public.record_client_impact(uuid, uuid, uuid, uuid, integer, text, text, jsonb, jsonb, text[], numeric) from anon, authenticated;
revoke execute on function public.record_access_request(uuid, text, text, text, text, public.plan_tier) from anon, authenticated;
revoke execute on function public.access_status(text) from anon, authenticated;
revoke execute on function public.activate_latest_rule(text) from anon, authenticated;
revoke execute on function public.workspace_client_limit(uuid) from anon;

-- 2. review_client_impact: verify the caller, do not trust the parameter -------
--
-- `target_workspace_id` arrives from the browser. Without a membership check a
-- SECURITY DEFINER function treats it as fact. The route already scopes by the
-- session's workspace, but the database must not depend on the caller for that.

create or replace function public.review_client_impact(
  target_impact_id uuid,
  target_workspace_id uuid,
  target_state public.review_state,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if target_state not in ('approved', 'rejected', 'in_review', 'not_reviewed') then
    raise exception 'unsupported review state';
  end if;

  -- The caller must actually be a member of the workspace they name, and must
  -- be the user they claim to be. auth.uid() is set by the verified JWT and
  -- cannot be spoofed by the request body.
  if auth.uid() is null
     or auth.uid() <> target_user_id
     or not public.has_workspace_role(
          target_workspace_id,
          array['owner', 'admin', 'reviewer', 'member']::public.workspace_role[]
        )
  then
    raise exception 'not authorised to review this impact';
  end if;

  update public.client_regulatory_impacts
     set review_state = target_state,
         reviewed_by = case when target_state in ('approved', 'rejected') then target_user_id else null end,
         reviewed_at = case when target_state in ('approved', 'rejected') then now() else null end,
         updated_at = now()
   where id = target_impact_id
     and workspace_id = target_workspace_id;

  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

-- Signed-in members call this from the browser; anon never should.
revoke execute on function public.review_client_impact(uuid, uuid, public.review_state, uuid) from public, anon;
grant execute on function public.review_client_impact(uuid, uuid, public.review_state, uuid) to authenticated, service_role;
