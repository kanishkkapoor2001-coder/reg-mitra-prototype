-- PostgreSQL's POSIX regular-expression engine does not support JavaScript's
-- non-capturing group syntax. Replace it without changing the function's
-- remaining, previously reviewed body.

do $migration$
declare
  function_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef('public.create_workspace(text,text,text)'::regprocedure)
  into function_definition;

  corrected_definition := replace(
    function_definition,
    'workspace_slug !~ ''^[a-z0-9]+(?:-[a-z0-9]+)*$''',
    'workspace_slug !~ ''^[a-z0-9]+(-[a-z0-9]+)*$'''
  );

  if corrected_definition = function_definition then
    raise exception 'Expected workspace slug expression was not found';
  end if;

  execute corrected_definition;
end;
$migration$;
