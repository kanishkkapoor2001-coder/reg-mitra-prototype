import { PageHeading } from "@/components/page-heading";
import { TrustBadge } from "@/components/trust-badge";

const integrations = [
  ["TA", "Tally", "Ledgers, vouchers, stock items, and reconciliations"],
  ["GS", "GST Portal", "Returns, ledgers, notices, and filing status"],
  ["IT", "Income Tax & TDS", "Statements, challans, defaults, and filing status"],
  ["MC", "MCA", "Company filings, directors, and compliance events"],
  ["CM", "Communications", "Email and approved client delivery channels"],
] as const;

export default function SettingsPage() {
  return (
    <>
      <PageHeading eyebrow="System" title="Settings" description="Manage sources, workspace controls, and review policies." />
      <div className="notice">
        <strong>Connection setup is not available in this local demo.</strong>
        A production version needs encrypted credentials, audit logs, and an approved data-handling policy.
      </div>
      <div className="settings-list">
        {integrations.map(([icon, title, description]) => (
          <article className="settings-row" key={title}>
            <span className="settings-icon">{icon}</span>
            <div className="settings-copy"><h2>{title}</h2><p>{description}</p></div>
            <span className="status-pill">Not connected</span>
            <span className="locked-action">Requires secure connector service</span>
          </article>
        ))}
      </div>
      <section style={{ marginTop: 26 }}>
        <div className="page-heading" style={{ marginBottom: 14 }}>
          <div>
            <p className="eyebrow">Source register</p>
            <h2>Authoritative sources and review policy</h2>
            <p className="page-subtitle">The workspace will show information as verified only after a source and reviewer are recorded.</p>
          </div>
        </div>
        <div className="source-register">
          <article className="source-row">
            <div><strong>Government portals</strong><small>GSTN, MCA, Income Tax, FSSAI, RBI</small></div>
            <p className="source-policy">No portal credentials or data connections have been configured.</p>
            <TrustBadge kind="evidence" state="not-connected" />
          </article>
          <article className="source-row">
            <div><strong>Regulatory documents</strong><small>Circulars, notifications, orders, and rules</small></div>
            <p className="source-policy">No authoritative document has been attached to the current demo claims.</p>
            <TrustBadge kind="evidence" state="unverified" />
          </article>
          <article className="source-row">
            <div><strong>Professional review</strong><small>Named reviewer and version-level approval</small></div>
            <p className="source-policy">Approval is required before sending advice, communicating a position, or taking a filing action.</p>
            <TrustBadge kind="review" state="not-reviewed" />
          </article>
        </div>
      </section>
    </>
  );
}
