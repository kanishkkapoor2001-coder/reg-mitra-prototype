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
            <h2>Seven days free</h2>
            <strong>No card required</strong>
            <p>Create a secure firm workspace and use Reg Mitra for seven days. The trial begins when your workspace is created.</p>
            <ul><li>Updates from official sources</li><li>Personalised client impact</li><li>Source-linked compliance calendar</li><li>Answers and drafts with review controls</li></ul>
            <Link className="marketing-button primary" href="/start">Start 7-day trial</Link>
          </article>
          <article className="pricing-future">
            <p className="pricing-label">After your trial</p>
            <h2>Team subscription</h2>
            <strong>Keep your workspace active</strong>
            <p>Subscribe to continue using Reg Mitra with your team, client profiles, calendars, and reviewed drafts.</p>
            <ul><li>Continuous official-source monitoring</li><li>Personalised client impact</li><li>Team roles and approvals</li><li>Private firm and client data</li></ul>
            <span className="pricing-note">You choose whether to subscribe</span>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
