import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with two companies. Upgrade for more assistant chat and more clients.",
};

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Pricing</p>
          <h1>Start free. Upgrade when your book grows.</h1>
          <p>Begin free with two companies and the weekly newsletter. Move up when you need more assistant chat and more clients.</p>
        </header>

        <section className="pricing-tiers" aria-label="Reg Mitra plans">
          <article className="tier">
            <p className="tier-label">Available now</p>
            <h2 className="tier-name">Free</h2>
            <p className="tier-price"><span className="tier-cur">₹</span>0</p>
            <p className="tier-note">For getting started</p>
            <ul className="tier-features">
              <li>Source-linked regulatory research &amp; compliance calendar</li>
              <li>Weekly regulatory newsletter</li>
              <li>Personalize up to <strong>2 companies</strong></li>
              <li>Assistant chat, rate-limited</li>
            </ul>
            <Link className="marketing-button quiet tier-cta" href="/today">Open the product</Link>
          </article>

          <article className="tier featured">
            <p className="tier-label">Most popular</p>
            <h2 className="tier-name">Pro</h2>
            <p className="tier-price"><span className="tier-cur">₹</span>2,500<small>/month</small></p>
            <p className="tier-note">For a growing practice</p>
            <ul className="tier-features">
              <li>Everything in Free</li>
              <li><strong>Higher</strong> assistant chat limits</li>
              <li>Personalize up to <strong>10 companies</strong></li>
              <li>Priority email &amp; WhatsApp support</li>
            </ul>
            <a className="marketing-button light tier-cta" href="mailto:kanishk@5avenures.in?subject=Reg%20Mitra%20Pro">Talk to us</a>
          </article>

          <article className="tier soon">
            <p className="tier-label">Coming soon</p>
            <h2 className="tier-name">Unlimited</h2>
            <p className="tier-price"><span className="tier-cur">₹</span>5,000<small>/month</small></p>
            <p className="tier-note">For full-service firms</p>
            <ul className="tier-features">
              <li>Everything in Pro</li>
              <li><strong>Unlimited</strong> assistant chat</li>
              <li><strong>Unlimited</strong> companies</li>
              <li>Everything, without limits</li>
            </ul>
            <span className="tier-cta tier-soon-pill">Coming soon</span>
          </article>
        </section>

        <p className="pricing-foot">
          Have a question about a plan? <a href="mailto:kanishk@5avenures.in">Email us</a> or message
          us on <a href="https://wa.me/919711017316" target="_blank" rel="noreferrer">WhatsApp</a>.
        </p>
      </main>
    </PublicShell>
  );
}
