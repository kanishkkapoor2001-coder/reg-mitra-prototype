import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Pricing</p>
          <h1>Start with the product today.</h1>
          <p>Product access is open locally now. Paid team workspaces will launch after production security and billing are ready.</p>
        </header>
        <section className="pricing-comparison">
          <article>
            <p className="pricing-label">Available now</p>
            <h2>Reg Mitra workspace</h2>
            <strong>Early access</strong>
            <p>Use the complete product workflow locally, with a source-linked calendar and AI assistance.</p>
            <ul><li>Today priority queue</li><li>Source-linked compliance calendar</li><li>AI-assisted compliance research</li><li>Client workspaces</li></ul>
            <Link className="marketing-button primary" href="/start">Start today</Link>
          </article>
          <article className="pricing-future">
            <p className="pricing-label">Opening later</p>
            <h2>Team workspace</h2>
            <strong>Pricing before launch</strong>
            <p>A private, paid workspace for real teams and client data. No payment is being collected today.</p>
            <ul><li>Secure team accounts</li><li>Private firm and client data</li><li>Roles and review controls</li><li>Billing and service terms</li></ul>
            <span className="pricing-note">Customer access is not yet enabled</span>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
