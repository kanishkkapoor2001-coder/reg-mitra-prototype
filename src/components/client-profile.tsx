import {
  type AttributeDefinition,
  type CompanyFact,
  definitionsByGroup,
  isStale,
} from "@/lib/radar/facts";

// The company profile a client is matched on. Every question carries the
// reason it is asked, because a CA should never have to guess why a field
// exists — and an unanswered field is shown as unanswered rather than
// defaulted, since the matcher treats a missing fact as `unknown`.

function displayValue(fact: CompanyFact, definition: AttributeDefinition): string {
  const { value } = fact;
  if (value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (definition.valueType === "number" && typeof value === "number") {
    if (definition.key === "company.annual_turnover_inr") {
      return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
    }
    return new Intl.NumberFormat("en-IN").format(value);
  }
  return String(value).replaceAll("_", " ").toLowerCase();
}

function fieldFor(definition: AttributeDefinition, fact: CompanyFact | undefined) {
  const name = definition.key;
  const current = fact?.value;

  if (definition.valueType === "boolean") {
    const value = typeof current === "boolean" ? String(current) : "";
    return (
      <select className="profile-input" name={name} defaultValue={value}>
        <option value="">Not answered</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (definition.allowedValues) {
    return (
      <select className="profile-input" name={name} defaultValue={typeof current === "string" ? current : ""}>
        <option value="">Not answered</option>
        {definition.allowedValues.map((allowed) => (
          <option key={allowed} value={allowed}>
            {allowed.replaceAll("_", " ").toLowerCase()}
          </option>
        ))}
      </select>
    );
  }

  if (definition.valueType === "number") {
    return (
      <input
        className="profile-input"
        type="number"
        name={name}
        inputMode="numeric"
        min="0"
        placeholder="Not answered"
        defaultValue={typeof current === "number" ? String(current) : ""}
      />
    );
  }

  if (definition.valueType === "string_list") {
    return (
      <input
        className="profile-input"
        type="text"
        name={name}
        placeholder="Comma separated, e.g. NBFC, AUTHORISED_DEALER"
        defaultValue={Array.isArray(current) ? current.join(", ") : ""}
      />
    );
  }

  return (
    <input
      className="profile-input"
      type="text"
      name={name}
      placeholder="Not answered"
      defaultValue={typeof current === "string" ? current : ""}
    />
  );
}

export function ClientProfile({
  clientId,
  facts,
  editable,
  saved,
}: Readonly<{
  clientId: string;
  facts: ReadonlyMap<string, CompanyFact>;
  editable: boolean;
  saved?: boolean;
}>) {
  const groups = definitionsByGroup();
  const total = groups.reduce((count, group) => count + group.definitions.length, 0);
  const answered = groups.reduce(
    (count, group) => count + group.definitions.filter((d) => facts.has(d.key)).length,
    0,
  );
  const staleKeys = [...facts.values()].filter((fact) => isStale(fact)).map((fact) => fact.key);

  return (
    <section className="panel" id="profile">
      <div className="panel-header">
        <div>
          <h2>Company profile</h2>
          <p>
            The facts Reg Mitra matches new circulars against. Nothing is assumed — an unanswered
            question means a rule that depends on it stays undecided.
          </p>
        </div>
        <span className={`profile-progress${answered === total ? " is-complete" : ""}`}>
          {answered} of {total} answered
        </span>
      </div>

      {saved ? (
        <p className="profile-saved" role="status">Profile saved. Matching will use the updated facts.</p>
      ) : null}

      {staleKeys.length ? (
        <div className="notice">
          <strong>{staleKeys.length === 1 ? "One fact is out of date." : `${staleKeys.length} facts are out of date.`}</strong>
          They are no longer used for matching until re-confirmed.
        </div>
      ) : null}

      <form action="/api/clients/facts" method="post" className="profile-form">
        <input type="hidden" name="clientId" value={clientId} />
        {groups.map((group) => (
          <fieldset className="profile-group" key={group.group}>
            <legend>{group.title}</legend>
            {group.definitions.map((definition) => {
              const fact = facts.get(definition.key);
              const stale = fact ? isStale(fact) : false;
              return (
                <div className="profile-field" key={definition.key}>
                  <label className="profile-label" htmlFor={definition.key}>
                    {definition.label}
                    {fact?.source === "derived" ? (
                      <span className="profile-tag" title={fact.derivedFrom ?? "Derived"}>auto</span>
                    ) : null}
                    {stale ? <span className="profile-tag is-stale">out of date</span> : null}
                  </label>
                  <p className="profile-question">{definition.question}</p>
                  {editable ? (
                    fieldFor(definition, fact)
                  ) : (
                    <p className="profile-readonly">{fact ? displayValue(fact, definition) : "—"}</p>
                  )}
                  <p className="profile-why">{definition.why}</p>
                </div>
              );
            })}
          </fieldset>
        ))}

        {editable ? (
          <div className="profile-actions">
            <button className="button primary" type="submit">Save profile</button>
            <span className="profile-hint">
              Saved answers supersede earlier ones; nothing is deleted.
            </span>
          </div>
        ) : null}
      </form>
    </section>
  );
}
