// How current the regulatory corpus actually is.
//
// The product used to print "Law as in force on {today}" beside a corpus that
// could be weeks old, with no way for a reader to tell. For a compliance tool
// that is the one claim that must never outrun the data, so freshness is
// computed in one place and shown wherever regulatory content appears.

/** Past this, the corpus is old enough that a reader must be told plainly. */
export const CORPUS_STALE_AFTER_DAYS = 7;
/** Past this, it is not a caveat any more — it is a warning. */
export const CORPUS_VERY_STALE_AFTER_DAYS = 21;

export type FreshnessLevel = "current" | "ageing" | "stale";

export interface CorpusFreshness {
  /** ISO date the corpus was last built. */
  generatedAt: string;
  ageDays: number;
  level: FreshnessLevel;
  /** Reader-facing, e.g. "Official sources last checked 31 Jul 2026 (6 days ago)". */
  label: string;
  /** Set when the reader should not assume the corpus reflects today's law. */
  warning: string | null;
}

/** IST calendar date (YYYY-MM-DD) for an instant. */
function istDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function corpusFreshness(generatedAt: string, now: Date = new Date()): CorpusFreshness {
  const built = new Date(generatedAt);
  // Counted in IST CALENDAR days, not elapsed hours. A corpus built late on
  // 31 July is "6 days ago" on 6 August to any reader; flooring elapsed time
  // would say 5 and understate how old it is.
  const ageDays = Number.isNaN(built.getTime())
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.round(
      (Date.parse(`${istDay(now)}T00:00:00+05:30`) - Date.parse(`${istDay(built)}T00:00:00+05:30`))
      / 86_400_000,
    ));

  const level: FreshnessLevel = ageDays >= CORPUS_VERY_STALE_AFTER_DAYS
    ? "stale"
    : ageDays >= CORPUS_STALE_AFTER_DAYS
      ? "ageing"
      : "current";

  const when = Number.isFinite(ageDays) ? formatIST(generatedAt) : "an unknown date";
  const ago = ageDays === 0 ? "today" : ageDays === 1 ? "yesterday" : `${ageDays} days ago`;

  return {
    generatedAt,
    ageDays,
    level,
    label: `Official sources last checked ${when} (${ago})`,
    warning: level === "current"
      ? null
      : level === "ageing"
        ? "Anything published since then is not in these sources yet — check the official portal for changes in this period."
        : "These sources are significantly out of date. Do not rely on them for the current position without checking the official portal.",
  };
}
