export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export function hasProductEntitlement(
  status: BillingStatus | null | undefined,
  trialEndsAt: string | null | undefined,
  now = new Date(),
) {
  if (status === "active") return true;
  if (status !== "trialing" || !trialEndsAt) return false;
  const trialEnd = new Date(trialEndsAt);
  return Number.isFinite(trialEnd.getTime()) && trialEnd.getTime() > now.getTime();
}

export function trialDaysRemaining(trialEndsAt: string | null, now = new Date()) {
  if (!trialEndsAt) return 0;
  const remaining = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}
