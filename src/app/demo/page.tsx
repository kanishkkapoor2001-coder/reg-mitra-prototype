import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function DemoPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Separate product demo</p>
          <h1>Explore the workflow with sample data.</h1>
          <p>Enter a clearly labelled demonstration workspace with six fictional clients, a source-linked calendar, and AI assistance.</p>
          <ul>
            <li><span>01</span> No password or card</li>
            <li><span>02</span> Sample records stay clearly labelled</li>
            <li><span>03</span> Progress resets with the browser session</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <p className="access-label">Demonstration access</p>
          <h2>Open sample workspace</h2>
          <p>You will join as a demonstration partner at the fictional Mehta Shah & Associates.</p>
          <form action="/api/auth/demo" method="post">
            <button className="marketing-button primary wide" type="submit">Explore demo <span>→</span></button>
          </form>
          <small>This is a sample environment. Do not enter confidential data.</small>
          <Link href="/start">Ready for the product? Start today →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
