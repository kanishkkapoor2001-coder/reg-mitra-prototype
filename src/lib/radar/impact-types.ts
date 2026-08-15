// The shape of a matched impact, and the pure helpers over it — importable from
// BOTH sides of the client/server boundary.
//
// This exists because optimistic UI moved the radar components into the client
// bundle, and they were importing these from impacts.ts, which is marked
// server-only (it holds Supabase readers). Types alone would have been erased
// at compile time, but questionsFor is a value, and one value import is enough
// to drag the whole server module into the browser build and crash the page.
// impacts.ts re-exports everything here, so server code keeps its import paths.

import type { RadarDecision } from "@/lib/radar/evaluate";
import { getAttributeDefinition } from "@/lib/radar/facts";

export type ReviewState = "not_reviewed" | "in_review" | "approved" | "rejected";

export type ImpactEvidence = { id: string; marker: string; quote: string; location: string };

export type ClientImpact = {
  id: string;
  clientId: string;
  clientName: string;
  decision: RadarDecision;
  reviewState: ReviewState;
  applicability: string;
  evidence: ImpactEvidence[];
  missingAttributes: string[];
  matchedAt: string | null;
  source: {
    id: string;
    authority: string;
    title: string;
    url: string;
    publishedAt: string | null;
  };
};

/**
 * The profile questions that would settle the most undecided checks, most
 * valuable first. Pure computation over already-loaded impacts.
 */
export function questionsFor(impacts: ClientImpact[], limit = 3) {
  const counts = new Map<string, number>();
  for (const impact of impacts) {
    if (impact.decision !== "more_information_needed") continue;
    for (const key of impact.missingAttributes) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, resolves]) => ({ key, resolves, definition: getAttributeDefinition(key) }))
    .filter((item) => item.definition !== null);
}
