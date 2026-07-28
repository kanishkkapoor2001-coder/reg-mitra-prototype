import Link from "next/link";
import { CalendarIcon, SparklesIcon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";

export default function CalendarPage() {
  return (
    <>
      <PageHeading
        eyebrow="Obligations"
        title="Compliance calendar"
        description="Plan statutory and client-specific deadlines with accountable owners and source verification."
        actions={<Link className="button primary" href="/assistant?prompt=Prepare%20a%20review%20checklist%20for%20the%20next%20filing"><SparklesIcon /> Prepare checklist</Link>}
      />
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><CalendarIcon /></div>
          <h2>No verified deadlines yet</h2>
          <p>Demo dates are intentionally excluded from an operational calendar. Connect a trusted source before importing or managing deadlines.</p>
          <Link className="button" href="/settings">Review source setup</Link>
        </div>
      </section>
    </>
  );
}
