import Link from "next/link";
import { ClientChat } from "@/components/client-chat";
import { ClientImport } from "@/components/client-import";
import { PageHeading } from "@/components/page-heading";
import { ATTRIBUTE_DEFINITIONS, type AttributeDefinition } from "@/lib/radar/facts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add a client" };

const errors: Record<string, string> = {
  invalid_client: "Enter the legal name and the name your team uses.",
  unavailable: "The client could not be created. Check your access and try again.",
  limit_reached: "You have used every client company on your plan. Archive one, or move to Ultra for unlimited clients.",
};

type Mode = "chat" | "import" | "manual";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "chat", label: "Talk it through", hint: "Answer a few questions" },
  { id: "import", label: "Import a spreadsheet", hint: "Tally, Zoho or Excel" },
  { id: "manual", label: "Fill it in myself", hint: "Every field, by hand" },
];

const DEFINITIONS: readonly AttributeDefinition[] = ATTRIBUTE_DEFINITIONS;

const GROUP_LABEL: Record<string, string> = {
  identity: "Identity",
  scale: "Size",
  activity: "What it does",
  registrations: "Registrations",
};

/** One control per attribute, typed from the registry rather than hand-written. */
function FactField({ definition }: { definition: AttributeDefinition }) {
  const id = `fact-${definition.key.replace(/\./g, "-")}`;
  const name = `fact:${definition.key}`;

  return (
    <div className="record-form-field">
      <label htmlFor={id}>{definition.label}</label>
      {definition.allowedValues ? (
        <select id={id} name={name} defaultValue="">
          <option value="">Not recorded</option>
          {definition.allowedValues.map((value) => (
            <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase()}</option>
          ))}
        </select>
      ) : definition.valueType === "boolean" ? (
        <select id={id} name={name} defaultValue="">
          <option value="">Not recorded</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={definition.valueType === "number" ? "text" : "text"}
          inputMode={definition.valueType === "number" ? "numeric" : undefined}
          placeholder={definition.valueType === "number" ? "e.g. 40000000" : ""}
        />
      )}
      <small>{definition.why}</small>
    </div>
  );
}

export default async function NewClientPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string; mode?: string }> }>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;
  const mode: Mode = params.mode === "import" || params.mode === "manual" ? params.mode : "chat";

  return (
    <>
      <PageHeading
        eyebrow="Client portfolio"
        title="Add a client"
        description="However suits you. What gets recorded here is what the radar matches circulars against, so the more it knows the more it can decide."
      />

      {/* Links, not tabs: each way is a real page state, so a half-finished
          conversation is not thrown away by a stray click, and a CA can land
          straight on the one they want. */}
      <nav className="mode-switch" aria-label="How to add this client">
        {MODES.map((option) => (
          <Link
            key={option.id}
            href={`/clients/new?mode=${option.id}`}
            className={`mode-option ${mode === option.id ? "active" : ""}`}
            aria-current={mode === option.id ? "page" : undefined}
          >
            <strong>{option.label}</strong>
            <small>{option.hint}</small>
          </Link>
        ))}
      </nav>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {mode === "chat" ? <ClientChat /> : null}
      {mode === "import" ? <ClientImport /> : null}

      {mode === "manual" ? (
        <form className="record-form manual-form" action="/api/clients" method="post">
          <div className="record-form-field">
            <label htmlFor="legal-name">Legal name</label>
            <input id="legal-name" name="legalName" required type="text" />
            <small>The registered entity or individual name.</small>
          </div>
          <div className="record-form-field">
            <label htmlFor="display-name">Display name</label>
            <input id="display-name" name="displayName" required type="text" />
            <small>The short name your team will recognise.</small>
          </div>

          {/* Every attribute a rule can test, not the four that fit on a card.
              Anything left "Not recorded" stays unknown — the matcher must be
              able to tell "no" from "not told". */}
          {(["identity", "scale", "activity", "registrations"] as const).map((group) => {
            const fields = DEFINITIONS.filter((definition) => definition.group === group);
            if (!fields.length) return null;
            return (
              <fieldset className="manual-group" key={group}>
                <legend>{GROUP_LABEL[group]}</legend>
                <div className="manual-group-fields">
                  {fields.map((definition) => <FactField definition={definition} key={definition.key} />)}
                </div>
              </fieldset>
            );
          })}

          <div className="button-row">
            <button className="button primary" type="submit">Create client</button>
            <Link className="button" href="/clients">Cancel</Link>
          </div>
        </form>
      ) : null}
    </>
  );
}
