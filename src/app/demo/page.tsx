import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function DemoPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Template demo</p>
          <h1>See the workflow without mistaking it for live data.</h1>
          <p>Explore a clearly labelled template with fictional clients, synthetic compliance states, realistic Ask and Act sessions, and visible review gates.</p>
          <ul>
            <li><span>01</span> Ask explains and shows what must be verified</li>
            <li><span>02</span> Act prepares a draft but never executes it</li>
            <li><span>03</span> No live portal, ledger, filing, or client system</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <p className="access-label">Template access</p>
          <h2>Open the guided template</h2>
          <p>You will enter the fictional Mehta Shah & Associates workspace with a complete sample conversation already open.</p>
          <form action="/api/auth/demo" method="post">
            <button className="marketing-button primary wide" type="submit">Open template demo <span>→</span></button>
          </form>
          <small>Template only. Do not enter confidential data, portal credentials, passwords, or OTPs.</small>
          <Link href="/start">Want to discuss a private pilot? Connect with us →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
