import Link from "next/link";
import type { Metadata } from "next";
import { LiveDemoShowcase } from "@/components/live-demo-showcase";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Features",
  description: "See Reg Mitra work — research a regulatory question, review the queue, check client impact, prepare a draft, and inspect deadlines. Each shown in motion.",
};

export default function FeaturesPage() {
  return (
    <PublicShell>
      <main>
        <section className="features-hero">
          <p className="marketing-kicker">Features · shown in motion</p>
          <h1>Five jobs, one connected review path.</h1>
          <p>
            Reg Mitra keeps the official source, your client facts, and the next draft together —
            from the first question to a reviewed decision. Here is each part, playing out on its
            own. Every demo uses sample data; nothing is sent, filed, or paid.
          </p>
          <div className="marketing-actions">
            <Link className="marketing-button primary" href="/today">Open the interactive demo</Link>
            <Link className="marketing-button quiet" href="/start">Request pilot access</Link>
          </div>
        </section>

        <section className="marketing-demo-section">
          <LiveDemoShowcase />
        </section>

        <section className="marketing-cta">
          <p className="marketing-kicker">Private pilot · seven days · no card</p>
          <h2>Put it to work on one of your own workflows.</h2>
          <p>We confirm the pilot scope and start date before creating your workspace.</p>
          <Link className="marketing-button light" href="/start">Request pilot access</Link>
        </section>
      </main>
    </PublicShell>
  );
}
