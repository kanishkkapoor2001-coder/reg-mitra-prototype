import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Live product demo",
  description: "Explore Reg Mitra with sample clients and pre-built regulatory review sessions. No live portal or client system is connected.",
};

export default function DemoPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Live product demo · sample data</p>
          <h1>Follow one update from source to client review.</h1>
          <p>Explore a sample CA firm workspace. See how Reg Mitra researches a regulatory question, checks recorded client facts, and prepares a draft without sending or filing anything.</p>
          <ul>
            <li><span>01</span> Inspect a regulatory answer and its evidence status</li>
            <li><span>02</span> Review which sample client facts change applicability</li>
            <li><span>03</span> Prepare a client note or checklist for approval</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <p className="access-label">Live product demo</p>
          <h2>Explore the sample workspace</h2>
          <p>A sample workspace with fictional clients and pre-built conversations lets you inspect the review flow in a few minutes. Start with “Circular to client note” to see Answer and Prepare together.</p>
          <form action="/api/auth/demo" method="post">
            <button className="marketing-button primary wide" type="submit">Open the sample workspace <span>→</span></button>
          </form>
          <small>Sample data only. Do not enter client information, passwords, portal credentials, or OTPs.</small>
          <Link href="/today">Want to use the full workspace? Open the product →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
