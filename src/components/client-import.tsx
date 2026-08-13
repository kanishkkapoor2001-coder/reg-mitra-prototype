"use client";

import Link from "next/link";
import { useState } from "react";
import { applyMapping, parseCsv, type ColumnMapping } from "@/lib/clients/csv";
import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition } from "@/lib/radar/facts";

// Import a client book from a spreadsheet.
//
// Three steps, and the middle one is the point: the file is read in the browser,
// a model works out what the columns mean, and the CA sees that mapping and a
// preview of real rows before anything is written. Column mapping is a guess;
// creating fifty clients from a guess is not something to do silently.

const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;

function targetLabel(target: string): string {
  if (target === "legal_name") return "Legal name";
  if (target === "display_name") return "Display name";
  if (target === "ignore") return "— not imported";
  return DEFINITIONS.find((d) => d.key === target)?.label ?? target;
}

const TARGET_OPTIONS = [
  { value: "ignore", label: "— not imported" },
  { value: "legal_name", label: "Legal name" },
  { value: "display_name", label: "Display name" },
  ...DEFINITIONS.map((d) => ({ value: d.key, label: d.label })),
];

type Report = { created: number; factsWritten: number; skipped: { name: string; reason: string }[] };

export function ClientImport() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [busy, setBusy] = useState<null | "reading" | "importing">(null);
  const [message, setMessage] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function onFile(file: File) {
    setBusy("reading");
    setMessage(null);
    setReport(null);
    try {
      const table = parseCsv(await file.text());
      if (table.length < 2) {
        setMessage("That file has a header row but no clients under it.");
        setHeaders([]); setRows([]);
        return;
      }
      const head = table[0] ?? [];
      const body = table.slice(1);
      setHeaders(head);
      setRows(body);

      const res = await fetch("/api/clients/import/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers: head, samples: body.slice(0, 2) }),
      });
      const payload = await res.json();
      if (!res.ok) {
        // Falls back to a manual mapping rather than refusing the file.
        setMapping(Object.fromEntries(head.map((h) => [h, "ignore"])));
        setMessage("Could not read the columns automatically — set them yourself below.");
        return;
      }
      setMapping(payload.mapping ?? {});
    } catch {
      setMessage("Could not read that file. It needs to be a CSV.");
    } finally {
      setBusy(null);
    }
  }

  async function runImport() {
    setBusy("importing");
    setMessage(null);
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, rows, mapping }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload?.error === "no_workspace"
          ? "This account cannot add clients to the workspace."
          : "The import did not run. Nothing was created.");
        return;
      }
      setReport(payload as Report);
    } catch {
      setMessage("The import did not finish. Check the client list before retrying.");
    } finally {
      setBusy(null);
    }
  }

  const preview = rows.slice(0, 5).map((cells) => applyMapping(headers, cells, mapping));
  const mappedCount = Object.values(mapping).filter((t) => t !== "ignore").length;

  if (report) {
    return (
      <section className="import-report">
        <p className="import-report-headline">
          Created {report.created} {report.created === 1 ? "client" : "clients"}
          {report.factsWritten ? ` with ${report.factsWritten} recorded facts` : ""}.
        </p>
        {report.skipped.length ? (
          <>
            <p className="import-report-sub">{report.skipped.length} row(s) were not imported:</p>
            <ul className="import-skipped">
              {report.skipped.slice(0, 12).map((entry, index) => (
                <li key={`${entry.name}-${index}`}><strong>{entry.name || "(blank)"}</strong><span>{entry.reason}</span></li>
              ))}
            </ul>
          </>
        ) : null}
        <Link className="button primary" href="/clients">See the client list</Link>
      </section>
    );
  }

  return (
    <section className="import-panel">
      <label className="import-drop" htmlFor="client-csv">
        <strong>Choose a CSV file</strong>
        <span>
          Export from Tally, Zoho or Excel with “Save as CSV”. Any column layout — the columns are
          read for you and shown before anything is created.
        </span>
        <input
          id="client-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </label>

      {busy === "reading" ? <p className="describe-message">Reading the columns…</p> : null}
      {message ? <p className="form-error" role="alert">{message}</p> : null}

      {headers.length ? (
        <>
          <div className="import-mapping">
            <p className="import-section-title">
              {rows.length} row(s) · {mappedCount} column(s) mapped — change anything that looks wrong
            </p>
            <ul>
              {headers.map((header) => (
                <li key={header}>
                  <span className="import-header-name" title={header}>{header}</span>
                  <select
                    aria-label={`What is "${header}"?`}
                    value={mapping[header] ?? "ignore"}
                    onChange={(event) => setMapping({ ...mapping, [header]: event.target.value })}
                  >
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>

          <div className="import-preview">
            <p className="import-section-title">First {preview.length} of {rows.length}</p>
            {preview.map((row, index) => (
              <div className="import-preview-row" key={index}>
                <strong>{row.displayName || <em>no name — will be skipped</em>}</strong>
                <span>
                  {Object.keys(row.facts).length
                    ? `${Object.keys(row.facts).length} facts: ${Object.keys(row.facts).map((k) => targetLabel(k)).join(", ")}`
                    : "no facts — the radar will have nothing to match on"}
                </span>
                {row.skipped.length ? <small>Not used: {row.skipped.join(" · ")}</small> : null}
              </div>
            ))}
          </div>

          <button className="button primary" type="button" onClick={runImport} disabled={busy !== null}>
            {busy === "importing" ? "Creating clients…" : `Import ${rows.length} client(s)`}
          </button>
        </>
      ) : null}
    </section>
  );
}
