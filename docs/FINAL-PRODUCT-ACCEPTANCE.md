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
| Public website | In progress | Welcome, About, Pricing, FAQ, trial and separate demo routes exist | Final content, accessibility and conversion review |
| Demo experience | In progress | Isolated demo cookie and fictional-data disclosure exist | Signed sessions, automated isolation tests, one consistent demo indicator |
| Customer authentication | Not implemented | Current `product` cookie is a development shortcut only | Real identity provider, secure sessions, passwordless or SSO flow, recovery and revocation |
| Tenant and role access | Not implemented | No tenant, membership, or role model | Firm isolation, owner/member/reviewer roles, server-side authorization tests |
| Client records | Prototype data | Six fictional clients are compiled into the application | Persistent client store, import/create/edit/archive, validation, ownership and history |
| Work queue | Prototype data | Today and client screens provide the intended interaction model | Persisted tasks, assignment, due dates, state changes and activity history |
| Regulatory corpus | In progress | Official-source corpus, hybrid retrieval, embeddings and citation validation exist | Scheduled discovery, durable document/vector store, versioning, failure queue and coverage policy |
| Ask assistant | In progress | Source-grounded answers and first-class citation cards work locally | Identity-aware limits, conversation persistence, evaluation gate, prompt-injection defenses and monitoring |
| Act assistant | Prototype | Review UI exists, but no production action connector exists | Persisted drafts, approval workflow, immutable audit events and explicitly scoped connectors |
| Compliance calendar | In progress | Source-linked recurring obligations and daily source-health refresh exist | Tenant-specific applicability, overrides, review history, alerts and durable refresh results |
| Billing and paywall | Not implemented | Pricing honestly states that payment is not collected | Product/plan model, checkout, webhook verification, entitlement enforcement and billing portal |
| Audit and retention | Not implemented | Source timestamps exist in selected research flows | Immutable security/activity audit log, export, retention controls and incident procedure |
| Operations | Not implemented | Vercel project and a calendar cron are configured | CI release gate, production secrets, backups, health checks, error reporting, alerts and rollback runbook |
| Accessibility | Failing release gate | Semantic navigation and keyboard foundations exist | Remove sub-12px product text and banned styling; automated axe/Lighthouse coverage on every route |

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
- [ ] The assistant never treats retrieved instructions as trusted system
  instructions.
- [ ] Superseded and withdrawn publications remain traceable but cannot silently
  outrank an effective source.
- [ ] Corpus coverage, freshness, parser failures and embedding failures are
  visible to an operator.
- [ ] A failed evaluation blocks release.

## Experience and accessibility gate

- [ ] Urgent work is the first region on Today at desktop and mobile widths.
- [ ] Clients is a sortable, filterable comparison table with URL-persisted
  filters and a compact mobile list.
- [ ] Assistant has at most conversation, composer and one optional context
  region at rest.
- [ ] Citations show authority, document or provision, status, last checked and
  original-source link.
- [ ] No product text is smaller than 12px; body text is at least 14px.
- [ ] No gradients, glows, card lift, decorative card shadows, or radii above
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
