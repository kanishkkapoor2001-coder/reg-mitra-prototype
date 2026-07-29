-- The first pilot uses one connection per system at workspace level.
-- Client scoping is carried by each observation.

alter table public.connector_accounts
  drop constraint connector_accounts_workspace_id_client_id_system_key;

alter table public.connector_accounts
  add constraint connector_accounts_workspace_system_key unique (workspace_id, system);
