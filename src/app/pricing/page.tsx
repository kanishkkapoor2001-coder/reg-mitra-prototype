import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Open access",
  description: "Use the Reg Mitra regulatory workspace without a sign-in, trial, or payment.",
};

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Open access</p>
          <h1>The full Reg Mitra workspace is free to use.</h1>
          <p>No account, access code, trial request, card, or subscription is required.</p>
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
          <article className="pricing-future">
            <p className="pricing-label">Access</p>
            <h2>No gatekeeping</h2>
            <strong>One public link</strong>
            <p>Share the product URL with anyone. It opens directly into the workspace without email authentication or a founder bypass code.</p>
            <ul>
              <li>No expiring magic links</li>
              <li>No one-time access codes</li>
              <li>No organization trial restriction</li>
              <li>No billing interruption</li>
            </ul>
            <Link className="marketing-button quiet" href="/assistant">Try the Assistant</Link>
          </article>
        </section>
      </main>
    </PublicShell>
  );
}
