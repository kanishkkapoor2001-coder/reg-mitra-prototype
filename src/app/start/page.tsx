import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function StartPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Start with Reg Mitra</p>
          <h1>Your compliance workspace begins here.</h1>
          <p>Enter the full local product experience: priority work, client context, source-linked deadlines, and AI-assisted research.</p>
          <ul>
            <li><span>01</span> Begin with the work that needs judgment</li>
            <li><span>02</span> Keep official evidence one step away</li>
            <li><span>03</span> Move from question to reviewable action</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <p className="access-label">Early product access</p>
          <h2>Start your workspace</h2>
          <p>This opens the complete locally hosted product. Production customer accounts and confidential-data controls are still being prepared.</p>
          <form action="/api/auth/start" method="post">
            <button className="marketing-button primary wide" type="submit">Start today <span>→</span></button>
          </form>
          <small>Do not enter confidential client data until production authentication and storage are connected.</small>
          <Link href="/demo">Prefer to explore sample data? Open the demo →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
