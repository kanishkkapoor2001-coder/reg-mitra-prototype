-- Task provenance metadata.
-- Additive and backward compatible: existing queries ignore the column, and
-- every existing row defaults to an empty object. Generated compliance tasks
-- use this to carry the source authority, statutory calendar reference, and a
-- deterministic seed key used for idempotent regeneration.
alter table public.tasks
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.tasks.metadata is
  'Provenance for generated tasks: seedKey, authority, category, sourceLabel, sourceUrl, dueDate. Empty for manually created tasks.';
