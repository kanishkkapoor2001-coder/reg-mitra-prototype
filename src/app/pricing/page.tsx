import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Pricing</p>
          <h1>Use Reg Mitra free for seven days.</h1>
          <p>Create your firm’s secure workspace and use the complete regulatory monitoring, client-impact, calendar, Ask, and Act workflow.</p>
        </header>
        <section className="pricing-comparison">
          <article>
            <p className="pricing-label">Available now</p>
            <h2>7-day full-product trial</h2>
            <strong>No card required</strong>
            <p>Create a secure firm workspace and use Reg Mitra for seven days. The trial begins when your workspace is created.</p>
            <ul><li>Official-source regulatory radar</li><li>Personalised client impact</li><li>Live source-linked calendar</li><li>Ask and Act review controls</li></ul>
            <Link className="marketing-button primary" href="/start">Start 7-day trial</Link>
          </article>
          <article className="pricing-future">
            <p className="pricing-label">After your trial</p>
            <h2>Team subscription</h2>
            <strong>Keep your workspace active</strong>
            <p>Subscribe to continue using Reg Mitra with your team, client profiles, live calendars, and governed actions.</p>
            <ul><li>Continuous regulatory radar</li><li>Personalised client impact</li><li>Team roles and approvals</li><li>Private firm and client data</li></ul>
            <span className="pricing-note">You choose whether to subscribe</span>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
