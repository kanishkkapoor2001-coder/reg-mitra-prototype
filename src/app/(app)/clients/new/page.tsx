import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

const errors: Record<string, string> = {
  invalid_client: "Enter the legal name and the name your team uses.",
  unavailable: "The client could not be created. Check your access and try again.",
  limit_reached: "You have used every client company on your plan. Archive one, or move to Ultra for unlimited clients.",
};

export default async function NewClientPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;

  return (
    <>
      <PageHeading
        eyebrow="Client portfolio"
        title="Add a client"
        description="Begin with the minimum profile. Applicability and identifiers are recorded separately with their own evidence."
      />
      <form className="record-form" action="/api/clients" method="post">
        <div className="record-form-field">
          <label htmlFor="legal-name">Legal name</label>
          <input id="legal-name" name="legalName" required type="text" />
          <small>Use the registered entity or individual name.</small>
        </div>
        <div className="record-form-field">
          <label htmlFor="display-name">Display name</label>
          <input id="display-name" name="displayName" required type="text" />
          <small>The short name your team will recognize.</small>
        </div>
        <div className="record-form-field">
          <label htmlFor="sector">Sector</label>
          <input id="sector" name="sector" type="text" />
        </div>
        <div className="record-form-field">
          <label htmlFor="state-code">State or jurisdiction code</label>
          <input id="state-code" maxLength={12} name="stateCode" type="text" />
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="button-row">
          <button className="button primary" type="submit">Create client</button>
          <Link className="button" href="/clients">Cancel</Link>
        </div>
      </form>
    </>
  );
}
