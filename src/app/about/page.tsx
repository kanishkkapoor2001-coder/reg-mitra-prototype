import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function AboutPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero">
          <p className="marketing-kicker">Why Reg Mitra exists</p>
          <h1>Reg Mitra turns regulatory change into client action.</h1>
          <p>It is a regulatory intelligence workspace for Indian CA firms—connecting official updates, client context, deadlines, and review-ready next steps.</p>
        </header>
        <section className="manifesto-grid">
          <p>Your team should not have to search, interpret, match, and draft from scratch every time a rule changes.</p>
          <div>
            <h2>Monitor once, across the firm</h2>
            <p>Selected official sources flow into one regulatory radar instead of being checked manually by every team member.</p>
            <h2>Move from rule to the right clients</h2>
            <p>Reg Mitra connects a change to client profile, sector, location, registrations, and transaction context.</p>
            <h2>Prepare work without surrendering judgment</h2>
            <p>Answer explains with sources. Prepare creates the next step for review. Professional approval stays attached before anything leaves the workspace.</p>
          </div>
        </section>
        <section className="editorial-callout">
          <blockquote>Less time finding the change. More time advising the client.</blockquote>
          <Link className="marketing-button primary" href="/demo">See Reg Mitra in action</Link>
        </section>
      </main>
    </PublicShell>
  );
}
