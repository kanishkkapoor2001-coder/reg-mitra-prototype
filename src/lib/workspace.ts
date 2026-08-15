import { cache } from "react";
import { createSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { hasFounderAccess } from "@/lib/billing/entitlements";
import { DEFAULT_TIER, parseTier, type PlanTier } from "@/lib/billing/tiers";

export interface CurrentWorkspace {
  id: string;
  name: string;
  role: "owner" | "admin" | "reviewer" | "member" | "viewer";
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | "expired";
  trialEndsAt: string | null;
  tier: PlanTier;
  founderAccess: boolean;
}

// react `cache` dedupes per request: the app layout, the page and any nested
// server component all share one auth check and one membership lookup per
// navigation instead of re-running them independently. Route handlers get a
// fresh call per request, which is unchanged behaviour.
export const getCurrentWorkspace = cache(async (): Promise<CurrentWorkspace | null> => {
  const user = await getServerUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data: membership, error } = await supabase
    .from("workspace_memberships")
    .select("workspace_id, role, workspaces(name, subscriptions(status, trial_ends_at, tier))")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !membership) return null;
  const workspaceValue = membership.workspaces;
  const workspace = Array.isArray(workspaceValue) ? workspaceValue[0] : workspaceValue;
  if (!workspace) return null;
  const subscriptionValue = workspace.subscriptions;
  const subscription = Array.isArray(subscriptionValue) ? subscriptionValue[0] : subscriptionValue;

  return {
    id: membership.workspace_id,
    name: workspace.name,
    role: membership.role,
    subscriptionStatus: subscription?.status ?? "expired",
    trialEndsAt: subscription?.trial_ends_at ?? null,
    tier: subscription?.tier ? parseTier(subscription.tier) : DEFAULT_TIER,
    founderAccess: hasFounderAccess(user.email),
  };
});
