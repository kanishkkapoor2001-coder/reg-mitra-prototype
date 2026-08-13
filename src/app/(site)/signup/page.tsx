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
  invalid_email: "Enter a valid email address.",
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
          {/* Trials approve themselves now, so "we review every request by hand"
              is no longer true for the path most visitors take. And no "work
              email" anywhere: any address gets in, so naming a kind of address
              reads as a rule the form does not actually apply. */}
          <p>
            Sign up and your workspace opens straight away — no waiting on us, no card, nothing to
            cancel. Firms that want to start on a paid plan we set up personally instead.
          </p>
          <ul>
            <li><span>01</span> Sign up with {oauth ? "Google, Microsoft or your email" : "your email address"}</li>
            <li><span>02</span> Your workspace opens immediately</li>
            <li><span>03</span> Run Reg Mitra against your real client book for 7 days</li>
          </ul>
        </section>

        <section className="login-panel" aria-labelledby="signup-title">
          <div className="login-mark">R/M</div>
          <h2 id="signup-title">Sign up</h2>
          <p className="login-panel-note">The address you want your regulatory alerts sent to.</p>

          {error ? <p className="login-error" role="alert">{error}</p> : null}
          {/* A trial no longer waits on a review, so promising one described a
              queue the visitor will never be in. */}
          {sent ? (
            <p className="login-sent" role="status">
              <strong>Check your email.</strong> We’ve sent a sign-up link — open it on this device
              and your workspace opens straight away.
            </p>
          ) : null}

          <OauthButtons from={from} intent={intent} origin="signup" plan={plan} verb="Sign up" />

          {/* One field to sign up. How they want to start sits below the button
              as a default they can change, rather than a decision blocking the
              thing they came to do. */}
          <form className="signup-email-form" action="/api/auth/start" method="post">
            {/* Asked here rather than chased later: without them the operator
                alert says "(no name given)" and gives no way to tell which firm
                is asking. Not required, though — a blocked submit button is a
                worse outcome than a missing name, and nothing downstream needs
                either field to be present. */}
            <label htmlFor="signup-name">Your name <span className="field-optional">optional</span></label>
            <input
              id="signup-name"
              type="text"
              name="full_name"
              autoComplete="name"
              placeholder="Kanishk Kapoor"
              maxLength={120}
              autoFocus
            />

            <label htmlFor="signup-firm">Firm name <span className="field-optional">optional</span></label>
            <input
              id="signup-firm"
              type="text"
              name="firm"
              autoComplete="organization"
              placeholder="Mehta Shah & Associates"
              maxLength={160}
            />

            <label htmlFor="signup-email">Email address</label>
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
                  <small>Personal onboarding, and your price held.</small>
                </span>
              </label>
            </fieldset>

            {/* Plan belongs with the other choices, above the button. Sitting
                below it, it asked the visitor to reconsider something after the
                form had already presented its final action. */}
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

            <button className="marketing-button primary" type="submit">Email me a sign-up link</button>
          </form>

          {/* Everything below the button used to be three same-weight lines in a
              row — plan, sign-in, privacy — which read as a text dump rather
              than a footer. One rule, one secondary action, one quiet note. */}
          <div className="login-alt">
            <p className="oauth-foot">
              Already approved? <Link href="/login">Sign in</Link>
            </p>
            <p className="oauth-fine">
              We store your name, work email and firm to review the request — nothing else, and we
              never post on your behalf.
            </p>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
