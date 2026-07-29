import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function StartPage() {
  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Connect with Reg Mitra</p>
          <h1>Tell us where compliance work gets stuck.</h1>
          <p>We are speaking with CA firms and compliance teams about source coverage, client workflows, and private pilot workspaces.</p>
          <ul>
            <li><span>01</span> Share the bodies, acts, and sectors you monitor</li>
            <li><span>02</span> Walk us through one client workflow end to end</li>
            <li><span>03</span> Define what Ask and Act should safely handle</li>
          </ul>
        </section>
        <section className="login-panel">
          <div className="login-mark">R/M</div>
          <p className="access-label">A human conversation</p>
          <h2>Ask a question or discuss a pilot</h2>
          <p>Tell us what your firm needs covered and which part of the workflow you want to reduce, verify, or prepare.</p>
          <a
            className="marketing-button primary wide"
            href="mailto:kanishk@outreach.learno.ai?subject=Reg%20Mitra%20conversation"
          >
            Email the team <span>→</span>
          </a>
          {process.env.NODE_ENV !== "production" ? (
            <form action="/api/auth/local-product" method="post">
              <button className="marketing-button wide" type="submit">
                Open local workspace <span>→</span>
              </button>
            </form>
          ) : null}
          <small>Please do not include confidential client data, portal credentials, passwords, or OTPs.</small>
          <Link href="/demo">Want to explore first? Open the template demo →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
