import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Pilot access",
  description: "Request a seven-day Reg Mitra pilot. No card, no automatic charge, and pricing confirmed before any paid plan.",
};

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Private pilot</p>
          <h1>Try Reg Mitra for seven days.</h1>
          <p>Request a workspace for one focused firm workflow. No card is required, and the pilot starts only after setup is confirmed.</p>
        </header>
        <section className="pricing-comparison">
          <article>
            <p className="pricing-label">Available now</p>
            <h2>Seven-day pilot</h2>
            <strong>No charge · no card required</strong>
            <p>Use a firm workspace with a small client set and a defined compliance workflow. Access is issued manually so the scope is clear before the seven days begin.</p>
            <ul><li>Source-linked Answer and Prepare sessions</li><li>Client records, work queue, and review controls</li><li>Selected official-source regulatory library</li><li>Source-linked calendar for general obligations</li></ul>
            <Link className="marketing-button primary" href="/start">Request pilot access</Link>
          </article>
          <article className="pricing-future">
            <p className="pricing-label">After the pilot</p>
            <h2>Team subscription</h2>
            <strong>Pricing confirmed before you continue</strong>
            <p>If the workflow is useful, we will share the current plan, included users, coverage, and support before any billing step.</p>
            <ul><li>Keep the workspace and review history</li><li>Continue with team roles and approvals</li><li>Agree on regulatory coverage and onboarding</li><li>Choose whether to activate a paid plan</li></ul>
            <span className="pricing-note">The pilot does not convert automatically</span>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
