-- The public trial endpoint calls this function only through the server-side
-- Supabase service role. Browser roles remain unable to execute it directly.

grant execute on function public.submit_trial_request(
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
