-- Closes cross-tenant fact poisoning at the database.
--
-- The insert policies on the per-client tables check only
--   has_workspace_role(workspace_id, ...)
-- and nothing ties the row's client_id to that same workspace. A member of
-- workspace A could therefore insert a client_facts row carrying workspace A's
-- id and workspace B's client_id. RLS then hides the row from B — but the
-- matcher reads facts with the SERVICE ROLE, which bypasses RLS, so the
-- poisoned fact was consumed when scanning B's client.
--
-- The application side was fixed already (readClientFacts now filters on
-- workspace_id too). This is the guarantee underneath it: the pairing is
-- enforced by a foreign key, so no caller — route, script, or direct PostgREST
-- request — can create a mismatched row at all.
--
-- Impact if left open: injecting company.gst_registered = false against another
-- firm's client silently suppresses every GST circular match for them. Not a
-- data leak; a correctness attack on someone else's compliance output.

-- A composite FK needs a matching unique key on the parent. id is already the
-- primary key, so this pair is redundant for uniqueness but required as an FK
-- target.
alter table public.clients
  add constraint clients_workspace_id_id_key unique (workspace_id, id);

-- client_facts ---------------------------------------------------------------
-- Any pre-existing mismatched row would block the constraint; there are none in
-- production, and a failure here is the correct outcome rather than something
-- to force past.
alter table public.client_facts
  add constraint client_facts_client_in_workspace
  foreign key (workspace_id, client_id)
  references public.clients (workspace_id, id)
  on delete cascade;

-- client_identifiers ---------------------------------------------------------
alter table public.client_identifiers
  add constraint client_identifiers_client_in_workspace
  foreign key (workspace_id, client_id)
  references public.clients (workspace_id, id)
  on delete cascade;

-- client_regulatory_impacts --------------------------------------------------
alter table public.client_regulatory_impacts
  add constraint client_impacts_client_in_workspace
  foreign key (workspace_id, client_id)
  references public.clients (workspace_id, id)
  on delete cascade;

-- tasks ----------------------------------------------------------------------
-- client_id is nullable here (firm-wide tasks), and a composite FK with a NULL
-- component is simply not enforced, which is the behaviour we want.
alter table public.tasks
  add constraint tasks_client_in_workspace
  foreign key (workspace_id, client_id)
  references public.clients (workspace_id, id)
  on delete set null;
