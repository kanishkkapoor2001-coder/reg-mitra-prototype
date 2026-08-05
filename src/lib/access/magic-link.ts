import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Supabase's built-in mailer is a development convenience: it caps sends at a
// handful per hour and returns 429 after that, which fails real signups. We
// mint the link ourselves with the service role and deliver it over Resend, so
// delivery is governed by our own verified domain instead.

const FROM = process.env.AUTH_EMAIL_FROM?.trim()
  || process.env.SIGNUP_NOTIFY_FROM?.trim()
  || "Reg Mitra <signups@updates.sigil91.com>";

export type MagicLinkOutcome = "sent" | "not_configured" | "failed";

function emailBody(actionLink: string, isSignup: boolean): { text: string; html: string } {
  const heading = isSignup ? "Finish creating your account" : "Sign in to Reg Mitra";
  const lead = isSignup
    ? "Confirm your email to complete your Reg Mitra sign-up. We review each request by hand and will email you the moment your workspace is open."
    : "Use the button below to sign in to Reg Mitra.";

  return {
    text: [
      heading,
      "",
      lead,
      "",
      actionLink,
      "",
      "This link can be used once and expires in an hour.",
      "If you didn't request it, you can ignore this email.",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f5f5f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a201d">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e3e5e2;border-radius:14px">
<tr><td style="padding:32px">
<p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1d8d56">Reg Mitra</p>
<h1 style="margin:0 0 14px;font-size:22px;font-weight:600;line-height:1.3">${heading}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a544e">${lead}</p>
<a href="${actionLink}" style="display:inline-block;padding:13px 22px;border-radius:9px;background:#12261c;color:#fff;font-size:15px;font-weight:600;text-decoration:none">${isSignup ? "Confirm my email" : "Sign in"}</a>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b756f">Or paste this into your browser:<br><span style="word-break:break-all;color:#1d8d56">${actionLink}</span></p>
<p style="margin:20px 0 0;font-size:12.5px;line-height:1.6;color:#8a938d">This link can be used once and expires in an hour. If you didn't request it, ignore this email.</p>
</td></tr></table></body></html>`,
  };
}

/**
 * Mints a magic link and delivers it via Resend.
 *
 * The link points at our own /api/auth/confirm and carries the hashed token
 * rather than Supabase's `action_link`. Supabase's own link ends up delivering
 * the session in a URL fragment, which server code cannot read; exchanging the
 * hashed token keeps the whole flow server-side.
 */
export async function sendMagicLink(
  email: string,
  confirmBaseUrl: string,
  destination: string,
): Promise<MagicLinkOutcome> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return "not_configured";

  let actionLink: string;
  let isSignup = false;

  try {
    const admin = createSupabaseAdminClient();
    // `magiclink` creates the user when they do not exist yet, so one call
    // covers both signing up and signing in.
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (error || !data?.properties?.hashed_token) {
      console.error("[magic-link] generateLink failed", error);
      return "failed";
    }

    const confirm = new URL(confirmBaseUrl);
    confirm.searchParams.set("token_hash", data.properties.hashed_token);
    confirm.searchParams.set("type", "magiclink");
    confirm.searchParams.set("from", destination);
    actionLink = confirm.toString();

    // A user created by this call has never confirmed an address.
    isSignup = !data.user?.email_confirmed_at;
  } catch (error) {
    console.error("[magic-link] generateLink threw", error);
    return "failed";
  }

  const { text, html } = emailBody(actionLink, isSignup);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: isSignup ? "Confirm your Reg Mitra sign-up" : "Your Reg Mitra sign-in link",
        text,
        html,
      }),
    });

    if (!response.ok) {
      console.error("[magic-link] resend rejected", response.status, await response.text());
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("[magic-link] resend threw", error);
    return "failed";
  }
}
