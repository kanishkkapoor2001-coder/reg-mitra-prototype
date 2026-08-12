import Link from "next/link";
import type { Metadata } from "next";
import { OauthButtons, hasAnyOauthProvider } from "@/components/oauth-buttons";
import { PublicShell } from "@/components/public-shell";
import { TIERS, parseTier } from "@/lib/billing/tiers";
import { parseIntent } from "@/lib/billing/signup-intent";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Request a Reg Mitra workspace for your firm — a 7-day trial on your real client book, or personal onboarding as a founding firm.",
};

const errors: Record<string, string> = {
  not_configured: "Sign-up is not available right now. Please try again shortly.",
  invalid_provider: "Choose Google or Microsoft to continue.",
  provider_failed: "We could not reach that sign-in provider. Please try again.",
  invalid_email: "Enter a valid work email address.",
  send_failed: "We could not send the sign-up link. Please try again.",
  rate_limited: "Too many sign-up links have been sent in the last hour. Please try again shortly, or email us and we’ll set you up directly.",
};

export default async function SignupPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; from?: string; sent?: string; plan?: string; intent?: string }>;
}>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] ?? errors.provider_failed : null;
  const sent = params.sent === "1";
  const plan = parseTier(params.plan);
  const intent = parseIntent(params.intent);
  const from = params.from?.startsWith("/") && !params.from.startsWith("//") ? params.from : "/today";
  // Only name the providers the page is actually rendering buttons for.
  const oauth = hasAnyOauthProvider();

  return (
    <PublicShell authPage>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Create your account</p>
          <h1>Start your 7-day trial.</h1>
          <p>
            Sign up with your firm’s work account. We review every request by hand — you’ll get an
            email the moment your workspace is open. No card, nothing to cancel.
          </p>
          <ul>
            <li><span>01</span> Sign up with {oauth ? "Google, Microsoft or your work email" : "your work email"}</li>
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

          <OauthButtons from={from} intent={intent} origin="signup" plan={plan} verb="Sign up" />

          {/* One field to sign up. How they want to start sits below the button
              as a default they can change, rather than a decision blocking the
              thing they came to do. */}
          <form className="signup-email-form" action="/api/auth/start" method="post">
            <label htmlFor="signup-email">Work email</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@yourfirm.in"
              required
              autoFocus
            />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="origin" value="signup" />

            {/* Paid intent is deliberately visible rather than buried in the
                plan chooser. A firm ready to pay is the most valuable signal
                this page can collect, and the old wording ("Ultra — join the
                waitlist") read as a closed door to exactly those people.
                It sits above the submit button: asked after it, the form looked
                finished and the question read as an afterthought. */}
            <fieldset className="start-choice">
              <legend>How would you like to start?</legend>
              <label className="plan-option">
                <input type="radio" name="intent" value="trial" defaultChecked={intent === "trial"} />
                <span>
                  <strong>Try it free for 7 days</strong>
                  <small>No card, nothing to cancel.</small>
                </span>
              </label>
              <label className="plan-option">
                <input type="radio" name="intent" value="paid" defaultChecked={intent === "paid"} />
                <span>
                  <strong>Set us up as a founding firm</strong>
                  <small>Personal onboarding, a direct line to the founder, and your price held.</small>
                </span>
              </label>
            </fieldset>

            <button className="marketing-button primary" type="submit">Email me a sign-up link</button>

            <details className="plan-detail" open={plan === "ultra"}>
              <summary>
                Plan: <strong>{TIERS[plan].name}</strong>
                {plan === "pro" ? " — up to 6 client companies" : " — unlimited client companies"}
              </summary>
              <div className="plan-choice">
                <label className="plan-option">
                  <input type="radio" name="plan" value="pro" defaultChecked={plan === "pro"} />
                  <span>
                    <strong>{TIERS.pro.name}</strong>
                    <small>{TIERS.pro.priceLabel} · up to {TIERS.pro.clientLimit} client companies</small>
                  </span>
                </label>
                <label className="plan-option">
                  <input type="radio" name="plan" value="ultra" defaultChecked={plan === "ultra"} />
                  <span>
                    <strong>{TIERS.ultra.name}</strong>
                    <small>{TIERS.ultra.priceLabel} · unlimited client companies</small>
                  </span>
                </label>
              </div>
            </details>
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
