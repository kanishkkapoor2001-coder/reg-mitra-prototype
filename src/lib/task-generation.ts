import {
  getComplianceEvents,
  parseLocalDate,
  type ComplianceEvent,
} from "@/lib/compliance-calendar";

export interface SeedClient {
  id: string;
  displayName: string;
  sector: string | null;
  stateCode: string | null;
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

// Every recurring statutory obligation in the window is a candidate for every
// active client. Applicability is deliberately conservative and honest: the
// task is created "to confirm applicability" rather than asserted as verified,
// which matches how these tasks surface in the queue (evidence: unverified).
function isApplicable(event: ComplianceEvent): boolean {
  return event.kind === "obligation";
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
      if (!isApplicable(event)) continue;

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
