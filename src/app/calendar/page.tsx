import { cookies } from "next/headers";
import Link from "next/link";
import { ComplianceCalendar } from "@/components/compliance-calendar";
import { SparklesIcon } from "@/components/icons";
import { PageHeading } from "@/components/page-heading";
import { getLiveCalendarSnapshot } from "@/lib/live-calendar";

export default async function CalendarPage() {
  const session = (await cookies()).get("reg_mitra_session")?.value;
  const mode = session === "demo" ? "demo" : "product";
  const now = new Date();
  const initialSnapshot = mode === "product"
    ? await getLiveCalendarSnapshot(now.getFullYear(), now.getMonth())
    : null;

  return (
    <>
      <PageHeading
        eyebrow={mode === "demo" ? "Static template calendar" : "Daily official-source calendar"}
        title={mode === "demo" ? "Sample compliance calendar" : "Live compliance calendar"}
        description={mode === "demo"
          ? "A fixed sample of recurring obligations. It does not refresh or represent a live client workspace."
          : "Recurring obligations and regulatory effective dates, recalculated and source-checked every day."}
        actions={<Link className="button primary" href="/assistant?prompt=Help%20me%20review%20which%20upcoming%20compliances%20apply%20to%20a%20client"><SparklesIcon /> Check applicability</Link>}
      />
      <ComplianceCalendar initialSnapshot={initialSnapshot} mode={mode} />
    </>
  );
}
