import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasFounderAccess } from "@/lib/billing/entitlements";

export interface CurrentWorkspace {
  id: string;
  name: string;
  role: "owner" | "admin" | "reviewer" | "member" | "viewer";
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled" | "expired";
  trialEndsAt: string | null;
  founderAccess: boolean;
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: membership, error } = await supabase
    .from("workspace_memberships")
    .select("workspace_id, role, workspaces(name, subscriptions(status, trial_ends_at))")
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
    founderAccess: hasFounderAccess(userData.user.email),
  };
}
