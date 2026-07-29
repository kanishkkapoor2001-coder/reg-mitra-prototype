import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function StartPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">7-day full-product trial</p>
          <h1>See what changed. See which clients need action.</h1>
          <p>Use Reg Mitra for seven days to monitor official updates, understand client impact, and prepare the next step for review.</p>
          <ul>
            <li><span>01</span> Track official regulatory changes in one radar</li>
            <li><span>02</span> Map updates to the clients and deadlines they affect</li>
            <li><span>03</span> Prepare source-linked actions for professional review</li>
          </ul>
        </section>
        <section className="login-panel" aria-labelledby="trial-title">
          <div className="login-mark">R/M</div>
          <p className="access-label">7-day full access</p>
          <h2 id="trial-title">Start your Reg Mitra trial</h2>
          <p>Trial access is issued securely to your work email. Your seven days begin when your firm’s workspace is created.</p>
          <a
            className="marketing-button primary wide"
            href="mailto:kanishk@outreach.learno.ai?subject=Start%20my%207-day%20Reg%20Mitra%20trial"
          >
            Start 7-day trial <span>→</span>
          </a>
          <small>No card required. Your trial begins when you create your workspace, with no automatic charge afterward.</small>
          <Link href="/demo">Want to explore first? See Reg Mitra in action →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
