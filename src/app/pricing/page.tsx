import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Open access",
  description: "Use the core Reg Mitra workspace without a sign-in, trial, or payment.",
};

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Open access</p>
          <h1>The core Reg Mitra workspace is free to use.</h1>
          <p>No account, access code, trial request, card, or subscription is required. Five memories per client are included; more capacity is optional.</p>
        </header>
        <section className="pricing-comparison">
          <article>
            <p className="pricing-label">Available now</p>
            <h2>Complete workspace</h2>
            <strong>Free · no sign-in required</strong>
            <p>Open the product and use its source-linked regulatory research, workflow, client examples, and source-linked compliance calendar immediately.</p>
            <ul>
              <li>Source-grounded Ask and Act sessions</li>
              <li>Client workspace and review queue</li>
              <li>Official-source regulatory library</li>
              <li>Live source-linked compliance calendar</li>
            </ul>
            <Link className="marketing-button primary" href="/today">Open the product</Link>
          </article>
          <article className="pricing-future" id="client-memory">
            <p className="pricing-label">Client intelligence</p>
            <h2>Memory capacity</h2>
            <strong>5 client memories included</strong>
            <p>Keep the most useful client facts and working preferences visible and available to client-specific Assistant conversations.</p>
            <ul>
              <li>Five separate memories for every client</li>
              <li>Every memory remains visible and editable</li>
              <li>Strict client-by-client context separation</li>
              <li>Additional capacity as a paid add-on</li>
            </ul>
            <p className="pricing-note">Add-on pricing is confirmed before activation. No automatic charge.</p>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
