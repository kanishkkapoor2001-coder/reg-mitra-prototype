-- "Done" has to mean filed.
--
-- review_task stamps reviewed_at and nothing else, so the button a CA presses
-- after doing the work recorded only that they had LOOKED at it. The task
-- stayed open forever, and the product tracked reading rather than compliance —
-- which is the opposite of the one question a practice actually has about a
-- filing: is it done.
--
-- complete_task records the outcome. Two are possible, and both are real
-- answers to a scheduled obligation:
--   filed          — the work was done for this period
--   not_applicable — the obligation did not arise for this client this period
--
-- review_task is left in place: it is a different act (a reviewer signing off
-- on someone else's work) and other callers may still mean it.

create or replace function public.complete_task(
  target_task_id uuid,
  target_outcome text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_task public.tasks%rowtype;
  current_user_id uuid := auth.uid();
  next_state public.task_state;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if target_outcome not in ('filed', 'not_applicable') then
    raise exception 'Unsupported outcome';
  end if;

  -- 'dismissed' is the schema's word for "this did not arise"; the UI says
  -- "not applicable this period", which is what a CA means by it.
  next_state := case target_outcome
                  when 'filed' then 'completed'::public.task_state
                  else 'dismissed'::public.task_state
                end;

  select * into target_task from public.tasks where id = target_task_id;

  -- Members do the work; a filing being marked done is not a reviewer-only act.
  if target_task.id is null
    or not public.has_workspace_role(
      target_task.workspace_id,
      array['owner','admin','reviewer','member']::public.workspace_role[]
    ) then
    raise exception 'Insufficient workspace role';
  end if;

  update public.tasks
     set state = next_state,
         completed_at = now(),
         reviewed_by = current_user_id,
         reviewed_at = coalesce(reviewed_at, now()),
         updated_at = now()
   where id = target_task_id;

  insert into public.audit_events (
    workspace_id, actor_user_id, action, target_type, target_id, after_state
  ) values (
    target_task.workspace_id,
    current_user_id,
    'task.' || target_outcome,
    'task',
    target_task_id::text,
    jsonb_build_object('state', next_state, 'outcome', target_outcome)
  );

  return true;
end;
$$;

revoke all on function public.complete_task(uuid, text) from public;
revoke execute on function public.complete_task(uuid, text) from anon;
grant execute on function public.complete_task(uuid, text) to authenticated, service_role;
