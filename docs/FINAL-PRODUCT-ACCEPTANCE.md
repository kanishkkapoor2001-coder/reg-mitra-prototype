# Reg Mitra final-product acceptance

This document is the release gate for Reg Mitra. A checked item needs repeatable
evidence from the deployed product. A polished screen or a successful local
build is not evidence that a production capability exists.

## Release principles

- Never present illustrative records, inferred applicability, or generated text
  as verified fact.
- Every regulatory statement must retain its official source, publication or
  provision, retrieval date, and review state.
- Professional review is required before advice, filing, communication, or
  another consequential action leaves the workspace.
- Demo and customer data must be isolated. A demo session must never gain access
  to a customer tenant.
- Client data, credentials, and generated work must be encrypted, access
  controlled, auditable, and covered by a documented retention policy.

## Current release status

| Area | Status | Evidence today | Required before release |
| --- | --- | --- | --- |
| Public website | Release candidate | Welcome, About, Pricing, FAQ, login, trial and separate demo routes exist; automated WCAG checks pass | Final legal copy and conversion review |
| Demo experience | In progress | Isolated fictional fixtures, one consistent demo indicator and automated route coverage exist | Cryptographically signed demo sessions and explicit isolation tests |
| Customer authentication | Implemented, configuration pending | Supabase passwordless sign-in, callback, logout and onboarding replace the former development cookie | Hosted Supabase project, approved redirect URLs and session-revocation verification |
| Tenant and role access | In progress | Workspace, membership and owner/reviewer authorization exist in schema, RLS and server paths | Invitation/revocation journey and broader authorization test matrix |
| Client records | In progress | Customer mode reads and creates tenant-owned clients; demo fixtures remain isolated | Edit, archive, bulk import and complete change-history UI |
| Work queue | In progress | Tenant tasks persist; reviewer-only review and audit events are implemented | Assignment/editing workflow, alert delivery and full journey tests |
| Regulatory corpus | In progress | 28 official sources, 211 chunks, 19 full-text sources, hybrid retrieval and 27/27 release evaluations | Scheduled discovery, durable vector store, parser retry queue and broader state-law coverage |
| Ask assistant | Release candidate | Tenant conversations, messages, citations, model/prompt version, abstention and prompt-injection rules persist | Complete remaining embeddings, hosted monitoring, load/rate-limit tests and professional answer review |
| Act assistant | In progress | Draft/review UI, reviewer-only approval and audit events exist; external execution is deliberately disabled | Explicitly scoped production connectors and per-connector confirmation tests |
| Compliance calendar | In progress | Source-linked obligations, tenant tasks and source-health refresh exist | Tenant applicability overrides, alert delivery and durable hosted refresh verification |
| Billing and paywall | Implemented, configuration pending | Stripe checkout, portal, signed idempotent webhook and server-side entitlements exist | Live Stripe products/prices, webhook secret and end-to-end test-mode verification |
| Audit and retention | In progress | Material task, assistant and billing changes create tenant audit records | Export, retention controls, backup validation and incident procedure |
| Operations | In progress | CI now runs type, lint, RAG, billing, corpus, desktop/mobile axe and build gates | Production secrets, backups, error reporting, alerts and rollback drill |
| Accessibility | Automated gate passing | 22/22 desktop/mobile route scans pass with no WCAG 2.1 AA axe violations or viewport overflow; text and styling constraints are enforced | Lighthouse, manual keyboard/VoiceOver and release screenshot review |

## Required end-to-end journeys

- [ ] A firm owner can create a workspace, verify identity, sign in again, and
  revoke an active session.
- [ ] The owner can invite a team member and assign a role that is enforced by
  every relevant server endpoint.
- [ ] A user can create or import a client, record applicability facts, edit the
  record, and inspect who changed it.
- [ ] A newly ingested official update is versioned, searchable, source-linked,
  and never shown as verified when retrieval or parsing is incomplete.
- [ ] Ask can answer a CA question with provision-level evidence, expose
  uncertainty, and abstain when the corpus does not support an answer.
- [ ] A user can map an update to a client, review the reasoning, create a task,
  assign it, and see it in Today and Calendar after signing in again.
- [ ] Act can prepare a draft but cannot send, file, or mutate an external system
  without an authorized reviewer and an auditable confirmation.
- [ ] A trial expires and loses paid capabilities on the server, not merely in
  the interface.
- [ ] Demo records remain fictional and cannot be exported into or queried from
  a customer workspace.
- [ ] An operator can detect failed ingestion or generation, retry safely, and
  roll back a broken deployment without losing customer data.

## RAG quality gate

- [ ] Maintain a versioned evaluation set covering GST, income tax/TDS, MCA,
  RBI, FSSAI, EPFO and material state-level obligations in product scope.
- [ ] Measure retrieval recall, citation correctness, answer support,
  abstention, stale-source detection and conflicting-source handling.
- [ ] Every factual answer sentence is supported by a returned source or
  explicitly labelled as an inference.
- [x] The assistant never treats retrieved instructions as trusted system
  instructions.
- [x] Superseded and withdrawn publications remain traceable but cannot silently
  outrank an effective source.
- [x] Corpus coverage, freshness, parser failures and embedding failures are
  visible to an operator.
- [x] A failed evaluation blocks release.

## Experience and accessibility gate

- [x] Urgent work is the first region on Today at desktop and mobile widths.
- [x] Clients is a sortable, filterable comparison table with URL-persisted
  filters and a compact mobile list.
- [x] Assistant has at most conversation, composer and one optional context
  region at rest.
- [x] Citations show authority, document or provision, status, last checked and
  original-source link.
- [x] No product text is smaller than 12px; body text is at least 14px.
- [x] No gradients, glows, card lift, decorative card shadows, or radii above
  10px remain in the product workspace.
- [ ] Every route has one `h1`, landmarks, a skip link, visible focus, labelled
  controls and end-to-end keyboard operation.
- [ ] Automated axe checks report zero violations and Lighthouse accessibility
  is at least 95 for every release route.
- [ ] Desktop and 390px mobile screenshots are reviewed for every release route.

## Decisions and credentials still required

These are product decisions, not coding details, and must be selected before the
hosted customer product can be called final:

1. Authentication and tenant provider.
2. Production relational database and region.
3. Vector-search storage and backup policy.
4. Billing provider, trial rules, price and tax handling.
5. Transactional email provider and sender domain.
6. Production domain, privacy policy, terms, data-processing policy and support
   contact.
7. Initial regulatory coverage promise and named professional review owner.

## Release rule

Reg Mitra may be described as a private prototype or pilot while any
customer-data, authorization, billing, audit, durability, or RAG quality gate
above remains incomplete. It may be described as a final product only after all
required journeys pass against the production deployment.
