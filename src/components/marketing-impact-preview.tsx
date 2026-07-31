export function MarketingImpactPreview() {
  return (
    <figure
      className="impact-preview"
      aria-labelledby="impact-preview-title"
      aria-describedby="impact-preview-caption"
    >
      <div className="impact-preview-bar">
        <strong id="impact-preview-title">Client impact review</strong>
        <span>Sample workflow</span>
      </div>

      <div className="impact-preview-body">
        <section className="impact-source" aria-label="Official source">
          <div className="impact-section-label">
            <span>01</span>
            <p>Official source</p>
          </div>
          <div className="impact-authority">
            <span aria-hidden="true">F</span>
            <div>
              <strong>FSSAI</strong>
              <small>Official Gazette</small>
            </div>
          </div>
          <h3>Production and storage record requirements updated</h3>
          <p className="impact-source-meta">Full text indexed · June 2026</p>
          <div className="impact-scope" aria-label="Update scope">
            <span>Production records</span>
            <span>Raw materials</span>
            <span>FIFO / FEFO</span>
          </div>
        </section>

        <section className="impact-client" aria-label="Client applicability review">
          <div className="impact-section-label">
            <span>02</span>
            <p>Applicability review</p>
          </div>
          <p className="impact-match-summary">1 sample client needs review</p>
          <div className="impact-client-heading">
            <span className="impact-client-mark" aria-hidden="true">RS</span>
            <div>
              <h3>Royal Spice Kitchen Pvt. Ltd.</h3>
              <p>Food &amp; Beverage · New Delhi</p>
            </div>
            <span className="impact-review-state">Needs review</span>
          </div>
          <dl className="impact-signals">
            <div>
              <dt>Recorded signal</dt>
              <dd><i className="signal-mark positive" aria-hidden="true" />FSSAI registration recorded</dd>
            </div>
            <div>
              <dt>Missing fact</dt>
              <dd><i className="signal-mark review" aria-hidden="true" />Manufacturing activity unknown</dd>
            </div>
          </dl>
          <div className="impact-question">
            <span>Confirm before applying</span>
            <strong>Licence category and manufacturing activity</strong>
          </div>
        </section>
      </div>

      <div className="impact-next-step">
        <div>
          <span>03 · Proposed next step</span>
          <strong>Draft client information request</strong>
        </div>
        <span className="impact-not-sent">Not sent</span>
      </div>

      <figcaption id="impact-preview-caption">
        Official source linked <i aria-hidden="true">·</i> Client applicability not approved
      </figcaption>
    </figure>
  );
}
