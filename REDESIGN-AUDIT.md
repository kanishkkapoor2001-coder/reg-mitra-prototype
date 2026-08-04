# Reg Mitra redesign audit

Phase: 0 — Audit & baseline  
Date: 28 July 2026  
Branch: `redesign/p0-audit`  
Audited product: `live-product`

## Scope and method

This is a read-only product audit. No product source file was changed.

Source scope:

- `index.html`
- `api/tally/company.js`
- `api/tally/ledgers.js`
- `api/tally/reconcile.js`
- `api/tally/stock-items.js`
- `api/tally/vouchers.js`

The working tree was already dirty before Phase 0 began:

```text
 M index.html
?? .agents/
?? .claude/
?? .gitignore
?? api/
?? skills-lock.json
```

Those user-owned changes were preserved. Product-source SHA-256 values recorded
during the audit:

```text
dc15c4df5ad4f23f38ad6e3cf742a343eebe798a8356bb9a97324c1621c14b5f  index.html
4c775f8dd16151d4c6f88f69bfe46f4da816fe0fe4bcda4b98ef089a95a38b3c  api/tally/company.js
3ee28f78858b00b546dac4d07198c6c0f60e643ca6f473f6d8c69b96eb939573  api/tally/ledgers.js
1cf2b5683519579f1cee92a3030856be9619a41f75ec35c9d81db0e5e73b0c05  api/tally/reconcile.js
785e0fe2038a72d6a913f8781d6b7d9a00b1e36e55fbb426efa68c956d52b65a  api/tally/stock-items.js
1d988cf228f1a696209e62c6eeb6dc277dc8f91c514aaafeb17428d9e573e8f2  api/tally/vouchers.js
```

The index diff that predated Phase 0 had SHA-256
`f6c045d31205edc5ea77ecff2f502c14ca578d5bf40d12e69a4dcc352c27cf1d`.

For screen complexity, “depth” means the maximum structural DOM nesting below a
`.screen` root. Text and SVG primitives are excluded; structural containers,
forms, lists, tables, and rows are included. This is a comparable complexity
measure, not a React component count.

For token counts, the audit scans source declarations in the HTML `<style>`
block, inline `style` attributes, and JavaScript-generated markup. Counts are
source counts rather than browser-computed styles.

Accessibility automation used:

- Lighthouse 13.4.1, accessibility category only
- axe-core 4.12.1
- Chrome for Testing / ChromeDriver 150.0.7871.124

Because the application has no URL routes, Lighthouse and axe ran against
temporary exact copies of `index.html` that invoked the existing `navTo()`
function after load. Those copies were outside the repository and were not
committed. Screenshots were captured from the live port-4180 application.

## 1. Stack reality

### Client application

- One static, 10,382-line `index.html`.
- Three classic inline JavaScript blocks begin at `index.html:7746`,
  `index.html:9760`, and `index.html:9990`.
- No React, Next.js, Vue, Svelte, Angular, client router, bundler, or package
  manifest.
- Navigation is in-memory class toggling. A refresh always returns to Home.
- `?onboard=1` is the only URL-state behavior.

### Styling

- One custom inline CSS block: `index.html:9-4339`.
- 521 inline `style=""` attributes.
- CSS custom properties plus hardcoded CSS values.
- Google Fonts loads Plus Jakarta Sans and Fraunces at `index.html:8`.
- No Tailwind, Sass, CSS modules, Bootstrap, or formal design-system package.

### Components and tables

- No component library.
- UI is hand-authored HTML, JavaScript template strings, and inline SVG.
- 34 native `<table>` elements.
- No headless table/data-grid library.

### Backend and data access

Five Vercel-style JavaScript handlers exist:

- `api/tally/company.js:7-116`
- `api/tally/ledgers.js:9-40`
- `api/tally/reconcile.js:9-45`
- `api/tally/stock-items.js:9-37`
- `api/tally/vouchers.js:9-34`

All endpoint payloads are object literals; there is no Tally connection.
`company.js` updates only `lastSync`. `vouchers.js` ignores the requested
client. `ledgers.js` and `reconcile.js` fall back to Sharma for unsupported
clients.

The visible API Sandbox does not call those handlers. `callTallyAPI()` uses a
second inline `TALLY_MOCK_DATA` object and an artificial 200–399 ms delay at
`index.html:7908-8013`.

The only production-source `fetch()` is onboarding to `/api/tally/company` at
`index.html:10058-10068`; its failure branch still renders “Connected”.

### Tests and type safety

- No test files.
- No test runner.
- No lint configuration or package scripts.
- No TypeScript and no `tsconfig.json`.
- TypeScript strictness is therefore not applicable.
- Browser scripts are classic global-scope JavaScript without `"use strict"`.

### Stack implication

The target stack in the execution plan is not an incremental configuration
change. Introducing Next.js, TypeScript, Tailwind, Radix/shadcn, TanStack Table,
Vitest, Playwright, and axe would be a product migration from a static
prototype. Phase 0 makes no recommendation to migrate; this is a Gate A
decision.

## 2. Screen inventory

The application has 15 pseudo-routes but only six sidebar destinations.

| Pseudo-route / root | Sidebar owner | Purpose and rough structural tree | Depth |
|---|---|---|---:|
| `home` — `index.html:4426` | Home | Sync disclosure → hero → KPI strip → stats → portfolio CTA → regulations/activity | 6 |
| `clients` — `index.html:4601` | Clients | Heading/search/filters → six client cards | 5 |
| `dashboard` — `index.html:4730` | Home | Today greeting → overdue → next 24h → briefing queue → activity log | 5 |
| `feed` — `index.html:4856` | Home | Filters → conflicts → regulation cards → match reasoning | 5 |
| `client-detail` — `index.html:5037` | Clients | Header → portal chips → health/KPIs → status/deadlines → activity → regulations/comms | 6 |
| `calendar` — `index.html:5144` | Calendar | Month/filter controls → generated calendar → forecast list | 2 |
| `briefings` — `index.html:5211` | Briefings | Generation stats/filter → advisory cards | 3 |
| `chat` — `index.html:5558` | Assistant | Mode toggle → history/context → threads/tables → composer | 8 |
| `agent` — `index.html:6230` | Assistant | Mode toggle → task threads → steps/results/confirmations → sandbox → composer | 8 |
| `tally` — `index.html:6626` | Settings | Connection/filter → summary → alerts → ledger/stock/voucher/reconciliation tables | 5 |
| `gst` — `index.html:6864` | Settings | Stats/filter/summary → alerts → filing/reconciliation tables | 4 |
| `incometax` — `index.html:6977` | Settings | Stats/filter/summary → alerts → TDS/26AS/ITR tables | 4 |
| `mca` — `index.html:7084` | Settings | Stats/filter/summary → alerts → filing/director-KYC tables | 3 |
| `comms` — `index.html:7186` | Settings | Stats/filter/summary → log → acknowledgements/reminders | 4 |
| `settings` — `index.html:7275` | Settings | Integrations → firm → walkthrough controls | 5 |

Sidebar `data-screen` values are `home`, `briefings`, `calendar`, `clients`,
`assistant`, and `settings` at `index.html:4368-4393`. `assistant` resolves to
`chat` or `agent`. `NAV_MAP` owns the 15 screen strings at
`index.html:8057-8065`.

Navigation only toggles `.active` at `index.html:8069-8082`. There are no URL
paths, hashes, History API calls, back-button behavior, or restorable deep
links.

Additional non-route surfaces:

- Seven regulation modals:
  `index.html:7359,7432,7475,7533,7578,7630,7682`
- Alert modal: `index.html:9598`
- Calendar popup: `index.html:9623`
- Action modal: `index.html:9638`
- Briefing modal: `index.html:9679`
- Help chat: `index.html:9711`
- Onboarding overlay: `index.html:9835`

## 3. Fabricated and hardcoded data inventory

### Provenance conclusion

No business, client, regulator, portal, accounting, ROI, confidence, matching,
filing, or communication metric is externally sourced at runtime.

The UI contains:

1. Explicit demo/sample literals and unsourced object literals.
2. Static regulatory copy that names an authority or document but is never
   fetched or verified.

Named legal sources do not establish runtime provenance.

### Surface-by-surface worklist

| Surface | Hardcoded values and claims | Source |
|---|---|---|
| Shell | Briefings `6`; Clients `6`; firm `6 clients` | `index.html:4375,4385,4400` |
| Home | `6` portals; `142` filings; `38` updates; `6` clients; `49` feeds; `12` actions and `2` high priority; `8` briefings; `~51 hrs` saved | `index.html:4454,4480-4526,4574-4591` |
| Clients | Sharma risk `6.8/+0.4`, `3/2/12`, `14` feeds, `12h/₹24K`; NexGen `5.2/+1.1`, `1/2/18`, `8`, `4h/₹9K`; Gupta `8.1/+2.3`, `4/1/9`, `11`, `16h/₹32K`; Royal `7.4/+1.8`, `2/3/7`, `9`, `7h/₹14K`; Lakshmi `6.1/+0.9`, `2/1/22`, `16`, `9h/₹18K`; Greenfield `3.2/-0.1`, `1/0/14`, `7`, `3h/₹6K` | `index.html:4641-4724` |
| Today | `7` items/`6` clients; `47` invoices; `3` sign-offs; `12 tasks/4 clients/23 portals/3 briefings/1 overdue`; scan times; `7 regulations, 5/6 affected` | `index.html:4733-4848` |
| Client detail | Every client statistic, turnover/AUM, pending/compliant count, deadline, health score, filings, tax, ROI, timeline, sync time, activity, communication, and portal status | `index.html:8497-8890` |
| Calendar | Forecast counts plus all schedule/event values | `index.html:5183-5205,8024-8033,8300-8363` |
| Briefings | `7 drafts`, `8s`, `45m`, `5.2h`, plus every generation/savings value and client-book value in nine cards | `index.html:5218-5553` |
| Assistant / chat | `24 chats`, context counts, every client result/table/action, Tally/GSTR and MSME samples | `index.html:5570-6216` |
| Assistant / agent | Every connection time, record count, match rate, amount, dispatch result, and “manual equivalent” | `index.html:6273-6589` |
| Tally | All summaries, alerts, ROI/time-saved comparisons, balances, stock, vouchers, reconciliation, and client-switch data | `index.html:6631-6856,7865-7881` |
| GST | `6 GSTINs`, liabilities, risk, alerts, filing states, match rates, reconciliation values | `index.html:6868-6970` |
| Income Tax | Client counts, `₹8.4L`, mismatches/refund, `14.6s`, filing/26AS/ITR values | `index.html:6981-7077` |
| MCA | Entity/director/KYC/return counts, `8.4s`, filing states, DIN table | `index.html:7088-7180` |
| Communications | `12 messages`, `6 clients`, `3 briefings`, `2 reminders`, `1.5h`, receipts, delivery/open states, scheduled reminders | `index.html:7190-7268` |
| Settings | `6 clients · 4 partners`; five-step walkthrough | `index.html:7328,7335-7347` |
| Help | `~8s` generation; risk score `0–10`, `>7`, 30-day trend | `index.html:9795-9796` |
| Onboarding | Turnover, feeds/actions/filings/ROI, staged invoice/action claims, connector metrics, simulated scan trace | `index.html:9900-10109` |
| API handlers | All returned business records are object literals; only timestamps vary | `api/tally/company.js:7-116`, `ledgers.js:9-40`, `reconcile.js:9-45`, `stock-items.js:9-37`, `vouchers.js:9-34` |

### Static source-attributed copy

These sections name a source but are still embedded copy rather than verified
runtime records:

- Regulation feed legal claims: `index.html:4915-5028`
- Regulation modals: `index.html:7364-7736`
- Briefing “Generated from” labels: `index.html:5272-5548`
- Chat source labels: `index.html:5751-6200`
- Calendar statute/form bodies: `index.html:8024-8033,8338-8363`

Confidence scores, processing times, client-match counts, financial impact,
client-book values, and portal statuses remain unsourced.

### Visible Demo and Sample labels

CSS-generated label:

- “Sample” ribbon on five client cards: `index.html:1680`

Visible source locations:

- Shell/Home:
  `index.html:4400,4432-4433,4451,4454,4485,4487,4490,4495,4501,4511,4576`
- Clients:
  `index.html:4603,4642,4653,4667,4681,4695,4709,4723`
- Client detail/Calendar:
  `index.html:5082,5101-5102,5128,5136,5155`
- Chat:
  `index.html:5720,5844,5861,5901,5919`
- Agent/API sandbox:
  `index.html:6237,6355,6474,6601`
- Tally/GST:
  `index.html:6627,6631,6633,6852,6870`
- Communications:
  `index.html:7187,7194,7241`
- Settings:
  `index.html:7286,7294,7302,7310,7318`
- Interaction-generated alerts/activity:
  `index.html:8268,8710,8731,8799-8800,8824-8827,9038`
- Onboarding:
  `index.html:9900,9907,10081`

### Internal contradictions

- Home says `49` sample feeds at `index.html:4511`; client cards total 65 at
  `index.html:4653,4667,4681,4695,4709,4723`.
- Home says `12` pending actions at `index.html:4514`; client cards total 13.
- Briefings disagree: nav `6` (`4375`), Home `8` (`4519`), Briefings `7`
  (`5218,5261`), and nine rendered cards (`5264-5553`).
- Chat says `24 chats` at `5570`, renders 25 sidebar items, and has nine thread
  bodies.
- Client/Tally identity alternates between Greenfield and Priya.
- Tally reconciliation conflicts:
  API `98.1% / ₹21,600`, sandbox `89.9% / ₹84,330`, screen
  `98.1% / ₹21,600`.
- Sharma GSTIN differs between API/UI (`27AAACS...`) and sandbox
  (`27AABCS...` at `index.html:7923`).

## 4. Token sprawl

### Counting method

- Hex regex:
  `(?<![A-Za-z0-9_&-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![A-Za-z0-9_-])`
- Functional colors:
  `\brgba?\(\s*[^)]*?\)`
- Declaration regexes:
  `\bfont-size\s*:\s*([^;}"']+)`, with equivalent expressions for
  `border-radius` and `box-shadow`
- Values were lowercased and whitespace-normalized.
- `#RGB/#RGBA` was expanded to 8-digit RGBA; numeric rgba values were converted
  to 8-bit RGBA for canonical comparison.

### Exact counts

| Token category | Occurrences | Distinct raw values | Distinct rendered/canonical values |
|---|---:|---:|---:|
| Hex colors | 339 | 90 | 89 |
| `rgb()` | 0 | 0 | 0 |
| `rgba()` | 237 | 125 | 124 |
| All color literals | 576 | 215 | 213 |
| Font-size declarations | 437 | 23 | 23 |
| Border-radius declarations | 242 | 24 | 22 after resolving two vars |
| Box-shadow declarations | 103 | 63 | 63 source definitions |

The favicon contains three URL-encoded `%23...` colors. Decoding adds three
occurrences but no new distinct values.

Distinct font sizes:

```text
9px, 9.5px, 10px, 10.5px, 11px, 11.5px, 12px, 12.5px,
13px, 13.5px, 14px, 14.5px, 15px, 16px, 17px, 18px,
20px, 22px, 24px, 26px, 28px, 30px, 44px
```

Distinct raw border-radius values:

```text
0 0 12px 12px; 0 3px 3px 0; 3px; 4px; 5px; 6px; 7px; 8px;
9px; 10px; 11px; 12px; 12px 12px 0 0; 13px; 14px; 16px;
18px; 20px; 22px; 24px; 50%; 999px; var(--radius);
var(--radius-lg)
```

Radius declarations are 220 hardcoded and 22 token references. Shadow
declarations comprise 59 distinct literal recipes across 76 occurrences,
three token references across 25 occurrences, and `none` twice. Five shadow
tokens are defined at `index.html:37-40,49`; two are unused.

Representative sprawl:

- Root colors/radii/shadows: `index.html:13-49`
- Hardcoded brand glow: `index.html:131`
- Card shadow: `index.html:476`
- Modal shadow: `index.html:736`
- 44px type: `index.html:3991`
- Radius variants: `index.html:100,127,243,313,734,1043,1453`

## 5. Semantic and accessibility violations

### Nonsemantic click targets

- 76 direct `<div onclick>` patterns.
- 0 direct `<span onclick>` patterns.
- All 76 lack `role`, `tabindex`, and element-level keyboard handling.
- Seven are propagation-only `.ai-reasoning` wrappers.
- 69 trigger an action, including backdrop dismissal.
- Two are JavaScript templates that expand to a variable number of calendar
  elements.

An additional 32 static nonsemantic targets are wired in JavaScript:

- Six `.nav-btn` divs:
  `index.html:4368-4393`, binding at `7793-7798`
- Seven `.filter-btn` spans:
  `index.html:4872-4878`, binding at `7810-7815`
- Twelve `.ai-conflict-card` divs:
  first at `index.html:4883`, binding at `9542-9545`
- Seven `.modal-bg` divs:
  `index.html:7359,7432,7475,7533,7578,7630,7682`, binding at `7803-7805`

Total: 108 statically traceable nonsemantic click targets/patterns. Excluding
seven stop-propagation wrappers and twelve backdrop containers leaves 89
button/link-like targets that should be native controls.

Examples:

- Client card: `index.html:4641`
- Work item: `index.html:4745`
- Feed filter span: `index.html:4872`
- Chat thread div: `index.html:5575`
- Settings item: `index.html:7280`
- Onboarding tile: `index.html:9855`

### Landmarks and headings

- `<main>`: 1 at `index.html:4404`
- `<nav>`: 1 at `index.html:4367`
- `<aside>`: 1 at `index.html:4344`
- `<header>`: 1 at `index.html:4405`
- `<footer>`: 0
- Explicit landmark roles: 0

The sole header is nested inside main, so it is not a document-level banner.
The global search is not a search landmark.

Heading counts:

```text
h1: 2
h2: 14
h3: 40
h4: 29
h5: 0
h6: 0
```

Of 15 `.screen` roots:

- 14 lack a screen-specific h1.
- 12 lack any h1 or h2.
- Clients, Feed, and Chat have no heading.
- Agent and Settings begin at h3.
- Calendar, Briefings, Tally, GST, Income Tax, MCA, and Communications begin at
  h4.
- Dashboard and Client Detail begin at h2.
- Only Home contains an h1.

`#page-title` is a `<span>` at `index.html:4406`; changing its text does not
repair the heading outline.

### Images and graphics

- `<img>` elements: 0.
- `<img>` missing `alt`: 0.
- Graphics are inline SVG and require accessible-name or `aria-hidden` review;
  they are not counted as missing-alt images.

### Form labels

- 23 non-hidden controls: 15 selects, six inputs, two textareas.
- Properly associated label/name: one.
- Missing programmatically associated label or accessible name: 22 of 23.
- `label[for]` mappings: 0.
- `aria-label`/`aria-labelledby` on controls: 0.

The only associated input is the file input implicitly wrapped at
`index.html:9656-9657`.

Examples:

- Global search: `index.html:4409`
- Client search: `index.html:4607`
- Sector label/select: `index.html:4610-4611`
- Chat input: `index.html:6222`
- Agent input: `index.html:6619`
- Briefing textarea: `index.html:9690`
- Onboarding textarea: `index.html:9944`

## 6. Baseline screenshots

Eight screenshots were captured from the running product.

| Screen | Desktop | Mobile |
|---|---|---|
| Home | `docs/redesign/baseline/desktop/home-1440x900.png` | `docs/redesign/baseline/mobile/home-390x844.png` |
| Clients | `docs/redesign/baseline/desktop/clients-1440x900.png` | `docs/redesign/baseline/mobile/clients-390x844.png` |
| Assistant | `docs/redesign/baseline/desktop/assistant-1440x900.png` | `docs/redesign/baseline/mobile/assistant-390x844.png` |
| Sharma workspace | `docs/redesign/baseline/desktop/sharma-workspace-1440x900.png` | `docs/redesign/baseline/mobile/sharma-workspace-390x844.png` |

Desktop dimensions are 1440×900. Mobile dimensions are 390×844.

The mobile baselines expose a pre-existing responsive-layout failure: the
240px desktop sidebar remains permanently visible at 390px, leaving only about
150px for the application content. Text collapses into narrow vertical columns,
controls overflow, and there is no mobile navigation replacement. This is
logged in `REDESIGN-NOTES.md`; Phase 0 does not alter layout behavior.

## 7. Accessibility baseline

### Lighthouse

| Screen | Accessibility score | Failed scored audits |
|---|---:|---:|
| Home | 80 | 4 |
| Clients | 76 | 4 |
| Assistant | 87 | 2 |
| Sharma workspace | 82 | 3 |

Failed Lighthouse audits:

- Home: prohibited ARIA attribute; unnamed button; insufficient contrast;
  heading order.
- Clients: prohibited ARIA attribute; unnamed button; insufficient contrast;
  unnamed selects.
- Assistant: prohibited ARIA attribute; unnamed button.
- Sharma: prohibited ARIA attribute; unnamed button; insufficient contrast.

### axe-core

| Screen | Violation rules | Affected nodes | Incomplete rules | Passing rules |
|---|---:|---:|---:|---:|
| Home | 4 | 5 | 1 | 28 |
| Clients | 4 | 13 | 1 | 28 |
| Assistant | 4 | 5 | 1 | 28 |
| Sharma workspace | 4 | 7 | 1 | 28 |

Home violations:

- `aria-prohibited-attr` — serious, one node
- `button-name` — critical, one node
- `color-contrast` — serious, two nodes
- `heading-order` — moderate, one node

Clients violations:

- `aria-prohibited-attr` — serious, one node
- `button-name` — critical, one node
- `color-contrast` — serious, eight nodes
- `select-name` — critical, three nodes

Assistant violations:

- `aria-prohibited-attr` — serious, one node
- `button-name` — critical, one node
- `color-contrast` — serious, one node
- `scrollable-region-focusable` — serious, two nodes

Sharma workspace violations:

- `aria-prohibited-attr` — serious, one node
- `button-name` — critical, one node
- `color-contrast` — serious, four nodes
- `empty-heading` — minor, one node

Raw Lighthouse and axe JSON files are stored in
`docs/redesign/baseline/audits/`.

Automated tools detect only part of the accessibility surface. The semantic
source audit above identifies additional keyboard and landmark problems not
fully represented in these scores.

## 8. Highest-uncertainty finding

The highest-uncertainty decision is architectural: whether to improve the
existing static prototype in place or migrate it to the target Next.js /
TypeScript stack before visual phases.

An in-place redesign is faster and can satisfy visual, credibility, and much
of the accessibility scope. The later requirements for route persistence,
component primitives, strict TypeScript, TanStack Table, Playwright/axe CI, and
maintainable product growth are substantially easier after a migration.

That decision changes the cost and shape of every phase after Phase 1 and must
be resolved at Gate A.
