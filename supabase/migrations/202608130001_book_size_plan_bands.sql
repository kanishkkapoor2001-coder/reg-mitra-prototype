-- Pricing moves from two flat plans to four bands on book size.
--
-- The old shape was Pro (6 clients, ₹2,500) and Ultra (unlimited, ₹5,000). Six
-- clients is below the size of almost any real practice, so the cap was hit
-- immediately and the only way out was an unlimited plan — a cliff, not a
-- ladder. The new bands price on the book, where the value actually is:
--
--   starter     up to 25    ₹4,000/mo    ₹160 per client
--   practice    up to 100   ₹9,000/mo    ₹90  per client
--   firm        up to 300   ₹18,000/mo   ₹60  per client
--   enterprise  above       agreed       —
--
-- Additive on purpose. 'pro' and 'ultra' stay valid values so existing
-- subscription and access_request rows keep working untouched; they are simply
-- mapped onto the new limits below. Nothing is migrated or deleted.

alter type public.plan_tier add value if not exists 'starter';
alter type public.plan_tier add value if not exists 'practice';
alter type public.plan_tier add value if not exists 'firm';
alter type public.plan_tier add value if not exists 'enterprise';

-- The comparison casts to text rather than matching enum literals: a value
-- added by ALTER TYPE in this same transaction cannot be referenced as an enum
-- literal here, and text comparison sidesteps that entirely.
create or replace function public.workspace_client_limit(target_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  -- null means unlimited
  select case coalesce(s.tier::text, 'starter')
           when 'starter' then 25
           when 'practice' then 100
           when 'firm' then 300
           when 'enterprise' then null
           -- Legacy plans. 'pro' was sold as 6; it is honoured at the starter
           -- band instead, because moving someone DOWN a limit they already
           -- paid for would break their workspace.
           when 'pro' then 25
           when 'ultra' then null
           else 25
         end
    from public.workspaces w
    left join public.subscriptions s on s.workspace_id = w.id
   where w.id = target_workspace_id;
$$;

revoke all on function public.workspace_client_limit(uuid) from public;
revoke execute on function public.workspace_client_limit(uuid) from anon;
grant execute on function public.workspace_client_limit(uuid) to authenticated, service_role;
