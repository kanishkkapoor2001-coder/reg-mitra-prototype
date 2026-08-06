-- Lets the matcher write applicability results.
--
-- `client_regulatory_impacts` was designed for a person to fill in: created_by
-- is NOT NULL and there is nowhere to record which rule produced a result or
-- why. The matcher is a machine and must be able to show its working, so:
--   * created_by becomes nullable (null = produced by the matcher)
--   * the rule, its version, the decision and the trace are recorded
--
-- A CA's decision is never overwritten by a re-run. Only a *new rule version*
-- re-opens a decided row, because the basis of the earlier decision changed.

alter table public.client_regulatory_impacts
  alter column created_by drop not null;

alter table public.client_regulatory_impacts
  add column rule_id uuid references public.regulatory_rules(id) on delete set null,
  add column rule_version integer,
  -- Mirrors RadarDecision in src/lib/radar/evaluate.ts.
  add column decision text check (decision in (
    'direct_relevance',
    'possible_relevance',
    'more_information_needed',
    'no_detected_connection',
    'unable_to_determine_safely'
  )),
  -- Why the machine reached this result: the evaluated tree plus the facts it
  -- used. Kept so a conclusion can be re-examined months later.
  add column decision_trace jsonb,
  -- Attribute keys that were undecidable, driving "answer these to resolve N".
  add column missing_attributes text[] not null default '{}',
  add column matched_at timestamptz;

create index client_regulatory_impacts_review_idx
  on public.client_regulatory_impacts(workspace_id, decision, review_state)
  where decision = 'direct_relevance';

create index client_regulatory_impacts_client_idx
  on public.client_regulatory_impacts(client_id, decision);

-- Applies one match result.
--
-- Returns 'inserted', 'updated', or 'preserved' — the last meaning a CA had
-- already decided this row on this rule version and the machine left it alone.
create or replace function public.record_client_impact(
  target_workspace_id uuid,
  target_client_id uuid,
  target_source_id uuid,
  target_rule_id uuid,
  target_rule_version integer,
  target_decision text,
  target_applicability text,
  target_evidence jsonb,
  target_trace jsonb,
  target_missing text[],
  target_confidence numeric default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.client_regulatory_impacts%rowtype;
begin
  select * into existing
    from public.client_regulatory_impacts
   where workspace_id = target_workspace_id
     and client_id = target_client_id
     and source_id = target_source_id;

  if not found then
    insert into public.client_regulatory_impacts (
      workspace_id, client_id, source_id, rule_id, rule_version,
      decision, applicability, applicability_evidence, decision_trace,
      missing_attributes, confidence, review_state, matched_at
    ) values (
      target_workspace_id, target_client_id, target_source_id, target_rule_id,
      target_rule_version, target_decision, target_applicability,
      coalesce(target_evidence, '[]'::jsonb), target_trace,
      coalesce(target_missing, '{}'), target_confidence, 'not_reviewed', now()
    );
    return 'inserted';
  end if;

  -- A human decided this, and the rule has not changed since: leave it.
  if existing.review_state in ('approved', 'rejected')
     and existing.rule_version is not distinct from target_rule_version then
    return 'preserved';
  end if;

  update public.client_regulatory_impacts
     set rule_id = target_rule_id,
         rule_version = target_rule_version,
         decision = target_decision,
         applicability = target_applicability,
         applicability_evidence = coalesce(target_evidence, '[]'::jsonb),
         decision_trace = target_trace,
         missing_attributes = coalesce(target_missing, '{}'),
         confidence = target_confidence,
         -- A new rule version re-opens a decided row: the basis changed, so
         -- the earlier approval no longer speaks to this rule.
         review_state = case
           when existing.review_state in ('approved', 'rejected')
             and existing.rule_version is distinct from target_rule_version
           then 'not_reviewed'::public.review_state
           else existing.review_state
         end,
         reviewed_by = case
           when existing.review_state in ('approved', 'rejected')
             and existing.rule_version is distinct from target_rule_version
           then null else existing.reviewed_by
         end,
         reviewed_at = case
           when existing.review_state in ('approved', 'rejected')
             and existing.rule_version is distinct from target_rule_version
           then null else existing.reviewed_at
         end,
         matched_at = now(),
         updated_at = now()
   where id = existing.id;

  return 'updated';
end;
$$;

revoke all on function public.record_client_impact(uuid, uuid, uuid, uuid, integer, text, text, jsonb, jsonb, text[], numeric) from public;
grant execute on function public.record_client_impact(uuid, uuid, uuid, uuid, integer, text, text, jsonb, jsonb, text[], numeric) to service_role;

-- Records a CA's decision on a proposed match.
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

grant execute on function public.review_client_impact(uuid, uuid, public.review_state, uuid) to authenticated, service_role;
