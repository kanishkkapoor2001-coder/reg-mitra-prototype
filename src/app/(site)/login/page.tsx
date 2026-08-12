import Link from "next/link";
import type { Metadata } from "next";
import { OauthButtons, hasAnyOauthProvider } from "@/components/oauth-buttons";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your Reg Mitra firm workspace with Google, Microsoft, or a one-time link sent to your work email — no password required.",
};

const errors: Record<string, string> = {
  invalid_email: "Enter a valid work email address.",
  invalid_link: "That sign-in link is incomplete. Request a new one.",
  expired_link: "That sign-in link has expired or was already used.",
  send_failed: "We could not send the sign-in link. Please try again.",
  rate_limited: "Too many sign-in links have been sent in the last hour. Please try again shortly.",
  not_configured: "Sign-in is not available right now. Try again later.",
  // The OAuth route can bounce back here now that the buttons live on this page
  // too; without these the visitor got a blank failure.
  invalid_provider: "Choose Google or Microsoft to continue.",
  provider_failed: "We could not reach that sign-in provider. Use your work email instead.",
};

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; sent?: string; from?: string; founder?: string }>;
}>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;
  const founderEntry = params.founder === "1";
  // Only promise Google/Microsoft when the buttons are actually rendered.
  // Otherwise the page advertises a way in that is not on the page.
  const oauth = hasAnyOauthProvider();
  const from = params.from?.startsWith("/") && !params.from.startsWith("//")
    ? params.from
    : "/today";

  return (
    <PublicShell authPage>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">{founderEntry ? "Founder access" : "Firm workspace"}</p>
          <h1>{founderEntry ? "Open your Reg Mitra workspace." : "Sign in to continue your regulatory review."}</h1>
          <p>{founderEntry
            ? "Use the approved work email linked to your founder account."
            : oauth
              ? "Use your firm’s Google or Microsoft account, or a one-time link sent to your work email—no password to remember."
              : "Use the work email linked to your firm. We will send a one-time sign-in link—no password to remember."}</p>
          <ul>
            <li><span>01</span> Your firm workspace is separate from the public sample</li>
            <li><span>02</span> Roles control who can review and approve work</li>
            <li><span>03</span> Answers and drafts remain in the review history</li>
          </ul>
        </section>
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-mark">R/M</div>
          <p className="access-label">{founderEntry ? "Founder access" : "Passwordless sign-in"}</p>
          <h2 id="login-title">{founderEntry ? "Send my sign-in link" : "Email me a sign-in link"}</h2>
          {params.sent === "1" ? (
            <div className="notice" role="status">
              <strong>Check your inbox.</strong>
              This link can be used once. Open it soon.
            </div>
          ) : (
            <>
            <OauthButtons from={from} />
            <form action="/api/auth/start" method="post">
              <input name="from" type="hidden" value={from} />
              <label htmlFor="login-email">Work email</label>
              <input
                autoComplete="email"
                id="login-email"
                inputMode="email"
                name="email"
                placeholder="you@firm.in"
                required
                type="email"
              />
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="marketing-button primary wide" type="submit">
                {founderEntry ? "Send my sign-in link" : "Send sign-in link"} <span>→</span>
              </button>
            </form>
            </>
          )}
          <small>This page never asks for portal passwords, OTPs, or client records.</small>
          {founderEntry ? (
            <Link href={`/founder?from=${encodeURIComponent(from)}`}>Use my founder code instead →</Link>
          ) : (
            // Sign-in and sign-up are separate pages, so this is the only thing
            // telling a firm without an account that it is in the wrong place.
            // As a trailing text link it read as fine print and was missed.
            <div className="login-alt">
              <p className="login-alt-title">Don’t have a workspace yet?</p>
              <Link className="marketing-button wide" href="/signup">
                Create an account <span>→</span>
              </Link>
            </div>
          )}
        </section>
      </main>
    </PublicShell>
  );
}
