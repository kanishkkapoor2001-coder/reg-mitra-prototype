import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { TIERS, parseTier } from "@/lib/billing/tiers";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Sign up with Google or Microsoft to request a Reg Mitra workspace for your firm.",
};

const errors: Record<string, string> = {
  not_configured: "Sign-up is not available right now. Please try again shortly.",
  invalid_provider: "Choose Google or Microsoft to continue.",
  provider_failed: "We could not reach that sign-in provider. Please try again.",
  invalid_email: "Enter a valid work email address.",
  send_failed: "We could not send the sign-up link. Please try again.",
  rate_limited: "Too many sign-up links have been sent in the last hour. Please try again shortly, or email us and we’ll set you up directly.",
};

// Google and Microsoft appear only once their provider is configured in
// Supabase. Showing a button that cannot complete a sign-in is worse than not
// offering it, so the email path is always the dependable default.
function enabledProviders(): { google: boolean; microsoft: boolean } {
  const configured = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return {
    google: configured.includes("google"),
    microsoft: configured.includes("microsoft"),
  };
}

export default async function SignupPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; from?: string; sent?: string; plan?: string }>;
}>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] ?? errors.provider_failed : null;
  const sent = params.sent === "1";
  const plan = parseTier(params.plan);
  const from = params.from?.startsWith("/") && !params.from.startsWith("//") ? params.from : "/today";
  const providers = enabledProviders();
  const anyOauth = providers.google || providers.microsoft;

  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Create your account</p>
          <h1>Start your 7-day trial.</h1>
          <p>
            Sign up with your firm’s work account. We review every request by hand — you’ll get an
            email the moment your workspace is open. No card, nothing to cancel.
          </p>
          <ul>
            <li><span>01</span> Sign up with your work email{anyOauth ? ", Google or Microsoft" : ""}</li>
            <li><span>02</span> We approve your firm and open the workspace</li>
            <li><span>03</span> Run Reg Mitra against your real client book for 7 days</li>
          </ul>
        </section>

        <section className="login-panel" aria-labelledby="signup-title">
          <div className="login-mark">R/M</div>
          <h2 id="signup-title">Sign up</h2>
          <p className="login-panel-note">Use the work account linked to your firm.</p>

          {error ? <p className="login-error" role="alert">{error}</p> : null}
          {sent ? (
            <p className="login-sent" role="status">
              <strong>Check your email.</strong> We’ve sent a sign-up link. Open it on this device to
              finish — then we’ll review your request and email you when your workspace is open.
            </p>
          ) : null}

          <div className="oauth-stack">
            {providers.google ? (
            <form action="/api/auth/oauth" method="post">
              <input type="hidden" name="provider" value="google" />
              <input type="hidden" name="from" value={from} />
              <button className="oauth-button" type="submit">
                <svg viewBox="0 0 18 18" aria-hidden="true" className="oauth-logo">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
                  <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
                </svg>
                Continue with Google
              </button>
            </form>
            ) : null}

            {providers.microsoft ? (
            <form action="/api/auth/oauth" method="post">
              <input type="hidden" name="provider" value="microsoft" />
              <input type="hidden" name="from" value={from} />
              <button className="oauth-button" type="submit">
                <svg viewBox="0 0 18 18" aria-hidden="true" className="oauth-logo">
                  <path fill="#F25022" d="M0 0h8.5v8.5H0z"/>
                  <path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z"/>
                  <path fill="#00A4EF" d="M0 9.5h8.5V18H0z"/>
                  <path fill="#FFB900" d="M9.5 9.5H18V18H9.5z"/>
                </svg>
                Continue with Microsoft
              </button>
            </form>
            ) : null}
          </div>

          {anyOauth ? <p className="oauth-divider"><span>or</span></p> : null}

          <form className="signup-email-form" action="/api/auth/start" method="post">
            <fieldset className="plan-choice">
              <legend>Which plan do you want?</legend>
              <label className="plan-option">
                <input type="radio" name="plan" value="pro" defaultChecked={plan === "pro"} />
                <span>
                  <strong>{TIERS.pro.name} — 7-day free trial</strong>
                  <small>{TIERS.pro.priceLabel} after the trial · up to {TIERS.pro.clientLimit} client companies</small>
                </span>
              </label>
              <label className="plan-option">
                <input type="radio" name="plan" value="ultra" defaultChecked={plan === "ultra"} />
                <span>
                  <strong>{TIERS.ultra.name} — join the waitlist</strong>
                  <small>{TIERS.ultra.priceLabel} · unlimited client companies · not open yet</small>
                </span>
              </label>
            </fieldset>

            <label htmlFor="signup-email">Work email</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@yourfirm.in"
              required
            />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="origin" value="signup" />
            <button className="marketing-button primary" type="submit">Email me a sign-up link</button>
          </form>

          <p className="oauth-foot">
            Already approved? <Link href="/login">Sign in</Link>
          </p>
          <p className="oauth-fine">
            We store your name, work email and firm to review the request — nothing else, and we
            never post on your behalf.
          </p>
        </section>
      </main>
    </PublicShell>
  );
}
