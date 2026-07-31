"use client";

import { useEffect, useMemo, useState } from "react";

interface AccountRecord {
  id: string;
  system: "tally" | "gst" | "income_tax" | "mca";
  status: string;
  display_name: string;
  last_checked_at: string | null;
  last_succeeded_at: string | null;
  last_error_code: string | null;
  connector_version: string | null;
}

interface ConnectorControlCenterProps {
  productMode: boolean;
}

const portalConnectors = [
  {
    system: "gst" as const,
    initials: "GS",
    name: "GST",
    route: "Approved GSP/API",
    scope: "Return status, ARN and ledger read-back",
    note: "Requires taxpayer consent and an approved production API relationship.",
  },
  {
    system: "income_tax" as const,
    initials: "IT",
    name: "Income Tax",
    route: "Registered ERI API",
    scope: "TDS and return status for consented clients",
    note: "Production activation requires ERI approval and client consent.",
  },
  {
    system: "mca" as const,
    initials: "MC",
    name: "MCA",
    route: "User-initiated browser bridge",
    scope: "Director KYC and transaction-status read-back",
    note: "The bridge recognises MCA, but its parser stays disabled until formally verified.",
  },
] as const;

function relativeCheck(value: string | null) {
  if (!value) return "Never checked";
  const time = new Date(value);
  if (!Number.isFinite(time.getTime())) return "Check time unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(time);
}

export function ConnectorControlCenter({ productMode }: ConnectorControlCenterProps) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [pairingToken, setPairingToken] = useState("");
  const [tallyState, setTallyState] = useState<"idle" | "checking" | "healthy" | "error">("idle");
  const [tallyMessage, setTallyMessage] = useState(
    "Run the local companion on the same computer as TallyPrime.",
  );

  useEffect(() => {
    if (!productMode) return;
    let active = true;
    fetch("/api/connectors", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { accounts?: AccountRecord[] }) => {
        if (active) setAccounts(payload.accounts ?? []);
      })
      .catch(() => {
        if (active) setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, [productMode]);

  const accountsBySystem = useMemo(
    () => new Map(accounts.map((account) => [account.system, account])),
    [accounts],
  );

  async function checkTally() {
    if (!pairingToken.trim()) {
      setTallyState("error");
      setTallyMessage("Enter the pairing token shown by the local companion.");
      return;
    }
    setTallyState("checking");
    setTallyMessage("Checking the local companion and TallyPrime…");

    try {
      const response = await fetch("http://127.0.0.1:47831/v1/tally/status", {
        method: "POST",
        headers: { Authorization: `Bearer ${pairingToken.trim()}` },
        signal: AbortSignal.timeout(7_000),
      });
      const result = await response.json() as {
        available?: boolean;
        companyCount?: number;
        connectorVersion?: string;
        error?: string;
      };
      if (!response.ok || !result.available) throw new Error(result.error ?? "tally_unavailable");

      setTallyState("healthy");
      setTallyMessage(
        `TallyPrime responded in read-only mode. ${result.companyCount ?? 0} loaded ${result.companyCount === 1 ? "company" : "companies"} detected.`,
      );

      if (productMode) {
        const saved = await fetch("/api/connectors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: "tally",
            mode: "local_companion",
            status: "healthy",
            displayName: "TallyPrime on this computer",
            companyCount: result.companyCount ?? 0,
            connectorVersion: result.connectorVersion,
          }),
        });
        if (saved.ok) {
          const payload = await saved.json() as { account?: AccountRecord };
          if (payload.account) {
            setAccounts((current) => [
              ...current.filter((account) => account.system !== "tally"),
              payload.account as AccountRecord,
            ]);
          }
        }
      }
      setPairingToken("");
    } catch {
      setTallyState("error");
      setTallyMessage(
        "Tally could not be reached. Start the companion, enable Tally’s HTTP server, and keep a company open.",
      );
    }
  }

  const tallyAccount = accountsBySystem.get("tally");

  return (
    <section className="connector-center" aria-labelledby="connector-center-title">
      <div className="connector-center-heading">
        <div>
          <p className="eyebrow">Connected systems</p>
          <h2 id="connector-center-title">Evidence from where the work happens</h2>
          <p>
            Read status first. Prepare inside Reg Mitra. Treat an action as submitted
            only when the source returns a receipt.
          </p>
        </div>
        <span className="connector-foundation-state">
          <i aria-hidden="true" />
          Safe foundation active
        </span>
      </div>

      <article className="connector-primary-card">
        <div className="connector-system-identity">
          <span>TA</span>
          <div>
            <p className="eyebrow">Available for private pilot</p>
            <h3>TallyPrime · read-only local connection</h3>
            <p>Checks the official local HTTP interface. Nothing is imported or changed.</p>
          </div>
        </div>
        <div className="connector-health-line">
          <span className={`connector-health-dot ${tallyAccount || tallyState === "healthy" ? "healthy" : tallyState === "error" ? "error" : ""}`} />
          <div>
            <strong>{tallyAccount ? "Connected" : tallyState === "healthy" ? "Connected locally" : "Not connected"}</strong>
            <small>{tallyAccount ? `Last checked ${relativeCheck(tallyAccount.last_checked_at)}` : tallyMessage}</small>
          </div>
        </div>
        <div className="connector-pairing">
          <label htmlFor="tally-pairing-token">Local pairing token</label>
          <div>
            <input
              autoComplete="off"
              id="tally-pairing-token"
              onChange={(event) => setPairingToken(event.target.value)}
              placeholder="Paste the token shown by the companion"
              type="password"
              value={pairingToken}
            />
            <button
              className="button primary"
              disabled={tallyState === "checking"}
              onClick={checkTally}
              type="button"
            >
              {tallyState === "checking" ? "Checking…" : "Check Tally"}
            </button>
          </div>
          <small>The pairing token stays in this browser session and is never uploaded.</small>
        </div>
        <ol className="connector-setup-steps">
          <li><span>1</span><p><strong>Run the companion</strong><small>On the computer where TallyPrime is open.</small></p></li>
          <li><span>2</span><p><strong>Enable HTTP in Tally</strong><small>Tally documents port 9000 as the normal local endpoint.</small></p></li>
          <li><span>3</span><p><strong>Pair and check</strong><small>Reg Mitra records connection health, not the pairing secret.</small></p></li>
        </ol>
      </article>

      <div className="connector-portal-grid">
        {portalConnectors.map((connector) => {
          const account = accountsBySystem.get(connector.system);
          return (
            <article className="connector-portal-card" key={connector.system}>
              <div className="connector-portal-head">
                <span>{connector.initials}</span>
                <span className={`truth-status ${account?.status === "healthy" ? "verified" : "manual"}`}>
                  {account?.status === "healthy" ? "Connected" : "Activation gated"}
                </span>
              </div>
              <h3>{connector.name}</h3>
              <p>{connector.scope}</p>
              <dl>
                <div><dt>Safe route</dt><dd>{connector.route}</dd></div>
                <div><dt>Last confirmed</dt><dd>{relativeCheck(account?.last_succeeded_at ?? null)}</dd></div>
              </dl>
              <small>{connector.note}</small>
              <button className="button" disabled type="button">Awaiting verified adapter</button>
            </article>
          );
        })}
      </div>

      <div className="connector-truth-rule">
        <div>
          <p className="eyebrow">Execution truth</p>
          <h3>Prepared ≠ submitted ≠ confirmed complete</h3>
        </div>
        <ol aria-label="Action truth progression">
          <li><span>1</span><strong>Prepared</strong><small>Workspace artifact</small></li>
          <li><i aria-hidden="true" /></li>
          <li><span>2</span><strong>Submitted</strong><small>Receipt required</small></li>
          <li><i aria-hidden="true" /></li>
          <li><span>3</span><strong>Confirmed</strong><small>Source read-back</small></li>
        </ol>
      </div>

      <div className="connector-security-boundary">
        <strong>Local security boundary</strong>
        <p>
          Passwords, OTPs, CAPTCHAs, form fields and raw portal pages are excluded.
          Portal checks run only after the user acts, and unsupported adapters fail closed.
        </p>
      </div>
    </section>
  );
}
