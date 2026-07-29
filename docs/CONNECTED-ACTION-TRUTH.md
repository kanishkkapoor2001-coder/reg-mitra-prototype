# Connected Systems and Action Truth

## Product decision

Reg Mitra must not be another reminder list that asks a CA to do work elsewhere and
then return to manually mark it complete. Its durable value is a client-level view
that can answer:

1. What applies to this client?
2. What needs to be done?
3. What has been prepared?
4. What was actually submitted?
5. What does the authoritative system currently report?

The answer must carry evidence. A draft, a button click, or a user's claim cannot be
treated as proof that an external action happened.

## Research evidence

### Arshan Vakil

**Arshan <> Tarak Weekly Sync — 25 May 2026**

- Arshan said that if the product reminds someone and then makes that person update
  the task after doing the real work elsewhere, it becomes “an added task.”
- He wanted the product to fetch what is pending and what is done in real time.
- He identified MCA director KYC and Income Tax TDS return status as examples that
  can be checked from government systems.
- Where a stable API is unavailable, he preferred a Chrome extension operating in
  the user's already authenticated portal tab. The user keeps control of login and
  the product does not ask for the portal password.
- He regarded this connected verification as a central product differentiator.

**Arshan <> Kanishk Product Sync — 10 June 2026**

- The demonstration should take one client through an obvious end-to-end workflow.
- A client page should prioritize live compliance status, portal sync health,
  recent activity, and a useful client-filtered calendar.
- “Live compliance status” was the strongest part of the concept: show what is done
  and what remains.
- An action tile must lead somewhere useful. At minimum, it should provide the exact
  portal instructions; ideally it should complete a controlled step.
- At least one action, such as Director KYC, should work end to end.

### Wider CA evidence

**Shrenik Connect — 4 May 2026**

- The product should combine current law with client-specific material and Tally
  transactions, then identify the effect on that client.
- A useful calendar must show the applicable law, due date, required action, and
  whether that action is done.
- The MSME example requires invoice, accounting, and payment dates. Generic answers
  that invent or misread dates destroy trust.

Other recorded CA conversations repeatedly reinforced:

- Tally or accounting-system integration is close to non-negotiable.
- GST-to-books reconciliation is a major operational pain.
- Regulatory impact must eventually reach transaction-level data.
- Client consent, end-to-end security, and avoiding duplicated data entry are
  buying requirements, not implementation details.

## Action state model

Every obligation or action uses a single normalized state machine.

| State | Meaning | Minimum evidence |
| --- | --- | --- |
| `identified` | Reg Mitra found a potentially applicable requirement | Official source and client applicability rationale |
| `prepared` | A draft, checklist, calculation, or working paper exists | Versioned workspace artifact |
| `awaiting_approval` | A named reviewer must approve the next step | Reviewer assignment and immutable version |
| `submitted` | The external system accepted an action | Connector receipt, acknowledgement number, or equivalent |
| `verified_complete` | The authoritative system reports completion | Timestamped source read-back |
| `pending` | The authoritative system reports that the action is not complete | Timestamped source read-back |
| `manual_confirmation` | No connected source can prove the current state | Named person, timestamp, and supporting attachment |
| `failed` | A connector or submission attempt failed | Error class, timestamp, and safe retry path |
| `stale` | The last source check is older than its permitted freshness window | Last successful check and required refresh |

### Non-negotiable truth rules

- `prepared` never implies `submitted`.
- A user pressing “done” never produces `verified_complete`.
- `submitted` requires a source receipt or connector acknowledgement.
- `verified_complete` requires a fresh read-back from the authoritative source.
- Every state shows its source, timestamp, scope, and freshness.
- Failed or stale checks remain visible. The interface must not silently preserve an
  old green status.

## Connector architecture

### 1. TallyPrime: read-only first

Start with a local connector that reads the selected company while Tally is running.
Normalize:

- ledgers and groups;
- vouchers and invoice references;
- supplier MSME classification where recorded;
- GST registration details;
- invoice, accounting, due, and payment dates;
- reconciliation-relevant totals.

The service sends only the approved fields for the approved client workspace. It
must show a preview and record consent before the first sync. Phase one does not
write vouchers or alter books.

### 2. GST: API first, authenticated browser fallback

Use approved GST/GSP APIs for data they legally and technically expose. Normalize
return periods, filing status, liability and credit ledgers, notices, and receipt
identifiers. Any browser-assisted workflow should run in a locally authenticated
tab and stop for explicit approval before an irreversible action.

### 3. MCA and Income Tax: local authenticated session

For portal checks without an appropriate API, use a signed Chrome extension and a
local companion:

- the user signs in directly to the official portal;
- Reg Mitra never receives or stores the password, OTP, or CAPTCHA response;
- the extension reads only an allowlisted page and field set;
- every read produces a timestamped evidence record;
- every proposed write shows a before/after preview;
- submission requires step-up approval;
- a successful click is not success—capture the receipt, then read the status back.

Government portals change frequently and may prohibit or block automation. Each
connector therefore needs a legal/terms review, resilient selectors, versioned
parsers, health monitoring, and a manual fallback. “Technically possible” is not
enough for production.

### 4. Normalized evidence record

Connectors should write a common record:

```text
workspace_id
client_id
system
account_scope
obligation_type
period
state
source_reference
receipt_reference
observed_at
fresh_until
connector_version
raw_evidence_hash
reviewer
```

Raw portal pages and client books should not be sent to the language model by
default. Retrieval uses the smallest normalized evidence necessary to answer the
question.

## Delivery phases

### Phase 1 — Trustworthy read-back

- Tally read-only sync for one selected company.
- GST, MCA, and Income Tax connection health.
- Status read-back for a tightly scoped set: GSTR-3B, GSTR-1, Form 26Q, and Director
  KYC.
- Client-level Action Truth ledger with receipts, timestamps, stale states, and
  connector errors.
- Consent ledger, field-level audit log, and security review.

This phase proves the core promise without taking irreversible action.

### Phase 2 — Prepare and hand off

- Client-specific checklists and portal instructions.
- Working papers prepared from connected data.
- Deep links that take the user to the correct official workflow.
- Reviewer approval and version locking.
- Reconciliation explanations with source transactions.

### Phase 3 — Controlled execution

- Submit only the actions for which automation is reliable, permitted, and
  commercially supportable.
- Show the exact payload before submission.
- Require explicit, named approval.
- Capture the external receipt.
- Read back the authoritative status.
- Provide recovery and human escalation for every failed attempt.

## First production slice

Use one consenting CA firm and one client. Build an end-to-end Director KYC status
check plus one Tally-to-GST reconciliation workflow. Success means a CA can open the
client, see a fresh source-backed state, inspect the evidence, prepare the next
step, and verify the result without duplicating data or trusting an invented status.

Do not broaden to many shallow connectors until this slice is reliable.
