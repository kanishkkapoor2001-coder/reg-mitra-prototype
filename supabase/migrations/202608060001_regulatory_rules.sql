-- Applicability rules imported from the newsletter's ingestion pipeline.
--
-- The newsletter is where rules are *extracted* (an LLM proposes a rule from
-- one circular; a second, independent model must re-derive it from the source
-- or the rule is withheld). The product only ever *consumes* them, so nothing
-- here writes a rule from a model — the import path is the only writer.
--
-- Rules are versioned per document. A new version supersedes the previous one
-- and re-opens any decision that was based on it, rather than silently
-- changing the basis of an approval a CA already gave.

create table public.regulatory_rules (
  id uuid primary key default gen_random_uuid(),
  regulatory_source_id uuid not null references public.regulatory_sources(id) on delete cascade,
  -- Stable id of the source document in the newsletter, so re-imports match up.
  external_document_id text not null,
  version integer not null check (version > 0),
  status text not null check (status in ('verified', 'withheld')),
  source_completeness text not null check (source_completeness in ('complete', 'incomplete', 'unknown')),
  -- The rule tree and its quotes, exactly as validated on import.
  root_condition jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  -- Attribute keys the rule tests, so a fact change can find affected rules
  -- without unpacking every rule tree.
  attributes text[] not null default '{}',
  active boolean not null default true,
  imported_at timestamptz not null default now(),
  unique (external_document_id, version)
);

create index regulatory_rules_active_idx
  on public.regulatory_rules(active, imported_at desc)
  where active;

-- Postgres cannot index an array with a plain btree for containment queries.
create index regulatory_rules_attributes_idx
  on public.regulatory_rules using gin (attributes);

alter table public.regulatory_rules enable row level security;

-- Rules describe public circulars, not client data: any signed-in member may
-- read them. Only the service role (the importer) writes.
create policy regulatory_rules_readable
  on public.regulatory_rules
  for select
  to authenticated
  using (true);

-- Tracks how far the last import got, so a run only asks for what is new.
create table public.rule_import_state (
  id boolean primary key default true check (id),
  last_cursor timestamptz,
  last_run_at timestamptz,
  last_status text,
  last_message text,
  imported_count integer not null default 0
);

insert into public.rule_import_state (id) values (true) on conflict do nothing;

alter table public.rule_import_state enable row level security;

-- Marks every version of a document except the newest as inactive, so the
-- matcher always evaluates exactly one rule per circular.
create or replace function public.activate_latest_rule(target_document_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.regulatory_rules r
     set active = (
       r.version = (
         select max(inner_r.version)
           from public.regulatory_rules inner_r
          where inner_r.external_document_id = target_document_id
       )
     )
   where r.external_document_id = target_document_id;
$$;

revoke all on function public.activate_latest_rule(text) from public;
grant execute on function public.activate_latest_rule(text) to service_role;
