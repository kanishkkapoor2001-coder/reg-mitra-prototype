import Link from "next/link";
import { HeroRadar } from "@/components/hero-radar";
import { MarketingWorkflow } from "@/components/marketing-workflow";
import { PublicShell } from "@/components/public-shell";
import { RotatingWord } from "@/components/rotating-word";

export default function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <p className="marketing-kicker">Personalized regulatory intelligence · Indian CA firms</p>
            <h1 className="hero-rotating-h1">
              <span className="hero-h1-line">Every</span>
              <span className="hero-h1-line"><RotatingWord />,</span>
              <span className="hero-h1-line">matched to the clients it affects.</span>
            </h1>
            <p className="marketing-lede">
              Reg Mitra reads the official sources, flags which of <em>your</em> clients each
              change touches, ranks what needs a decision, and prepares review-ready work — every
              claim tied to its circular. Not a chatbot you have to prompt: a system that knows
              your book.
            </p>
            <div className="marketing-actions">
              <Link className="marketing-button primary" href="/pricing">Talk to us</Link>
              <Link className="marketing-button quiet" href="/features">See how it works</Link>
            </div>
            <div className="hero-contact">
              <span className="hero-contact-label">Contact sales</span>
              <a className="hero-contact-link" href="mailto:sales@regmitra.in">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12v8H2z" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M2.5 4.5 8 8.5l5.5-4" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
                sales@regmitra.in
              </a>
              <a className="hero-contact-link" href="https://wa.me/919711017316" target="_blank" rel="noreferrer" aria-label="Message sales on WhatsApp">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2a6 6 0 0 0-5.2 9L2 14l3.1-.8A6 6 0 1 0 8 2Z" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
                WhatsApp
              </a>
            </div>
            <p className="marketing-proof">Matched to your clients · Every claim sourced · Nothing sent or filed</p>
          </div>

          <HeroRadar />
        </section>

        <section className="compare-section" id="why" aria-label="Why Reg Mitra is more than a chatbot">
          <div className="compare-intro">
            <p className="marketing-kicker">Beyond a chatbot</p>
            <h2>A general chatbot answers. Reg Mitra does the work.</h2>
            <p>
              ChatGPT and Claude are brilliant generalists — but they don’t know your clients,
              can’t promise the source, and stop at the reply. Reg Mitra is built for the whole
              compliance workflow of an Indian CA firm.
            </p>
          </div>
          <div className="compare-grid">
            <div className="compare-card generic">
              <p className="compare-label">A general AI chatbot</p>
              <span className="compare-sub">ChatGPT, Claude, and the rest</span>
              <ul>
                <li>Answers whatever you type — as plausibly as it can</li>
                <li>Has no idea who your clients are</li>
                <li>No guarantee the answer traces to an official source</li>
                <li>Can quietly invent a circular, section, or date</li>
                <li>Stops at the answer — you do the mapping, the ranking, and the work</li>
              </ul>
            </div>
            <div className="compare-card ours">
              <p className="compare-label">Reg Mitra</p>
              <span className="compare-sub">Built for CA firms</span>
              <ul>
                <li>Reads and indexes official Indian regulatory sources</li>
                <li>Matches each change to your specific clients and their facts</li>
                <li>Every claim tied to its circular — gaps and stale sources shown</li>
                <li>Refuses to answer beyond the evidence instead of guessing</li>
                <li>Ranks the decision and prepares the note, checklist, or calendar update</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="marketing-principle" id="product">
          <p>What stays connected</p>
          <blockquote>
            The source, the client facts, and the next draft—kept together from first question
            to final review.
          </blockquote>
        </section>

        <MarketingWorkflow />

        <section className="marketing-process" id="how-it-works">
          <div className="section-intro">
            <p className="marketing-kicker">Built for the work between research and delivery</p>
            <h2>Replace scattered research with one review path.</h2>
          </div>
          <ol className="process-list">
            <li><span>01</span><div><h3>Research from official material</h3><p>Search a selected regulatory library and open the source behind the answer.</p></div></li>
            <li><span>02</span><div><h3>Review the clients that may be affected</h3><p>Use recorded client context and open work to structure an applicability check. Missing facts remain visible.</p></div></li>
            <li><span>03</span><div><h3>Prepare the work, not the filing</h3><p>Create a reviewable draft with its evidence requirements and execution status. Sending, filing, payment, and portal steps remain outside the current pilot.</p></div></li>
          </ol>
        </section>

        <section className="marketing-calendar-preview">
          <div>
            <p className="marketing-kicker">Source-linked deadline review</p>
            <h2>See the date, then inspect what supports it.</h2>
            <p>
              Review recurring GST, direct-tax, and payroll obligations alongside selected
              regulatory effective dates. Each item shows the authority and source status.
              Extensions and client applicability remain review-gated.
            </p>
            <Link className="marketing-text-link" href="/features">See how it works →</Link>
          </div>
          <div className="calendar-proof" aria-label="Sample July 2026 compliance calendar">
            <div className="calendar-proof-head">
              <div><span>Compliance calendar</span><strong>July 2026</strong></div>
              <span>Sample schedule</span>
            </div>
            <div
              className="calendar-proof-grid"
              aria-label="Selected deadlines. Scroll horizontally on smaller screens."
              role="region"
              tabIndex={0}
            >
              <span><b>07</b><small>TDS deposit</small></span>
              <span><b>11</b><small>GSTR-1</small></span>
              <span><b>15</b><small>EPF</small></span>
              <span className="selected"><b>20</b><small>GSTR-3B</small></span>
              <span><b>31</b><small>Q1 TDS statement</small></span>
            </div>
            <div className="calendar-proof-detail">
              <span>Selected obligation</span>
              <h3>GSTR-3B monthly return for June 2026</h3>
              <p>Goods and Services Tax Network</p>
              <dl>
                <div><dt>Standard date</dt><dd>20 July · extensions may apply</dd></div>
                <div><dt>Client applicability</dt><dd>Not assessed</dd></div>
                <div><dt>Evidence</dt><dd>Official source linked</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="marketing-cta">
          <p className="marketing-kicker">Private pilot · seven days · no card</p>
          <h2>Test one compliance workflow with your team.</h2>
          <p>We confirm the pilot scope and start date before creating your workspace.</p>
          <Link className="marketing-button light" href="/today">Open the product</Link>
        </section>
      </main>
    </PublicShell>
  );
}
