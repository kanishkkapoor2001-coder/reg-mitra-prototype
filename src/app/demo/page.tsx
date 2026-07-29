import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function DemoPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Template demo</p>
          <h1>See Reg Mitra turn a regulatory change into client action.</h1>
          <p>Explore the complete workflow with fictional clients and sample data. Nothing in this demo is a live regulatory or client record.</p>
          <ul>
            <li><span>01</span> Understand a change with its source and caveats</li>
            <li><span>02</span> See which sample clients may be affected</li>
            <li><span>03</span> Prepare a brief, checklist, or calendar change for review</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <p className="access-label">Template access</p>
          <h2>Explore Reg Mitra with sample data</h2>
          <p>Enter the fictional Mehta Shah & Associates workspace with realistic Ask and Act sessions already prepared.</p>
          <form action="/api/auth/demo" method="post">
            <button className="marketing-button primary wide" type="submit">Open the Reg Mitra demo <span>→</span></button>
          </form>
          <small>Template only. Do not enter confidential data, portal credentials, passwords, or OTPs.</small>
          <Link href="/start">Ready to use your own workflow? Start your 7-day trial →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
