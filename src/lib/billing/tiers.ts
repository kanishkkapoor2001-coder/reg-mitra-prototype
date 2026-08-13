export type PlanTier = "starter" | "practice" | "firm" | "enterprise";

/** Plans sold before the move to book-size bands. Still valid in the database. */
export type LegacyPlanTier = "pro" | "ultra";

export interface TierDefinition {
  id: PlanTier;
  name: string;
  /** Client companies a workspace may hold. null means unlimited. */
  clientLimit: number | null;
  priceLabel: string;
  /** Monthly price ÷ the band's cap, for the "per client" column. */
  perClientLabel: string;
  bookLabel: string;
  available: boolean;
}

// Priced on book size, because that is where the value is: a firm with 300
// clients gets 300 clients' worth of matching. Per-client cost falls as the
// book grows, so growing feels like a volume discount rather than a cliff.
//
// The 7-day trial is deliberately not a tier: it grants base-band (Starter)
// access for a week, so a trialling firm sees the same product and the same
// limits as a paying Starter firm. Only `subscriptions.status` distinguishes
// them.
export const TIERS: Record<PlanTier, TierDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    clientLimit: 25,
    priceLabel: "₹4,000/month",
    perClientLabel: "₹160",
    bookLabel: "Up to 25 clients",
    available: true,
  },
  practice: {
    id: "practice",
    name: "Practice",
    clientLimit: 100,
    priceLabel: "₹9,000/month",
    perClientLabel: "₹90",
    bookLabel: "Up to 100 clients",
    available: true,
  },
  firm: {
    id: "firm",
    name: "Firm",
    clientLimit: 300,
    priceLabel: "₹18,000/month",
    perClientLabel: "₹60",
    bookLabel: "Up to 300 clients",
    available: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    clientLimit: null,
    priceLabel: "Talk to us",
    perClientLabel: "—",
    bookLabel: "Above 300 clients",
    available: true,
  },
};

export const DEFAULT_TIER: PlanTier = "starter";

// Rows written before the rebanding still say 'pro' or 'ultra'. They are read
// as the band with the same practical limit — see the migration, which maps
// them identically in the database so the UI and the trigger never disagree.
const LEGACY_TIERS: Record<LegacyPlanTier, PlanTier> = {
  pro: "starter",
  ultra: "enterprise",
};

export function isPlanTier(value: unknown): value is PlanTier {
  return value === "starter" || value === "practice" || value === "firm" || value === "enterprise";
}

export function parseTier(value: unknown): PlanTier {
  if (isPlanTier(value)) return value;
  if (value === "pro" || value === "ultra") return LEGACY_TIERS[value];
  return DEFAULT_TIER;
}

export function clientLimitFor(tier: PlanTier): number | null {
  return TIERS[tier].clientLimit;
}

/** Human phrasing for the cap, used in both the UI and the block message. */
export function clientLimitLabel(tier: PlanTier): string {
  const limit = clientLimitFor(tier);
  return limit === null ? "Unlimited client companies" : `Up to ${limit} client companies`;
}
