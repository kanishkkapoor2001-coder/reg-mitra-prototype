import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Try Reg Mitra free for 7 days. Then one simple plan — no card to start.",
};

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Pricing</p>
          <h1>Try it free for 7 days.</h1>
          <p>Run Reg Mitra against your real client book for a week — no card required. Keep going on one simple plan.</p>
        </header>

        <section className="pricing-tiers" aria-label="Reg Mitra plans">
          <article className="tier">
            <p className="tier-label">Start here</p>
            <h2 className="tier-name">Free trial</h2>
            <p className="tier-price">7<small>days</small></p>
            <p className="tier-note">Full Pro access, no card</p>
            <ul className="tier-features">
              <li>Everything in <strong>Pro</strong>, for 7 days</li>
              <li>Match changes to up to <strong>6 client companies</strong></li>
              <li>Source-linked research &amp; compliance calendar</li>
              <li>Weekly regulatory newsletter</li>
            </ul>
            <Link className="marketing-button quiet tier-cta" href="/signup?plan=pro">Start free trial</Link>
          </article>

          <article className="tier featured">
            <p className="tier-label">Most popular</p>
            <h2 className="tier-name">Pro</h2>
            <p className="tier-price"><span className="tier-cur">₹</span>2,500<small>/month</small></p>
            <p className="tier-note">For a growing practice</p>
            <ul className="tier-features">
              <li>Everything in the trial, continued</li>
              <li>Match changes to up to <strong>6 client companies</strong></li>
              <li>Assistant chat for research and drafting</li>
              <li>Priority email &amp; WhatsApp support</li>
            </ul>
            <Link className="marketing-button light tier-cta" href="/signup?plan=pro">Start with Pro</Link>
          </article>

          <article className="tier soon">
            <p className="tier-label">Coming soon</p>
            <h2 className="tier-name">Ultra</h2>
            <p className="tier-price"><span className="tier-cur">₹</span>5,000<small>/month</small></p>
            <p className="tier-note">For full-service firms</p>
            <ul className="tier-features">
              <li>Everything in Pro</li>
              <li><strong>Unlimited</strong> client companies</li>
              <li><strong>Unlimited</strong> assistant chat</li>
              <li>Everything, without limits</li>
            </ul>
            <Link className="marketing-button quiet tier-cta" href="/signup?plan=ultra">Join the waitlist</Link>
          </article>
        </section>

        <section className="pricing-enterprise">
          <div>
            <h2>Custom enterprise plans</h2>
            <p>
              Larger firm, multiple offices, or a workflow of your own? We build the plan around
              your book — seats, sources, and support agreed with you directly.
            </p>
          </div>
          <a
            className="marketing-button quiet"
            href="mailto:kanishk@learno.ai?subject=Reg%20Mitra%20enterprise%20plan"
          >
            Talk to us
          </a>
        </section>

        <p className="pricing-foot">
          Have a question about a plan? <a href="mailto:kanishk@learno.ai">Email us</a> or message
          us on <a href="https://wa.me/919711017316" target="_blank" rel="noreferrer">WhatsApp</a>.
        </p>
      </main>
    </PublicShell>
  );
}
