import "server-only";
import { DEFAULT_INTENT, type SignupIntent } from "@/lib/billing/signup-intent";
import { DEFAULT_TIER, TIERS, type PlanTier } from "@/lib/billing/tiers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AccessState = "pending" | "approved" | "rejected";

export type AccessIdentity = {
  authUserId: string | null;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  provider?: string | null;
  requestedTier?: PlanTier;
  /**
   * Whether they asked to start paying. Carried on the notification only — the
   * `record_access_request` RPC has a fixed signature, so persisting this needs
   * a migration. Until then the alert email is the record.
   */
  intent?: SignupIntent;
};

// Comma-separated so alerts can go to more than one mailbox. Note that
// kanishk@learno.ai bounces and is suppressed at Resend — use a mailbox that
// actually accepts mail or the approval alert silently never arrives.
const NOTIFY_TO = (process.env.SIGNUP_NOTIFY_TO?.trim() || "kanishk@outreach.learno.ai")
  .split(",")
  .map((address) => address.trim())
  .filter(Boolean);
// Must be an address on a Resend-verified domain; the shared test sender can
// only deliver to the Resend account owner.
const APP_URL = (process.env.APP_URL?.trim() || "https://regmitra.in").replace(/\/+$/, "");
const NOTIFY_FROM = process.env.SIGNUP_NOTIFY_FROM?.trim() || "Reg Mitra <signups@updates.sigil91.com>";

/**
 * Records a sign-in and returns the account's standing. A first-time email is
 * stored as `pending` and reported with `isNew`, which is what triggers the
 * operator notification.
 */
export async function recordAccessRequest(
  identity: AccessIdentity,
): Promise<{ status: AccessState; isNew: boolean; requestedTier: PlanTier }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("record_access_request", {
    request_auth_user_id: identity.authUserId,
    request_email: identity.email,
    request_full_name: identity.fullName ?? null,
    request_avatar_url: identity.avatarUrl ?? null,
    request_provider: identity.provider ?? null,
    request_tier: identity.requestedTier ?? DEFAULT_TIER,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    status: (row?.status as AccessState) ?? "pending",
    isNew: Boolean(row?.is_new),
    requestedTier: (row?.requested_tier as PlanTier) ?? DEFAULT_TIER,
  };
}

/**
 * Current standing for an email. Returns null when the address has never signed
 * in. Callers treat a thrown error as "cannot decide" and must not grant access.
 */
export async function readAccessStatus(email: string): Promise<AccessState | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("access_status", { request_email: email });
  if (error) throw error;
  return (data as AccessState | null) ?? null;
}

/**
 * Tells the operator someone signed up. Best-effort by design: a signup must
 * never fail because the mail provider is down or unconfigured.
 */
export async function notifyOperatorOfSignup(identity: AccessIdentity): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[access] RESEND_API_KEY not set — skipping signup notification");
    return;
  }

  const name = identity.fullName?.trim() || "(no name given)";
  const provider = identity.provider?.trim() || "unknown";
  const tier = identity.requestedTier ?? DEFAULT_TIER;
  const tierInfo = TIERS[tier];
  const limitText = tierInfo.clientLimit === null
    ? "unlimited client companies"
    : `up to ${tierInfo.clientLimit} client companies`;
  // A firm asking to pay is the one alert that must not read like the other
  // twenty in the inbox, because there is no checkout to catch them if it does.
  const wantsToPay = (identity.intent ?? DEFAULT_INTENT) === "paid";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_TO,
        subject: wantsToPay
          ? `💰 WANTS TO PAY — ${tierInfo.name} — ${identity.email}`
          : `Reg Mitra signup — ${tierInfo.name} trial — ${identity.email}`,
        text: [
          wantsToPay
            ? "A firm asked to start on a PAID plan. Contact them yourself — there is no checkout."
            : "Someone requested access to Reg Mitra.",
          "",
          `Email:      ${identity.email}`,
          `Name:       ${name}`,
          `Signed in:  ${provider}`,
          `WANTS:      ${tierInfo.name} — ${tierInfo.priceLabel}, ${limitText}`,
          wantsToPay
            ? "            READY TO PAY — onboard as a founding firm."
            : "            (Starts with the 7-day free trial.)",
          "",
          "They are PENDING and cannot use the product yet.",
          "",
          ...(wantsToPay
            ? [
              "They were told they get, as a founding firm:",
              "  - personal onboarding — their client book loaded with them",
              "  - a direct line to you, not a support queue",
              "  - their price held for as long as they stay",
              "Reply within a day or that promise is the first thing you break.",
              "",
            ]
            : []),
          "Approve or reject them here:",
          `  ${APP_URL}/admin/access`,
          "",
          "(Approving emails them a sign-in link automatically.)",
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      console.error("[access] signup notification failed", response.status, await response.text());
    }
  } catch (error) {
    console.error("[access] signup notification threw", error);
  }
}
