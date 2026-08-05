export type PlanTier = "pro" | "ultra";

export interface TierDefinition {
  id: PlanTier;
  name: string;
  /** Client companies a workspace may hold. null means unlimited. */
  clientLimit: number | null;
  priceLabel: string;
  available: boolean;
}

// The 7-day trial is deliberately not a tier: it grants base-tier (Pro) access
// for a week, so a trialling firm sees the same product and the same limits as
// a paying Pro firm. Only `subscriptions.status` distinguishes them.
export const TIERS: Record<PlanTier, TierDefinition> = {
  pro: {
    id: "pro",
    name: "Pro",
    clientLimit: 6,
    priceLabel: "₹2,500/month",
    available: true,
  },
  ultra: {
    id: "ultra",
    name: "Ultra",
    clientLimit: null,
    priceLabel: "₹5,000/month",
    available: false,
  },
};

export const DEFAULT_TIER: PlanTier = "pro";

export function isPlanTier(value: unknown): value is PlanTier {
  return value === "pro" || value === "ultra";
}

export function parseTier(value: unknown): PlanTier {
  return isPlanTier(value) ? value : DEFAULT_TIER;
}

export function clientLimitFor(tier: PlanTier): number | null {
  return TIERS[tier].clientLimit;
}

/** Human phrasing for the cap, used in both the UI and the block message. */
export function clientLimitLabel(tier: PlanTier): string {
  const limit = clientLimitFor(tier);
  return limit === null ? "Unlimited client companies" : `Up to ${limit} client companies`;
}
