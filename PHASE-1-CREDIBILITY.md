# Phase 1 — Credibility and trust

## Outcome

The workspace now distinguishes illustrative content from evidence-backed information and prevents unreviewed work from appearing ready for external use.

## Trust vocabulary

### Evidence states

| State | Meaning |
| --- | --- |
| Verified | Matched to an authoritative source and checked by a reviewer |
| Source needed | No authoritative source is attached; the item must not be relied on |
| Demo only | Illustrative content used to demonstrate a workflow |
| Check again | The attached source is older than the review policy permits |
| Not connected | No external system is supplying or confirming the information |

### Review states

| State | Meaning |
| --- | --- |
| Not reviewed | A qualified professional must review the item before use |
| In review | A reviewer is checking the source, applicability, and proposed action |
| Approved | A named reviewer approved the specific version |

## Product changes

- Home shows a workspace-wide data-confidence summary.
- Regulations expose source, last-checked, applicability, reviewer, and caveat fields.
- Missing authoritative sources are explicit and actionable.
- Client profiles distinguish demo identifiers and scores from verified client records.
- Client actions display a professional-review gate.
- Assistant answers are described as drafts and cannot imply approval.
- Briefing delivery is locked until a named reviewer approves the version.
- Settings includes a source register for portals, documents, and review policy.
- Copy consistently uses “demo,” “source needed,” “not connected,” and “not reviewed.”

## Verification

- Strict TypeScript: passed
- ESLint: passed
- Production build: passed
- Production dependency audit: zero known vulnerabilities
- Home trust summary verified locally
- Regulations, client workspace, Assistant, Briefings, and Settings verified at 390×844
- No horizontal overflow detected on the checked mobile routes

## Boundary

This phase defines the credibility model and interface states. It does not connect government portals, verify the illustrative regulatory claims, provide legal advice, or approve professional work. Those actions require authoritative sources, appropriate credentials, and qualified professional review.
