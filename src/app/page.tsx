import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <p className="marketing-kicker">Regulatory work, with a calmer centre</p>
            <h1>The compliance day, already sorted.</h1>
            <p className="marketing-lede">
              Reg Mitra brings deadlines, client context, and source-aware answers into one
              deliberate workspace for Indian compliance teams.
            </p>
            <div className="marketing-actions">
              <Link className="marketing-button primary" href="/start">Start today</Link>
              <Link className="marketing-button quiet" href="/demo">Explore demo</Link>
            </div>
            <p className="marketing-proof">No card required · Source-aware workflows · Official sources linked</p>
          </div>

          <div className="ledger-object" aria-label="A preview of the Reg Mitra compliance ledger">
            <div className="ledger-rail"><span>RM</span><i /><small>2026</small></div>
            <div className="ledger-sheet ledger-sheet-back" />
            <div className="ledger-sheet ledger-sheet-front">
              <div className="ledger-sheet-head">
                <span>Compliance ledger</span>
                <strong>July</strong>
              </div>
              <div className="ledger-date-row">
                <time>31</time>
                <div><strong>Quarterly TDS statement</strong><small>Income Tax Department · Official source</small></div>
                <span className="ledger-status">3 days</span>
              </div>
              <div className="ledger-date-row muted">
                <time>07</time>
                <div><strong>TDS deposit</strong><small>Monthly obligation · Conditional</small></div>
                <span>Filed</span>
              </div>
              <div className="ledger-note">
                <span>Every answer keeps its evidence attached.</span>
                <i>↗</i>
              </div>
            </div>
          </div>
        </section>

        <section className="marketing-principle">
          <p>Built for the person doing the work</p>
          <blockquote>
            The useful answer is not another dashboard. It is knowing what matters now,
            why it matters, and where the rule came from.
          </blockquote>
        </section>

        <section className="marketing-process" id="how-it-works">
          <div className="section-intro">
            <p className="marketing-kicker">One continuous workflow</p>
            <h2>From obligation to decision, without the hunt.</h2>
          </div>
          <ol className="process-list">
            <li><span>01</span><div><h3>Begin with today</h3><p>See the few items that need judgment, ranked ahead of routine work.</p></div></li>
            <li><span>02</span><div><h3>Open the evidence</h3><p>Trace a deadline or answer back to the authority before relying on it.</p></div></li>
            <li><span>03</span><div><h3>Act with client context</h3><p>Move from the rule to the relevant client workspace without losing the thread.</p></div></li>
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
            <Link className="marketing-text-link" href="/start">Explore the live calendar →</Link>
          </div>
          <div className="calendar-mini" aria-hidden="true">
            <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span>
            <i>27</i><i>28</i><i>29</i><i>30</i><i className="mini-deadline">31<small>TDS</small></i>
          </div>
        </section>

        <section className="marketing-cta">
          <p className="marketing-kicker">Experience the product</p>
          <h2>Give the work a quieter place to happen.</h2>
          <Link className="marketing-button light" href="/start">Start today</Link>
        </section>
      </main>
    </PublicShell>
  );
}
