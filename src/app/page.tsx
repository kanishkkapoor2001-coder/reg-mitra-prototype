import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <p className="marketing-kicker">The regulatory intelligence workspace for Indian CA firms</p>
            <h1>Know what changed. Know which clients need action.</h1>
            <p className="marketing-lede">
              Reg Mitra monitors selected official sources every day, explains each regulatory
              change, maps it to the right clients, and prepares the next action for your review.
            </p>
            <div className="marketing-actions">
              <Link className="marketing-button primary" href="/demo">See Reg Mitra in action</Link>
              <Link className="marketing-button quiet" href="/start">Start your 7-day trial</Link>
            </div>
            <p className="marketing-proof">Less manual checking · Earlier client action · Every answer source-linked</p>
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
          <p>Reg Mitra in one sentence</p>
          <blockquote>
            Reg Mitra tells your firm what changed, which clients need attention, and what
            to do next—with the official source attached.
          </blockquote>
        </section>

        <section className="marketing-process" id="how-it-works">
          <div className="section-intro">
            <p className="marketing-kicker">How Reg Mitra supercharges your firm</p>
            <h2>Turn hours of monitoring into a clear client-action list.</h2>
          </div>
          <ol className="process-list">
            <li><span>01</span><div><h3>Stop checking every website yourself</h3><p>Reg Mitra monitors the official bodies your firm follows and brings new updates into one source-linked review queue.</p></div></li>
            <li><span>02</span><div><h3>Know exactly which clients need attention</h3><p>Each change is matched against client sector, location, registrations, profile, and transaction context.</p></div></li>
            <li><span>03</span><div><h3>Start with the next action already prepared</h3><p>Ask explains the impact. Act prepares a client brief, checklist, calendar change, or draft communication for professional approval.</p></div></li>
          </ol>
        </section>

        <section className="marketing-calendar-preview">
          <div>
            <p className="marketing-kicker">A calendar that stays current</p>
            <h2>See the deadline, the source, and who it applies to.</h2>
            <p>
              The live product calendar refreshes daily, separates general obligations from
              client-specific applicability, and keeps the authority behind every date attached.
            </p>
            <Link className="marketing-text-link" href="/demo">Explore the static demo calendar →</Link>
          </div>
          <div className="calendar-mini" aria-hidden="true">
            <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span>
            <i>27</i><i>28</i><i>29</i><i>30</i><i className="mini-deadline">31<small>TDS</small></i>
          </div>
        </section>

        <section className="marketing-cta">
          <p className="marketing-kicker">Try Reg Mitra with your workflow</p>
          <h2>Give your team fewer places to check—for seven days.</h2>
          <Link className="marketing-button light" href="/start">Start your 7-day trial</Link>
        </section>
      </main>
    </PublicShell>
  );
}
