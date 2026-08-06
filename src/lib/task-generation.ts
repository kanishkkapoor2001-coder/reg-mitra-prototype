import {
  getComplianceEvents,
  parseLocalDate,
  type ComplianceEvent,
} from "./compliance-calendar.ts";
import type { FactValue } from "./radar/facts.ts";

export interface SeedClient {
  id: string;
  displayName: string;
  sector: string | null;
  stateCode: string | null;
  /** Confirmed facts, used to rule obligations out. Absent = none recorded. */
  facts?: ReadonlyMap<string, FactValue>;
}

export interface CandidateTask {
  clientId: string;
  title: string;
  description: string;
  priority: number; // 0-3, matches tasks.priority
  dueAt: string; // ISO timestamptz
  seedKey: string;
  metadata: Record<string, unknown>;
}

const DEFAULT_HORIZON_DAYS = 30;
const MAX_GENERATED = 400;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function priorityForDaysAway(daysAway: number): number {
  if (daysAway <= 3) return 3; // high
  if (daysAway <= 10) return 2; // medium
  return 1; // low
}

// Statutory obligations that a confirmed fact can rule out for a client.
//
// Note the asymmetry with the regulatory radar. There, an unknown fact means
// "we cannot say this applies" and nothing is claimed. Here, a missed filing
// deadline is far more costly than an extra item to dismiss, so an obligation
// is dropped only on a *confirmed contradiction* — never on a fact we were
// simply never told.
const EXCLUSIONS: Array<{
  matches: (event: ComplianceEvent) => boolean;
  factKey: string;
  /** Excluded when the confirmed fact equals this value. */
  excludeWhen: (value: FactValue) => boolean;
}> = [
  {
    matches: (event) => /goods and services tax/i.test(event.authority),
    factKey: "company.gst_registered",
    excludeWhen: (value) => value === false,
  },
  {
    matches: (event) => /provident fund/i.test(event.authority),
    factKey: "company.employee_count",
    // EPF coverage starts at 20 employees; a confirmed smaller headcount rules
    // the obligation out.
    excludeWhen: (value) => typeof value === "number" && value < 20,
  },
  {
    matches: (event) => /tds|tcs/i.test(event.shortTitle) || /tds|tcs/i.test(event.title),
    factKey: "company.deducts_tds",
    excludeWhen: (value) => value === false,
  },
];

function isApplicable(event: ComplianceEvent, facts?: ReadonlyMap<string, FactValue>): boolean {
  if (event.kind !== "obligation") return false;
  if (!facts) return true;

  for (const exclusion of EXCLUSIONS) {
    if (!exclusion.matches(event)) continue;
    if (!facts.has(exclusion.factKey)) continue;
    if (exclusion.excludeWhen(facts.get(exclusion.factKey)!)) return false;
  }
  return true;
}

// All obligation events that fall within [today, today + horizon].
export function collectHorizonEvents(now: Date, horizonDays: number): ComplianceEvent[] {
  const events: ComplianceEvent[] = [];
  const seen = new Set<string>();

  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + horizonDays);

  let year = now.getFullYear();
  let month = now.getMonth();
  // Walk each month the window spans (inclusive of the end month).
  while (
    year < windowEnd.getFullYear()
    || (year === windowEnd.getFullYear() && month <= windowEnd.getMonth())
  ) {
    for (const event of getComplianceEvents(year, month)) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        events.push(event);
      }
    }
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const startMs = startOfDay(now);
  const endMs = windowEnd.getTime();
  return events
    .filter((event) => {
      const eventMs = parseLocalDate(event.date).getTime();
      return event.kind === "obligation" && eventMs >= startMs && eventMs <= endMs;
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function generateCandidateTasks(
  clients: readonly SeedClient[],
  now: Date,
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): CandidateTask[] {
  const events = collectHorizonEvents(now, horizonDays);
  const todayMs = startOfDay(now);
  const candidates: CandidateTask[] = [];

  for (const client of clients) {
    for (const event of events) {
      if (!isApplicable(event, client.facts)) continue;

      const daysAway = Math.round(
        (parseLocalDate(event.date).getTime() - todayMs) / 86_400_000,
      );
      const seedKey = `cal:${event.id}:${client.id}`;

      candidates.push({
        clientId: client.id,
        title: `${event.shortTitle} · ${client.displayName}`,
        description:
          `${event.description} Applies to: ${event.applicability} `
          + `Confirm this obligation applies to ${client.displayName} before acting.`,
        priority: priorityForDaysAway(daysAway),
        // Noon IST keeps the calendar date stable when cast/formatted in UTC.
        dueAt: `${event.date}T12:00:00+05:30`,
        seedKey,
        metadata: {
          generated: true,
          seedKey,
          authority: event.authority,
          category: event.category,
          sourceLabel: event.sourceLabel,
          sourceUrl: event.sourceUrl,
          dueDate: event.date,
        },
      });

      if (candidates.length >= MAX_GENERATED) return candidates;
    }
  }

  return candidates;
}
