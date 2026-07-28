import { PageHeading } from "@/components/page-heading";

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
      <div className="settings-list">
        {integrations.map(([icon, title, description]) => (
          <article className="settings-row" key={title}>
            <span className="settings-icon">{icon}</span>
            <div className="settings-copy"><h2>{title}</h2><p>{description}</p></div>
            <span className="status-pill">Not connected</span>
            <button className="button" type="button">Configure</button>
          </article>
        ))}
      </div>
    </>
  );
}
