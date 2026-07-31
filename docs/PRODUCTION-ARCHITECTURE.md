# Reg Mitra production architecture

## Selected foundation

Until explicitly changed, the implementation uses:

- Supabase Auth for passwordless identity and session revocation.
- Supabase Postgres for tenant, client, workflow, conversation and audit data.
- pgvector in the same Postgres project for the initial regulatory corpus.
- Stripe-compatible subscription fields and server-enforced entitlements.
- Vercel for the Next.js application, scheduled ingestion and deployment.

This keeps the first production system understandable: one transactional store,
one identity boundary and one deployment surface. The regulatory corpus can move
to a dedicated search service later if measured scale requires it.

## Trust boundaries

1. The browser holds only the user session. It never receives a service-role
   credential, encryption key, webhook secret or model key.
2. Supabase Row Level Security enforces workspace membership even when an
   application query is incorrect.
3. Consequential operations use server routes that re-check role and
   entitlement, validate input, write the domain change and append an audit
   event.
4. Regulatory ingestion uses a separate server-only service identity. Product
   users have read-only access to source documents.
5. Demo content is not stored in customer tenant tables. Demo routes use a
   dedicated, read-only fixture boundary.

## Core data flow

```text
Official source
  -> scheduled discovery
  -> immutable source version + content hash
  -> parse and quality state
  -> provision-aware chunks
  -> embeddings
  -> retrieval and reranking
  -> answer with validated citations
  -> professional review
  -> task, brief or approved action
  -> immutable audit event
```

Every generated result retains the source IDs, chunk IDs, model, prompt version
and creation time required to reproduce and evaluate it.

## Authorization model

| Role | Workspace | Clients and tasks | Review | Membership and billing |
| --- | --- | --- | --- | --- |
| Owner | Full | Full | Approve | Full |
| Admin | Full | Full | Approve | Manage members |
| Reviewer | Read | Create and update | Approve | No |
| Member | Read | Create and update | Submit | No |
| Viewer | Read | Read | No | No |

Entitlements are independent of role. A user may have permission to perform an
operation while the workspace plan does not include it; the server must enforce
both checks.

## Sensitive identifiers

PAN, GSTIN, TAN and related identifiers must not be stored as ordinary display
text. The application stores:

- authenticated encryption ciphertext for display to authorized users;
- a keyed fingerprint for exact duplicate detection and lookup;
- a masked presentation value where full disclosure is unnecessary.

Encryption and fingerprint keys live only in the deployment secret manager and
must support rotation.

## Reliability requirements

- Ingestion is idempotent by canonical URL, content hash and parser version.
- Webhooks are idempotent by provider event ID.
- Audit records are append-only and cannot be inserted from the browser.
- Failed parsing or embeddings remain visible in an operator queue and are never
  silently counted as searchable coverage.
- Database backups, point-in-time recovery and restore drills are release
  requirements.
- Model failure returns a source-search result or safe retry state; it never
  fabricates a successful action.

## Required environment

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
REGMITRA_IDENTIFIER_ENCRYPTION_KEY
REGMITRA_IDENTIFIER_FINGERPRINT_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
APP_URL
```

The application must fail closed in production when a required secret is
missing. Local demo mode remains available without production secrets.

## Rollout

1. Apply the schema to a non-production Supabase project.
2. Add passwordless sign-in and create the first workspace owner transaction.
3. Replace compiled client/work fixtures with tenant repositories.
4. Persist tasks, conversations, citations and audit events.
5. Move corpus ingestion and retrieval to Postgres/pgvector.
6. Add Stripe checkout/webhooks and server-side entitlement checks.
7. Run tenant-isolation, role, RAG evaluation, accessibility and recovery tests.
8. Promote the same migration and application build to production.
