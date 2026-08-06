// India Standard Time is the only timezone this product reasons in.
//
// Every user is filing against IST deadlines, so "today" must be the Indian
// calendar date. Three call sites previously derived it from UTC
// (`new Date().toISOString().slice(0,10)` and `Date.UTC(...)`), which is a day
// behind between 00:00 and 05:30 IST. That window matters: it fed the
// assistant's "law as in force on" anchor, every relative date the computation
// planner resolved into calculator arguments, and the notice reply countdown
// that tells a professional whether a deadline has passed.

const IST_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in IST as `YYYY-MM-DD`. */
export function todayInIST(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, so no reassembly is needed.
  return IST_PARTS.format(now);
}

/** Midnight IST on the given ISO date, as an absolute instant. */
export function istDateToInstant(isoDate: string): Date {
  // +05:30 is fixed: India has no daylight saving.
  return new Date(`${isoDate}T00:00:00+05:30`);
}

/**
 * Whole days from today (IST) to an ISO date. Negative means it has passed.
 *
 * Both sides are snapped to IST midnight first, so the answer is a count of
 * calendar days rather than a rounded elapsed duration.
 */
export function daysFromTodayIST(isoDate: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const target = istDateToInstant(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = istDateToInstant(todayInIST(now));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
