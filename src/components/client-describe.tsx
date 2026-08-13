"use client";

import { useState } from "react";
import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition } from "@/lib/radar/facts";

// Describe the client in a sentence; the fields fill themselves in.
//
// The form underneath collects two of the thirteen attributes regulatory rules
// are written against. The other eleven — turnover, GST scheme, entity type —
// decide most applicability, and asking for thirteen typed fields before anyone
// has a client is why they stayed empty and the radar had nothing to reason
// about.
//
// Extraction only ever PROPOSES. Everything lands in a visible field the CA can
// change, and nothing is stored until they submit — facts.ts is explicit that a
// fact is recorded, never guessed, and prose read by a model is a guess until a
// person has looked at it.

const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;
const labelFor = (key: string) => DEFINITIONS.find((d) => d.key === key)?.label ?? key;

function readable(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ").replaceAll("_", " ").toLowerCase();
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value).replaceAll("_", " ");
}

/** Sets a form field the server component rendered, so both paths stay in sync. */
function fill(id: string, value: string) {
  const field = document.getElementById(id) as HTMLInputElement | null;
  if (field && value) field.value = value;
}

export function ClientDescribe() {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState<string | null>(null);

  const extracted = Object.entries(facts);

  async function read() {
    // Checked here rather than by disabling the button: a dead button explains
    // nothing, and this panel already looked broken enough.
    if (description.trim().length < 10) {
      setMessage("Write a line about the client first — what it does and where it is registered.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/clients/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const body = await res.json();

      if (!res.ok) {
        setMessage(
          body?.error === "too_short"
            ? "Add a little more detail — a sentence or two about the client."
            : body?.error === "rate_limited"
              ? "That is a lot of reading at once. Try again in a minute."
              : "Could not read that just now. Fill the fields in by hand.",
        );
        return;
      }

      fill("legal-name", body.legalName ?? "");
      fill("display-name", body.displayName ?? body.legalName ?? "");

      const found = (body.facts ?? {}) as Record<string, unknown>;
      // Sector and state have their own inputs on the form; the rest ride along
      // as recorded facts.
      if (found["company.sector"]) fill("sector", String(found["company.sector"]).replaceAll("_", " "));
      if (found["company.registered_state"]) fill("state-code", String(found["company.registered_state"]));

      setFacts(found);
      setMessage(
        Object.keys(found).length
          ? null
          : "Nothing definite in there. Say what it does, where it is registered, and roughly how big it is.",
      );
    } catch {
      setMessage("Could not read that just now. Fill the fields in by hand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="describe-panel">
      <label htmlFor="client-description">
        Describe the client in a sentence
        <span className="field-optional">or skip this and type the fields yourself</span>
      </label>
      <textarea
        id="client-description"
        name="description"
        rows={3}
        // Prefixed "e.g." and kept short. A full worked example read as text that
        // was already in the box — next to a button greyed out until you type,
        // the whole panel looked filled in and broken rather than empty and
        // waiting.
        placeholder="e.g. Sharma Pharma — pharma manufacturer in Maharashtra, 40 crore turnover, regular GST, deducts TDS"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="describe-actions">
        <button className="button primary" type="button" onClick={read} disabled={busy}>
          {busy ? "Reading…" : "Fill the form from this"}
        </button>
        <small className="describe-message">
          {message ?? "Whatever it finds lands in the fields below for you to check."}
        </small>
      </div>

      {extracted.length ? (
        <div className="describe-found">
          <p className="describe-found-title">
            Found {extracted.length} {extracted.length === 1 ? "detail" : "details"} — check before saving
          </p>
          <ul>
            {extracted.map(([key, value]) => (
              <li key={key}>
                <strong>{labelFor(key)}</strong>
                <span>{readable(value)}</span>
              </li>
            ))}
          </ul>
          <small>
            Saved with the client so the radar can match circulars against it. Anything wrong here can be
            corrected on the client page.
          </small>
        </div>
      ) : null}

      {/* Travels with the form post; the create route validates every key again. */}
      <input name="facts" type="hidden" value={extracted.length ? JSON.stringify(facts) : ""} />
    </section>
  );
}
