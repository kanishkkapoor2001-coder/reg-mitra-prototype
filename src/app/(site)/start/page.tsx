import Link from "next/link";
import type { Metadata } from "next";
import { MarketingWorkflow } from "@/components/marketing-workflow";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Request pilot access",
  description: "Request a seven-day Reg Mitra workspace for one focused regulatory review workflow.",
};

export default async function StartPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ submitted?: string; duplicate?: string; error?: string }>;
}>) {
  const params = await searchParams;
  const errors: Record<string, string> = {
    invalid_request: "Enter your name, firm, and a valid work email.",
    invalid_email: "Enter a valid work email.",
    organization_required: "Enter your firm’s website or email domain.",
    domain_mismatch: "Your firm domain must match your work email.",
    unavailable: "We could not save this request. Please try again.",
  };

  return (
    <PublicShell>
      <main>
        <section className="login-page">
          <section className="login-copy">
            <p className="marketing-kicker">Private pilot · seven days · no card</p>
            <h1>Test Reg Mitra on one compliance workflow.</h1>
            <p>Request a firm workspace. We will confirm the pilot scope and start date by email; your seven days begin only when the workspace is created.</p>
            <ul>
              <li><span>01</span> Choose one regulatory-change or recurring compliance workflow</li>
              <li><span>02</span> Add only the client facts required for the review</li>
              <li><span>03</span> Test source-linked answers and prepared drafts with your team</li>
            </ul>
          </section>
          <section className="login-panel" aria-labelledby="trial-title">
            <div className="login-mark">R/M</div>
            <p className="access-label">Pilot request</p>
            <h2 id="trial-title">Request your Reg Mitra workspace</h2>
            <p>Send the request from your work email. We will confirm fit, setup, and the start date before issuing access.</p>
            {params.submitted === "1" ? (
              <div className="notice" role="status">
                <strong>Request saved.</strong>
                We recorded your work email and firm. Your pilot will begin only after access is approved.
              </div>
            ) : params.duplicate === "1" ? (
              <div className="notice" role="status">
                <strong>Your firm already has a trial request.</strong>
                We saved this contact, but a second trial cannot be started for the same organization.
              </div>
            ) : (
              <form action="/api/trials" method="post">
                <label htmlFor="trial-contact-name">Your name</label>
                <input autoComplete="name" id="trial-contact-name" name="contact_name" required type="text" />
                <label htmlFor="trial-email">Work email</label>
                <input autoComplete="email" id="trial-email" name="email" required type="email" />
                <label htmlFor="trial-organization">Firm name</label>
                <input autoComplete="organization" id="trial-organization" name="organization_name" required type="text" />
                <label htmlFor="trial-domain">Firm website or domain</label>
                <input
                  autoCapitalize="none"
                  id="trial-domain"
                  name="organization_domain"
                  placeholder="yourfirm.in"
                  type="text"
                />
                {params.error && errors[params.error]
                  ? <p className="form-error" role="alert">{errors[params.error]}</p>
                  : null}
                <button className="marketing-button primary wide" type="submit">
                  Save pilot request <span>→</span>
                </button>
              </form>
            )}
            <small>One pilot per organization. No card and no automatic charge. We store these details only to manage access and prevent duplicate trials.</small>
            <Link href="/today">Want to explore first? Open the sample workspace →</Link>
          </section>
        </section>

        <MarketingWorkflow />
      </main>
    </PublicShell>
  );
}
