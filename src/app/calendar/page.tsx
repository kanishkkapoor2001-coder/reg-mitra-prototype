import Link from "next/link";
import { ComplianceCalendar } from "@/components/compliance-calendar";
import { SparklesIcon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";

export default function CalendarPage() {
  return (
    <>
      <PageHeading
        eyebrow="Official-source calendar"
        title="Compliance calendar"
        description="Recurring national obligations with applicability notes and direct links to the authority behind each date."
        actions={<Link className="button primary" href="/assistant?prompt=Help%20me%20review%20which%20upcoming%20compliances%20apply%20to%20a%20client"><SparklesIcon /> Check applicability</Link>}
      />
      <div className="calendar-source-notice">
        <span>Source-aware, not client-specific</span>
        These dates are verified general rules. A date becomes a client obligation only after checking registration, filing cycle, facts, and current notifications.
      </div>
      <ComplianceCalendar />
    </>
  );
}
