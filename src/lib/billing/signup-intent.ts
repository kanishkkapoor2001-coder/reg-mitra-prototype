// What a new firm is asking for, kept separate from which tier they picked.
//
// Tier is "how much product" (Pro vs Ultra). Intent is "how they want to start"
// — a free trial, or straight onto a paid plan. They are genuinely independent:
// a firm can want to pay for Pro, and a firm can want to trial before Ultra.
// Folding the two together is what produced the old "Ultra — waitlist" wording,
// which read as a closed door to precisely the people most willing to pay.
//
// There is no card form yet. Paid signups are onboarded by hand, which at this
// stage is the honest arrangement rather than a stopgap: the first firms get
// their client book loaded with them and a direct line to the founder, and that
// is worth more to them than a checkout page. See /pending for the copy.

export type SignupIntent = "trial" | "paid";

export const DEFAULT_INTENT: SignupIntent = "trial";

export function isSignupIntent(value: unknown): value is SignupIntent {
  return value === "trial" || value === "paid";
}

export function parseIntent(value: unknown): SignupIntent {
  return isSignupIntent(value) ? value : DEFAULT_INTENT;
}

/** Cookie that carries the choice across the magic-link / OAuth round trip. */
export const INTENT_COOKIE = "reg_mitra_intent";
