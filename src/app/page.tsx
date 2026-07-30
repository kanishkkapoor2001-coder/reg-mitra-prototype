import Link from "next/link";
import { MarketingImpactPreview } from "@/components/marketing-impact-preview";
import { MarketingWorkflow } from "@/components/marketing-workflow";
import { PublicShell } from "@/components/public-shell";

export default function HomePage() {
  return (
    <PublicShell>
      <main>
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <p className="marketing-kicker">Source-grounded regulatory research for Indian CA firms</p>
            <h1>Turn regulatory updates into review-ready client work.</h1>
            <p className="marketing-lede">
              Bring the official source, recorded client facts, and the next draft into one
              workspace. Reg Mitra helps your team check what may apply and prepare a brief,
              checklist, or calendar update for professional review.
            </p>
            <div className="marketing-actions">
              <Link className="marketing-button primary" href="/demo">Open the live demo</Link>
              <Link className="marketing-button quiet" href="/today">Open the product</Link>
            </div>
            <p className="marketing-proof">Selected official sources · Evidence gaps shown · Nothing sent or filed</p>
          </div>

          <MarketingImpactPreview />
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
            <Link className="marketing-text-link" href="/demo">Open the live demo →</Link>
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
