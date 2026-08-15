// Browser-side half of a review decision.
//
// The UI applies the decision instantly and calls this in the background; the
// caller reverts its optimistic state when this resolves false. Posting as
// x-www-form-urlencoded keeps the route's existing formData() parsing, and the
// Accept header is what switches it from redirect mode to JSON mode.

export type ReviewState = "approved" | "rejected" | "not_reviewed";

export async function reviewImpact(impactId: string, state: ReviewState): Promise<boolean> {
  try {
    const response = await fetch("/api/impacts/review", {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams({ impactId, state }),
    });
    if (!response.ok) return false;
    const payload = (await response.json().catch(() => null)) as { ok?: boolean } | null;
    return payload?.ok === true;
  } catch {
    return false;
  }
}
