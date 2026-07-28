# Phase 0.5 — Next.js and strict TypeScript migration

## Purpose

This branch establishes a maintainable application foundation before visual redesign work begins.

## Architectural changes

- Next.js App Router replaces in-memory class toggling with real URLs.
- Strict TypeScript provides typed client, work-item, regulation, and navigation models.
- Shared application shell replaces duplicated navigation and header behavior.
- Core screens are independent routes and can be tested or deployed separately.
- Dynamic client workspaces use `/clients/[id]` with statically generated demo profiles.
- Responsive navigation replaces the fixed 240px mobile sidebar.
- Honest demo and unverified states replace claims of live portal connectivity.
- Error and not-found boundaries are explicit.

## Route map

| Previous screen | New route |
| --- | --- |
| Home | `/` |
| Today dashboard | `/today` |
| Clients | `/clients` |
| Client detail | `/clients/[id]` |
| Briefings | `/briefings` |
| Calendar | `/calendar` |
| Regulations feed | `/regulations` |
| Assistant / Ask | `/assistant` |
| Integrations and settings | `/settings` |

## Preserved references

- `index.html` retains the latest local prototype as a parity reference.
- `legacy-api/` retains the local Tally mock handlers for later typed route-handler migration.
- Phase 0 audit evidence remains isolated in PR #1 and is not duplicated here.

## Deliberately deferred

- Live portal and accounting integrations
- Authentication and multi-tenant data storage
- Sending communications or filing actions
- Final visual redesign phases
- Replacement of illustrative data with verified production data

These require separate gates because they materially change product behavior, data handling, or external side effects.
