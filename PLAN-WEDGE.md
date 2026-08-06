# The wedge (change → client matching) — BUILT

**Status 2026-08-06: all five phases built and live.** Verified in production:
11 real rules imported, matched against the live client book, decisions stored
with their evidence. See the phase notes below for what each one landed.


**Goal.** Make the homepage promise true: every circular matched to the clients it
affects, with evidence, inside the signed-in product. Kill "Not assessed".

**The unlock.** The engine already exists in `newsletter/src/radar/` and runs live on
reg-mitra.vercel.app/radar-demo:

- `facts.ts` — registry of company attributes (sector, entity type, turnover band,
  activities…) each with the question to ask, why it matters, and an expiry.
- `rules.ts` — a zod-typed rule language (predicates + AND/OR trees + evidence quotes
  that must cite the source text).
- `ingestion/applicability.ts` — LLM extracts a rule per circular, an **independent
  second model re-derives it from the source**; disagreement withholds the rule.
  Versioned in the newsletter DB.
- `evaluate.ts` — deterministic three-valued evaluation (true / false / **unknown**),
  a decision trace for audit, and `rankAdaptiveQuestions` (which missing facts would
  resolve the most unknowns).
- `explain.ts` — human-readable "why this matched".

The product repo has the receiving tables (`regulatory_sources`,
`client_regulatory_impacts` with `review_state`) — read by /today and /clients,
written by nothing. The wedge = connect these two halves + a CA review flow.

**Design principle (from V2 decisions):** evidence before conclusions. The machine
proposes with cited evidence; the CA approves. Nothing auto-marks "applies".

---

## ✅ Phase 1 — Client facts foundation (~1–2 days)

The matcher can't run on `sector` + `state_code` alone.

1. Migration: `client_facts` table — `(workspace_id, client_id, key, value jsonb,
   confirmed_at, expires_at, source: 'ca_confirmed'|'derived', created_by)`.
   Key validated against the attribute registry.
2. Port `facts.ts` (attribute registry) into `product/src/lib/radar/` verbatim.
   Single source of truth note pointing back at newsletter copy.
3. Derive free facts automatically: existing `client_identifiers` already prove
   things — has GSTIN → GST-registered (+ state from GSTIN prefix), FSSAI licence
   → food activity, CIN → entity type. Derived facts marked `derived`, CA can
   override.
4. Client page: "Company profile" section — the registry's own questions, grouped,
   with the "why we ask" line, confirm button, stale-fact indicator (expiry).

**Done when:** a CA can answer the profile questions on a client and the answers
persist with provenance.

## ✅ Phase 2 — Rules flow from newsletter → product (~1–2 days)

The newsletter ingestion already mints verified rules Mon/Wed/Fri. The product
needs them.

1. Newsletter: `/api/export/rules` — signed with a shared secret; returns
   documents + summaries + current applicability rules since a cursor.
2. Product: `regulatory_rules` table (rule JSON, version, document ref, evidence)
   + import cron (runs after the newsletter's ingest days) that upserts
   `regulatory_sources` + `regulatory_rules`.
3. Port `rules.ts`, `evaluate.ts`, `explain.ts` into `product/src/lib/radar/`.

**Done when:** product DB holds the same rule set the radar demo evaluates.

## ✅ Phase 3 — The matcher (~1–2 days)

1. `matchWorkspace(workspaceId)`: for each active client × each current rule →
   `evaluateApplicability(facts, rule)` → upsert `client_regulatory_impacts`:
   - decision `likely` → `review_state: 'proposed'`, with trace + evidence
   - `review` → `proposed` (lower confidence band)
   - `unknown` → recorded as needs-facts, with the blocking fact keys
   - `unlikely` → stored as cleared (so "4 cleared" is real, like the hero card)
2. Triggers: after rule import; after any client fact change (that workspace
   only); nightly safety-net cron.
3. Idempotent by (client, document, rule version) — re-runs update, never
   duplicate. CA decisions are never overwritten by re-evaluation; a **new rule
   version** re-opens the row as `proposed` with a "rule updated" note.

**Done when:** seeding a test workspace with a food-manufacturer profile produces a
proposed FSSAI impact with quoted evidence, and a consultancy profile produces
cleared rows. Verified in prod DB, rolled back.

## ✅ Phase 4 — Surface it in the product (~2–3 days)

This phase is the visible wedge — the hero animation, for real.

1. **/clients list**: per-client status chip — "2 proposed · 1 needs facts · 8
   cleared" replaces "Not assessed".
2. **Client page — Radar section**: proposed matches with the explain() line,
   evidence quotes linking to the official source, Approve / Dismiss / Not
   applicable buttons writing `review_state` (+ who/when — audit trail).
   Needs-facts block: top adaptive questions inline ("answer these 2 → resolves 3
   pending checks").
3. **/today**: "Changes needing your decision" queue = proposed impacts across the
   book, highest-confidence first. Approving can spawn the prepare-brief task
   (Assistant · Prepare exists already).
4. **Task generation honesty**: `isApplicable()` consults facts + approved
   impacts — GST scheme facts drive GST deadlines, entity type drives MCA, etc.
   Clients stop sharing one identical calendar.

**Done when:** the /today flow for a real workspace walks: new rule → flagged
client → why + evidence → approve → prepared task. Screenshot-verifiable.

## ✅ Phase 5 — Close the loop (~1 day)

1. Digest email via Resend (infra proven): "3 new circulars this week — 2 affect
   your clients, 1 needs a fact" → deep links. Respects approval gate.
2. Memory/docs: update CLAUDE.md files; record the sync contract.

---

## Explicitly out of scope (this plan)
- Client-page 5-section redesign beyond the Radar + profile sections.
- Corpus embedding backfill (separate quick win: `npm run corpus:embed`).
- Newsletter/product repo merge — they stay separate; the export API is the
  only coupling.
- Auto-approval of matches. Never.

## Risks & mitigations
- **Rule quality** → two-model verification already exists; review gate means a
  wrong rule wastes a click, not a filing. Track dismiss-rate per rule as the
  quality signal.
- **Fact staleness** → registry expiries + stale indicators (Phase 1.4).
- **Sync drift between the two engine copies** → engine files carry a header
  naming newsletter as canonical; check diff before upgrading either side.
- **Cold-start (client with no facts)** → derived facts (1.3) + adaptive
  questions mean the first scan is useful after ~3 answers, matching the demo.

## Order & effort (solo, ~7–10 working days)
1 → 2 → 3 → 4 → 5, each phase shippable and verifiable on its own. Phase 4 is the
demo-able milestone; after Phase 3 the data is already real underneath.
