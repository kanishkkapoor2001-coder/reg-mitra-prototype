import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <p className="marketing-kicker">Regulatory intelligence for Indian CA firms</p>
            <h1>Every regulatory change, mapped to the clients it affects.</h1>
            <p className="marketing-lede">
              Reg Mitra monitors official circulars, explains what changed, identifies the
              clients that need attention, and prepares the next step for professional review.
            </p>
            <div className="marketing-actions">
              <Link className="marketing-button primary" href="/demo">Explore the template</Link>
              <Link className="marketing-button quiet" href="/start">Discuss a pilot</Link>
            </div>
            <p className="marketing-proof">Official-source monitoring · Client-specific impact · Approval-gated actions</p>
          </div>

          <div className="ledger-object" aria-label="A preview of a client-specific regulatory impact brief">
            <div className="ledger-rail"><span>RM</span><i /><small>2026</small></div>
            <div className="ledger-sheet ledger-sheet-back" />
            <div className="ledger-sheet ledger-sheet-front">
              <div className="ledger-sheet-head">
                <span>Regulatory impact brief</span>
                <strong>New</strong>
              </div>
              <div className="ledger-date-row">
                <time>01</time>
                <div><strong>Official update detected</strong><small>CBIC · Original publication attached</small></div>
                <span className="ledger-status">Verified</span>
              </div>
              <div className="ledger-date-row muted">
                <time>02</time>
                <div><strong>Two clients need review</strong><small>Matched to sector and transaction context</small></div>
                <span>Mapped</span>
              </div>
              <div className="ledger-note">
                <span>Next: prepare the client brief for approval.</span>
                <i>↗</i>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-principle">
          <p>Built for the person doing the work</p>
          <blockquote>
            The useful answer is not another circular summary. It is knowing which clients
            are affected, why, and what to do next.
          </blockquote>
        </section>

        <section className="marketing-process" id="how-it-works">
          <div className="section-intro">
            <p className="marketing-kicker">One continuous workflow</p>
            <h2>From official update to client action.</h2>
          </div>
          <ol className="process-list">
            <li><span>01</span><div><h3>Monitor official sources</h3><p>Bring new circulars and regulatory updates into one source-linked review queue.</p></div></li>
            <li><span>02</span><div><h3>See who is affected</h3><p>Match the change to each client’s sector, location, profile, and transaction context.</p></div></li>
            <li><span>03</span><div><h3>Ask or prepare the action</h3><p>Explain the impact or draft the next step, with evidence and professional approval attached.</p></div></li>
          </ol>
        </section>

        <section className="marketing-calendar-preview">
          <div>
            <p className="marketing-kicker">A calendar you can interrogate</p>
            <h2>Dates are useful. Applicability is the work.</h2>
            <p>
              Reg Mitra’s compliance calendar separates recurring national obligations from
              client-specific applicability and links each rule to its source.
            </p>
            <Link className="marketing-text-link" href="/demo">See the template calendar →</Link>
          </div>
          <div className="calendar-mini" aria-hidden="true">
            <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span>
            <i>27</i><i>28</i><i>29</i><i>30</i><i className="mini-deadline">31<small>TDS</small></i>
          </div>
        </section>

        <section className="marketing-cta">
          <p className="marketing-kicker">See the full workflow</p>
          <h2>Know what changed. Know who it affects. Prepare what comes next.</h2>
          <Link className="marketing-button light" href="/demo">Explore the template</Link>
        </section>
      </main>
    </PublicShell>
  );
}
