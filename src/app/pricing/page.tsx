import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Pricing</p>
          <h1>Try Reg Mitra for seven days.</h1>
          <p>Use daily regulatory monitoring, client-impact mapping, and review-ready actions with your firm’s workflow before choosing a subscription.</p>
        </header>
        <section className="pricing-comparison">
          <article>
            <p className="pricing-label">Available now</p>
            <h2>7-day trial</h2>
            <strong>No payment to begin</strong>
            <p>We configure selected sources, client context, review gates, and one workflow that matters to your practice. Your seven days begin once access is ready.</p>
            <ul><li>Selected official-source monitoring</li><li>Client-impact workflow design</li><li>Live source-linked calendar</li><li>Ask and Act review controls</li></ul>
            <Link className="marketing-button primary" href="/start">Request your 7-day trial</Link>
          </article>
          <article className="pricing-future">
            <p className="pricing-label">After your trial</p>
            <h2>Team subscription</h2>
            <strong>Choose after seven days</strong>
            <p>Continue with a secure paid Reg Mitra workspace for your team, client profiles, live calendars, and governed actions. Pricing is shared before you subscribe.</p>
            <ul><li>Continuous regulatory radar</li><li>Personalised client impact</li><li>Team roles and approvals</li><li>Private firm and client data</li></ul>
            <span className="pricing-note">No automatic charge after the trial</span>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
