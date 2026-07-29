import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function StartPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Your 7-day Reg Mitra trial</p>
          <h1>See what changed. See which clients need action.</h1>
          <p>For seven days, use Reg Mitra to monitor selected official updates, understand client impact, and prepare the next step for review.</p>
          <ul>
            <li><span>01</span> Replace repetitive website checking with one regulatory radar</li>
            <li><span>02</span> See client impact before an update becomes urgent</li>
            <li><span>03</span> Begin with source-linked, review-ready work</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <p className="access-label">7-day trial</p>
          <h2>Request trial access</h2>
          <p>Tell us which authorities you follow and one workflow you want to improve. We will confirm the setup and when your seven days begin.</p>
          <a
            className="marketing-button primary wide"
            href="mailto:kanishk@outreach.learno.ai?subject=Reg%20Mitra%207-day%20trial"
          >
            Request your 7-day trial <span>→</span>
          </a>
          <small>No payment is collected to begin. Please do not email confidential client data, credentials, passwords, or OTPs.</small>
          <Link href="/demo">Want to explore first? See Reg Mitra in action →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
