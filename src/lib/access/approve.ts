import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AccessState } from "@/lib/access";
import { type PlanTier, TIERS } from "@/lib/billing/tiers";

// Approving someone is the moment they become a customer, so it has to do more
// than flip a database column: the person who signed up is told, and told how
// to get in. Before this existed an approval was silent and the applicant
// simply never heard back.

const FROM = process.env.SIGNUP_NOTIFY_FROM?.trim() || "Reg Mitra <signups@updates.sigil91.com>";
const APP_URL = (process.env.APP_URL?.trim() || "https://regmitra.in").replace(/\/+$/, "");

export type PendingRequest = {
  id: string;
  email: string;
  fullName: string | null;
  provider: string | null;
  requestedTier: PlanTier;
  status: AccessState;
  requestedAt: string;
  lastSeenAt: string;
};

export async function listAccessRequests(limit = 100): Promise<PendingRequest[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("access_requests")
    .select("id, email, full_name, provider, requested_tier, status, requested_at, last_seen_at")
    .order("status", { ascending: true })
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    provider: row.provider,
    requestedTier: (row.requested_tier ?? "pro") as PlanTier,
    status: row.status as AccessState,
    requestedAt: row.requested_at,
    lastSeenAt: row.last_seen_at,
  }));
}

async function tellApplicant(
  email: string,
  fullName: string | null,
  tier: PlanTier,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[access] RESEND_API_KEY not set — approval email skipped");
    return;
  }

  const name = fullName?.split(/\s+/)[0] ?? "there";
  const plan = TIERS[tier];
  const limit = plan.clientLimit === null
    ? "unlimited client companies"
    : `up to ${plan.clientLimit} client companies`;

  const text = [
    `Hi ${name},`,
    "",
    "Your Reg Mitra workspace is open. Your 7-day trial starts when you first sign in,",
    `on the ${plan.name} plan — ${limit}.`,
    "",
    `Sign in: ${APP_URL}/login`,
    "",
    "First thing worth doing: add a client and answer its profile questions. That is",
    "what lets Reg Mitra tell you which circulars actually touch that client.",
    "",
    "Reply to this email if anything is unclear.",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f5f5f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a201d">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e5e2;border-radius:14px">
<tr><td style="padding:32px">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1d8d56">Reg Mitra</p>
<h1 style="margin:0 0 14px;font-size:22px;font-weight:600;line-height:1.3">Your workspace is open</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4a544e">Hi ${name}, your 7-day trial starts when you first sign in, on the <strong>${plan.name}</strong> plan — ${limit}.</p>
<a href="${APP_URL}/login" style="display:inline-block;padding:13px 22px;border-radius:9px;background:#12261c;color:#fff;font-size:15px;font-weight:600;text-decoration:none">Sign in</a>
<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#4a544e">First thing worth doing: add a client and answer its profile questions. That is what lets Reg Mitra tell you which circulars actually touch that client.</p>
</td></tr></table></body></html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Your Reg Mitra workspace is open",
        text,
        html,
      }),
    });
    if (!response.ok) {
      console.error("[access] approval email failed", response.status, await response.text());
    }
  } catch (error) {
    console.error("[access] approval email threw", error);
  }
}

/**
 * Sets an access decision. Approval emails the applicant; the email is
 * best-effort so a mail outage cannot leave someone approved in the database
 * but blocked in practice.
 */
export async function decideAccess(
  requestId: string,
  decision: "approved" | "rejected",
  decidedBy: string,
): Promise<{ ok: boolean; email?: string; error?: string }> {
  const admin = createSupabaseAdminClient();

  const { data: row, error: readError } = await admin
    .from("access_requests")
    .select("id, email, full_name, requested_tier, status")
    .eq("id", requestId)
    .maybeSingle();

  if (readError || !row) return { ok: false, error: readError?.message ?? "Request not found" };

  const { error } = await admin
    .from("access_requests")
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: decidedBy,
    })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };

  // Only announce a change, never re-announce an approval they already have.
  if (decision === "approved" && row.status !== "approved") {
    await tellApplicant(row.email, row.full_name, (row.requested_tier ?? "pro") as PlanTier);
  }

  return { ok: true, email: row.email };
}
