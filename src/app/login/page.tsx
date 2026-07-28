import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function LoginPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Product demo</p>
          <h1>See the work from the user’s side.</h1>
          <p>Enter a complete sample workspace with six fictional clients, a real source-linked calendar, and live AI assistance.</p>
          <ul>
            <li><span>01</span> No password or card</li>
            <li><span>02</span> Demo records are clearly labelled</li>
            <li><span>03</span> Progress stays in this browser session</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <h2>Enter demo workspace</h2>
          <p>You will join as a demo partner at Mehta Shah & Associates.</p>
          <form action="/api/auth/demo" method="post">
            <button className="marketing-button primary wide" type="submit">Continue to Reg Mitra <span>→</span></button>
          </form>
          <small>This is not a customer account. Do not enter confidential data.</small>
          <Link href="/">← Return to welcome page</Link>
        </section>
      </main>
    </PublicShell>
  );
}
