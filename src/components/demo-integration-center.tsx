"use client";

import Link from "next/link";
import { useState } from "react";

type ActionState = "verified" | "pending" | "prepared" | "manual";

const systems = [
  {
    initials: "TA",
    name: "TallyPrime",
    coverage: "Ledgers, vouchers, invoices",
    detail: "Books through 28 Jul",
  },
  {
    initials: "GS",
    name: "GST Portal",
    coverage: "Returns, ledgers, notices",
    detail: "GSTIN ending 1ZA",
  },
  {
    initials: "IT",
    name: "Income Tax",
    coverage: "TDS returns and challans",
    detail: "TAN ending 1234A",
  },
  {
    initials: "MC",
    name: "MCA",
    coverage: "Company and director filings",
    detail: "CIN ending 123456",
  },
] as const;

const actions: ReadonlyArray<{
  title: string;
  source: string;
  state: ActionState;
  label: string;
  description: string;
  evidence: string;
}> = [
  {
    title: "Director KYC",
    source: "MCA",
    state: "verified",
    label: "Verified complete",
    description: "The source system reports the filing as completed.",
    evidence: "MCA read-back · SRN ending 4821 · illustrative",
  },
  {
    title: "TDS return · Form 26Q",
    source: "Income Tax",
    state: "pending",
    label: "Pending at source",
    description: "Working papers exist, but the connected source does not show a filed return.",
    evidence: "Income Tax read-back · Q1 FY 2026–27 · illustrative",
  },
  {
    title: "GSTR-3B · June",
    source: "GST Portal",
    state: "prepared",
    label: "Prepared only",
    description: "A draft is ready. Reg Mitra has not submitted anything to the GST Portal.",
    evidence: "Workspace draft v3 · no filing receipt",
  },
  {
    title: "MSME payment review",
    source: "TallyPrime",
    state: "manual",
    label: "Needs confirmation",
    description: "Books show possible delays, but supplier classification still needs client confirmation.",
    evidence: "Tally invoice and payment dates · supplier status missing",
  },
] as const;

const stateIcon: Record<ActionState, string> = {
  verified: "✓",
  pending: "!",
  prepared: "↗",
  manual: "?",
};

export function DemoIntegrationCenter() {
  const [isChecking, setIsChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState("10:42 AM");
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  function checkSystems() {
    setIsChecking(true);
    window.setTimeout(() => {
      setCheckedAt(new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date()));
      setIsChecking(false);
    }, 900);
  }

  return (
    <section className="integration-center" aria-labelledby="integration-center-title">
      <div className="integration-center-header">
        <div>
          <p className="eyebrow">Connected systems · interactive demo</p>
          <h2 id="integration-center-title">What is actually done?</h2>
          <p>
            Reg Mitra checks the systems where the work happens, then separates a prepared
            draft from a submitted action and a source-verified result.
          </p>
        </div>
        <button className="button primary" disabled={isChecking} onClick={checkSystems} type="button">
          {isChecking ? "Checking systems…" : "Check connected systems"}
        </button>
      </div>

      <div className="demo-connection-notice">
        <span aria-hidden="true">i</span>
        <p>
          <strong>No real account is connected.</strong> These are illustrative connection
          states and results; no portal action will be taken.
        </p>
      </div>

      <div className="connected-system-grid" aria-label="Illustrative connected systems">
        {systems.map((system) => (
          <article className="connected-system-card" key={system.name}>
            <span className="connected-system-icon">{system.initials}</span>
            <div>
              <h3>{system.name}</h3>
              <p>{system.coverage}</p>
              <small>{system.detail}</small>
            </div>
            <span className="connection-state">
              <i aria-hidden="true" />
              Demo connected
            </span>
          </article>
        ))}
      </div>

      <div className="action-truth-header">
        <div>
          <p className="eyebrow">Action truth</p>
          <h3>One status, backed by its source</h3>
        </div>
        <p aria-live="polite">
          {isChecking ? "Checking illustrative source systems…" : `Illustrative check completed at ${checkedAt}`}
        </p>
      </div>

      <div className="action-truth-list">
        {actions.map((action) => {
          const isExpanded = expandedAction === action.title;
          return (
            <article className="action-truth-row" key={action.title}>
              <span className={`action-state-mark ${action.state}`} aria-hidden="true">
                {stateIcon[action.state]}
              </span>
              <div className="action-truth-copy">
                <div>
                  <h4>{action.title}</h4>
                  <span>{action.source}</span>
                </div>
                <p>{action.description}</p>
                {isExpanded ? <small className="action-evidence">{action.evidence}</small> : null}
              </div>
              <span className={`truth-status ${action.state}`}>{action.label}</span>
              <button
                aria-expanded={isExpanded}
                className="text-link action-evidence-button"
                onClick={() => setExpandedAction(isExpanded ? null : action.title)}
                type="button"
              >
                {isExpanded ? "Hide evidence" : "See evidence"}
              </button>
            </article>
          );
        })}
      </div>

      <footer className="action-truth-footer">
        <p>
          <strong>Truth rule:</strong> preparing work never marks it submitted. “Verified
          complete” requires a receipt or a read-back from the connected source.
        </p>
        <Link className="text-link" href="/settings">See connector plan →</Link>
      </footer>
    </section>
  );
}
