import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Pricing</p>
          <h1>Try the complete product before the paywall arrives.</h1>
          <p>The demo is open now. Paid firm workspaces will launch after access, security, and billing are production-ready.</p>
        </header>
        <section className="pricing-comparison">
          <article>
            <p className="pricing-label">Available now</p>
            <h2>Product demo</h2>
            <strong>Free</strong>
            <p>Explore the full interaction model with clearly labelled sample clients and live AI assistance.</p>
            <ul><li>Today priority queue</li><li>Source-linked compliance calendar</li><li>AI-assisted compliance research</li><li>Demo client workspaces</li></ul>
            <Link className="marketing-button primary" href="/login">Open demo</Link>
          </article>
          <article className="pricing-future">
            <p className="pricing-label">Opening later</p>
            <h2>Firm workspace</h2>
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
