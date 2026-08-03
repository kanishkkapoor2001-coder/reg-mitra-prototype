"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { CheckCircleIcon, CloseIcon, FileIcon } from "@/components/icons";
import {
  clearProfile,
  emptyClient,
  exportProfile,
  getProfileServerSnapshot,
  getProfileSnapshot,
  importProfile,
  saveProfile,
  subscribeToProfile,
} from "@/lib/practice/store";
import {
  ENTITY_LABELS,
  REGULATOR_OPTIONS,
  SECTOR_OPTIONS,
  TURNOVER_LABELS,
  daysSinceConfirmed,
  stateFromGstin,
  type EntityType,
  type PracticeClient,
  type PracticeProfile,
  type TurnoverBand,
} from "@/lib/practice/types";

const STALE_AFTER_DAYS = 180;

function Chips({
  options,
  selected,
  onToggle,
}: Readonly<{ options: readonly string[]; selected: string[]; onToggle: (value: string) => void }>) {
  return (
    <div className="chip-row">
      {options.map((option) => (
        <button
          aria-pressed={selected.includes(option)}
          className={`chip ${selected.includes(option) ? "active" : ""}`}
          key={option}
          onClick={() => onToggle(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ClientEditor({
  client,
  onChange,
  onRemove,
}: Readonly<{
  client: PracticeClient;
  onChange: (next: PracticeClient) => void;
  onRemove: () => void;
}>) {
  const set = <K extends keyof PracticeClient>(key: K, value: PracticeClient[K]) =>
    onChange({ ...client, [key]: value, lastConfirmedAt: new Date().toISOString() });
  const state = stateFromGstin(client.gstin);
  const stale = daysSinceConfirmed(client);
  const isTrust = client.entityType === "trust";

  const tri = (key: "taxAuditApplicable" | "presumptiveTaxation" | "deductsTds" | "twentyPlusEmployees", label: string, hint: string) => (
    <label className="practice-field">
      <span>{label}<small>{hint}</small></span>
      <select
        onChange={(event) => set(key, event.target.value === "" ? null : event.target.value === "yes")}
        value={client[key] === null ? "" : client[key] ? "yes" : "no"}
      >
        <option value="">Not recorded</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );

  return (
    <article className="practice-client">
      <div className="practice-client-head">
        <input
          aria-label="Client name"
          className="practice-client-name"
          onChange={(event) => set("name", event.target.value)}
          placeholder="Client name or code"
          value={client.name}
        />
        {stale !== null && stale > STALE_AFTER_DAYS ? (
          <span className="practice-stale">Confirmed {Math.round(stale / 30)} months ago</span>
        ) : null}
        <button aria-label={`Remove ${client.name || "client"}`} className="practice-remove" onClick={onRemove} type="button">
          <CloseIcon />
        </button>
      </div>

      <div className="practice-field-grid">
        <label className="practice-field">
          <span>GSTIN<small>first 2 digits set the State</small></span>
          <input
            onChange={(event) => set("gstin", event.target.value.toUpperCase() || null)}
            placeholder="27AABCS1234H1ZK"
            value={client.gstin ?? ""}
          />
          {state ? <em className="practice-derived">State: {state}</em> : null}
        </label>

        <label className="practice-field">
          <span>GST registration</span>
          <select
            onChange={(event) => set("gstRegistration", (event.target.value || null) as PracticeClient["gstRegistration"])}
            value={client.gstRegistration ?? ""}
          >
            <option value="">Not recorded</option>
            <option value="regular">Regular</option>
            <option value="composition">Composition</option>
            <option value="unregistered">Unregistered</option>
          </select>
        </label>

        <label className="practice-field">
          <span>GST filing<small>decides the due-date rule</small></span>
          <select
            onChange={(event) => set("gstFrequency", (event.target.value || null) as PracticeClient["gstFrequency"])}
            value={client.gstFrequency ?? ""}
          >
            <option value="">Not recorded</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly (QRMP)</option>
          </select>
        </label>

        <label className="practice-field">
          <span>Entity type</span>
          <select
            onChange={(event) => set("entityType", (event.target.value || null) as EntityType | null)}
            value={client.entityType ?? ""}
          >
            <option value="">Not recorded</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="practice-field">
          <span>Turnover<small>late-fee caps, e-invoicing</small></span>
          <select
            onChange={(event) => set("turnoverBand", (event.target.value || null) as TurnoverBand | null)}
            value={client.turnoverBand ?? ""}
          >
            <option value="">Not recorded</option>
            {Object.entries(TURNOVER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="practice-field">
          <span>Sector<small>which regulator reaches them</small></span>
          <select
            onChange={(event) => set("sector", event.target.value || null)}
            value={client.sector ?? ""}
          >
            <option value="">Not recorded</option>
            {SECTOR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        {tri("taxAuditApplicable", "Tax audit (44AB)", "moves the ITR due date")}
        {tri("presumptiveTaxation", "Presumptive (44AD/44ADA)", "one advance-tax instalment, not four")}
        {tri("deductsTds", "Deducts TDS", "brings s.201(1A) into scope")}
        {tri("twentyPlusEmployees", "20+ employees", "EPFO applicability")}

        {isTrust ? (
          <label className="practice-field practice-field-wide">
            <span>Trust registrations<small>comma separated, e.g. 12A, 80G</small></span>
            <input
              onChange={(event) => set("trustRegistrations", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
              placeholder="12A, 80G"
              value={client.trustRegistrations.join(", ")}
            />
          </label>
        ) : null}
      </div>
    </article>
  );
}

export function PracticeExperience() {
  // localStorage is the source of truth; the component subscribes to it rather
  // than mirroring it into state.
  const profile = useSyncExternalStore(
    subscribeToProfile,
    getProfileSnapshot,
    getProfileServerSnapshot,
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  function update(next: PracticeProfile) {
    saveProfile(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1_600);
  }

  const toggle = (key: "regulators" | "states" | "sectors", value: string) => {
    const current = profile[key];
    update({
      ...profile,
      [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    });
  };

  return (
    <div className="practice-page">
      <header className="practice-hero">
        <div>
          <p className="eyebrow">Your practice</p>
          <h1>Tune answers to how you actually work</h1>
          <p>
            Tell Reg Mitra which regulators, states and clients you deal with, and answers
            stop asking you what you already know — due dates resolve to your State, interest
            uses the right instalment rule, and the regulation feed sorts to what can reach your desk.
          </p>
        </div>
        <div className="practice-privacy">
          <CheckCircleIcon />
          <span>
            <strong>Stays in this browser</strong>
            <small>Never sent to a server or saved to any account. Export it to keep a backup or move devices.</small>
          </span>
        </div>
      </header>

      {saved ? <p className="practice-saved" role="status">Saved</p> : null}
      {error ? <p className="practice-error" role="alert">{error}</p> : null}

      <section className="practice-section">
        <h2>Regulators you deal with</h2>
        <p>Used to sort the regulation feed so the ones that can touch your clients come first.</p>
        <Chips onToggle={(value) => toggle("regulators", value)} options={REGULATOR_OPTIONS} selected={profile.regulators} />
      </section>

      <section className="practice-section">
        <h2>Client sectors</h2>
        <p>A food-business practice needs FSSAI changes; an NBFC practice needs RBI.</p>
        <Chips onToggle={(value) => toggle("sectors", value)} options={SECTOR_OPTIONS} selected={profile.sectors} />
      </section>

      <section className="practice-section">
        <div className="practice-section-head">
          <div>
            <h2>Clients</h2>
            <p>
              Only fields that change an answer. Blank means <strong>unknown</strong> — Reg Mitra will
              ask rather than assume it.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => update({ ...profile, clients: [...profile.clients, emptyClient()] })}
            type="button"
          >
            Add client
          </button>
        </div>

        {profile.clients.length === 0 ? (
          <div className="practice-empty">
            <p><strong>No clients yet.</strong></p>
            <p>
              Add one and you can ask “is this circular relevant for them?” and get an answer
              that uses their State, filing frequency and thresholds.
            </p>
          </div>
        ) : (
          <div className="practice-client-list">
            {profile.clients.map((client, index) => (
              <ClientEditor
                client={client}
                key={client.id}
                onChange={(next) => {
                  const clients = [...profile.clients];
                  clients[index] = next;
                  update({ ...profile, clients });
                }}
                onRemove={() => update({
                  ...profile,
                  clients: profile.clients.filter((entry) => entry.id !== client.id),
                })}
              />
            ))}
          </div>
        )}
      </section>

      <section className="practice-section practice-data">
        <h2>Your data</h2>
        <p>
          Because nothing is stored on a server, this lives only in this browser. Export a backup
          before clearing your browser or moving to another machine.
        </p>
        <div className="practice-data-actions">
          <button className="button" onClick={() => exportProfile(profile)} type="button">
            <FileIcon /> Export backup
          </button>
          <input
            accept="application/json"
            className="visually-hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                update(await importProfile(file));
                setError("");
              } catch {
                setError("That file could not be read as a Reg Mitra backup.");
              }
              if (importRef.current) importRef.current.value = "";
            }}
            ref={importRef}
            type="file"
          />
          <button className="button" onClick={() => importRef.current?.click()} type="button">
            Import backup
          </button>
          <button
            className="button subtle"
            onClick={() => {
              if (!window.confirm("Remove your practice profile and all clients from this browser?")) return;
              clearProfile();
            }}
            type="button"
          >
            Clear everything
          </button>
        </div>
        <p className="practice-footnote">
          Reg Mitra sorts and personalises using these facts — it does not guarantee completeness.
          Always confirm applicability against the source. <Link href="/assistant">Back to the assistant</Link>
        </p>
      </section>
    </div>
  );
}
