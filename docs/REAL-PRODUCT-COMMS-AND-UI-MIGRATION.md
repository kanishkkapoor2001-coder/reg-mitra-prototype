# Reg Mitra real-product communications and UI migration

**Status:** Approved execution brief  
**Applies to:** The authenticated Reg Mitra product  
**Companion brief:** `MARKETING-MESSAGING-AND-VISUAL-EXECUTION-BRIEF.md`  
**Goal:** Make the public site, sample workspace, and real product feel like one trustworthy system.

---

## 1. Product experience to create

The product should feel like a calm professional review desk, not an AI dashboard.

The interface must make this chain visible:

> **Official source → recorded client facts → applicability review → internal draft → professional approval**

Every screen should help the user answer at least one of these questions:

1. What changed?
2. Which client may be affected?
3. What evidence supports that?
4. What information is missing?
5. What should be prepared next?
6. Who must review it?

The user should never have to infer whether something is sourced, assumed, drafted, reviewed, or completed.

### Named design references

- **Linear:** quiet density, disciplined hierarchy, fast navigation, and clear task states.
- **Stripe:** evidence-first explanation, editorial typography, excellent empty states, and progressive disclosure.

Use their principles, not their pixels.

---

## 2. Non-negotiable product truths

The authenticated product must use the same truthful language as the website.

### Supported language

- Selected official sources
- Official source
- Full text indexed
- Source page reachable
- Recorded client facts
- Missing client fact
- May apply
- Applicability not reviewed
- Source reviewed
- Internal draft
- Draft awaiting review
- Professional review required
- Mark reviewed
- Sample workspace
- Sample data

### Language to remove

- Verified source
- Verified answer
- Live feed
- Always current
- Complete coverage
- Exactly which clients
- The right clients
- Client-ready
- Completed, when the actual state is only drafted
- Sent, submitted, filed, or paid unless an external action really occurred
- AI-powered as the main explanation of value

### State rule

Never use one badge to combine several different facts.

For example, do not show **Verified** when the interface actually means one or more of:

- the URL opened;
- the full text was indexed;
- a person reviewed the source;
- a client fact was confirmed;
- an applicability conclusion was approved.

Show those as separate states.

---

## 3. One design system across website and product

Do not create a new palette or a second component library. Reuse the existing tokens in `src/app/tokens.css`.

### Core tokens

| Purpose | Token |
| --- | --- |
| Main canvas | `--paper` |
| Main surface | `--surface` |
| Secondary surface | `--surface-muted` |
| Primary text | `--ink-950` |
| Supporting text | `--ink-600` |
| Hairline border | `--line` |
| Strong border | `--line-strong` |
| Primary action | `--forest-900` |
| Primary-action hover | `--forest-800` |
| Positive state | `--green-700`, `--green-100` |
| Attention state | `--amber-700`, `--amber-100` |
| Blocking state | `--red-700`, `--red-100` |
| Informational state | `--blue-700`, `--blue-100` |

### Visual rules

- Use warm paper for the workspace canvas and white for active work surfaces.
- Use forest only for primary actions, active navigation, and the most important selected state.
- Use semantic colours only when they communicate status.
- Prefer hairline borders over shadows.
- Use the existing 4px spacing rhythm.
- Keep radii between 6px and 10px.
- Avoid floating-card overload. Related information should share one structured surface.
- Use tabular numerals for dates, counts, deadlines, and amounts.
- Use icons from the existing icon set. Never use emoji as interface icons.
- Motion must be functional, 120–180ms, and disabled when reduced motion is requested.

### Typography

- Product UI remains primarily sans-serif for speed and density.
- Editorial display type may appear only in high-value reading moments:
  - a regulatory-update title;
  - a briefing cover/title;
  - a major empty-state statement;
  - a source-reading panel.
- Do not use display type inside tables, filters, buttons, badges, or navigation.

---

## 4. Product information architecture

Keep the primary navigation short.

### Primary navigation

1. **Today**
2. **Clients**
3. **Assistant**

### Persistent top-bar actions

- Global search / command palette
- Calendar
- User menu

### Secondary navigation under “More”

- Briefings
- Regulations
- Settings
- Billing
- Appearance

This structure is correct. Do not add every feature to the sidebar.

### Label changes

| Current or possible label | Use |
| --- | --- |
| Ask Reg Mitra | Assistant |
| Regulatory intelligence | Regulatory research |
| Trial and subscription | Pilot and account |
| Updates and sources | Official sources and updates |
| Drafts awaiting review | Internal drafts and review |
| Sources and policy | Sources, team, and review policy |

Change the sidebar subtitle from:

> Regulatory intelligence

to:

> Regulatory research

---

## 5. Shared product shell changes

### Sidebar

- Reduce visual contrast between inactive items and the sidebar.
- Keep one slim active-state indicator.
- Remove decorative green from the logo mark; use it only as a controlled accent.
- Keep the firm card anchored at the bottom.
- Make the active item obvious without making every item look like a button.
- Add badges only for counts that require action. Never use a badge for decoration.

### Top bar

Change the search placeholder from:

> Search pages and clients

to:

> Search clients, sources, and drafts

The command palette should return mixed results grouped under:

- Clients
- Sources
- Drafts
- Pages

Calendar remains a direct top-bar action because it is a frequent professional workflow.

### Page layout

Use one repeatable page anatomy:

1. Eyebrow or breadcrumb
2. Clear page title
3. One-sentence operational explanation
4. Primary action
5. Summary or filters
6. Main work surface

Recommended dimensions:

- Maximum reading width: 760px
- Maximum general content width: 1180px
- Desktop page gutters: 32px
- Mobile page gutters: 16px
- Dense table row: 44–52px
- Reading/draft row: 60–76px

---

## 6. Today screen

### Purpose

Today is not a general dashboard. It is the reviewer’s prioritised work queue.

### Recommended copy

**Eyebrow**

> Today · Review queue

**Headline when action exists**

> 3 items need your decision

**Supporting copy**

> Start with the highest-priority exception. Everything else can wait.

**Headline when clear**

> You’re clear for now

**Supporting copy when clear**

> No unreviewed client-impact decisions are currently assigned to you.

### Summary strip

Use:

- Open items
- Need a decision
- Sources reviewed

Do not present these as oversized KPI cards. Use one quiet horizontal summary strip.

### Queue-item anatomy

Each queue item must show, without expansion:

- priority;
- action-oriented title;
- client;
- authority;
- deadline or timing;
- evidence state;
- review state.

Expanded detail should answer:

- Why is this in my queue?
- What source supports it?
- What client fact is relevant?
- What fact is missing?
- What is the proposed next step?

### Actions

Use:

- Open client
- Prepare review
- Mark reviewed

Do not use:

- Resolve
- Complete
- Approve automatically

“Mark reviewed” records that the reviewer handled the queue item. It must not imply that a filing or client communication occurred.

---

## 7. Clients screen

### Purpose

Clients should answer:

> Where does the firm need to review impact, request information, or prepare work?

### Page header

**Title**

> Clients

**Supporting copy**

> Review recorded client facts, possible regulatory impact, and open work.

**Primary action**

> Add client

### Default list

Use a dense table or structured list, not a wall of cards.

Recommended columns:

- Client
- Entity type
- Sector
- Possible impacts
- Missing facts
- Open work
- Next deadline
- Owner

### Filters

Keep filters stable across sessions:

- Owner
- Sector
- Entity type
- Impact state
- Missing facts
- Deadline

The department tags used in newsletters should map to the same controlled vocabulary used here. Do not let each screen invent different labels.

### Client profile

The top section should show:

- client identity;
- entity type;
- sector;
- assigned owner;
- completeness of recorded facts;
- next deadline;
- open review items.

Then use four tabs:

1. Overview
2. Impact review
3. Work
4. Activity

#### Overview

- Recorded facts
- Missing facts
- Recurring obligations
- Recent source-linked activity

#### Impact review

Each impact record should show:

- source title and authority;
- publication/effective date;
- why it may apply;
- facts used;
- missing facts;
- applicability status;
- reviewer;
- link to the official source.

#### Work

- Internal drafts
- Tasks
- Deadlines
- Review status

#### Activity

- Audit trail
- Fact changes
- Review decisions
- Draft changes

Remove any invented numerical “risk score”. Show concrete reasons and states instead.

---

## 8. Assistant

### Purpose

The Assistant is a source-grounded research and preparation workspace. It is not a chatbot personality.

### Modes

Use two explicit modes:

1. **Answer**
2. **Prepare**

#### Answer mode

Use for:

- explaining an official publication;
- comparing provisions;
- finding a cited answer;
- identifying uncertainty;
- listing facts needed for applicability.

#### Prepare mode

Use for:

- internal briefing;
- client information request;
- checklist;
- task list;
- calendar proposal;
- internal client note.

### Empty state

**Title**

> Start with a source, client, or regulatory question.

**Supporting copy**

> The Assistant searches selected indexed sources and keeps citations, caveats, and missing facts visible.

Suggested prompts should be concrete:

- Summarise the July FSSAI amendment and cite the operative clauses.
- What client facts are needed to assess whether this may apply?
- Prepare an internal information request for Royal Spice.

### Response anatomy

Every answer should use this order:

1. Direct answer
2. Why it matters
3. Sources
4. Caveats and missing information
5. Possible next step

### Draft anatomy

Every prepared output should show:

- Internal draft
- Generated from
- Client context used
- Missing facts
- Review required
- Save to client
- Send for review

Never show **Client-ready** automatically.

### Source panel

The evidence panel must distinguish:

- Official source
- Full text indexed
- Source page reachable
- Source reviewed
- No source cited

Do not use a generic “confidence” percentage. If retrieval relevance is shown, label it:

> Relative search match

and keep it visually secondary.

---

## 9. Regulations and sources

### Page title

> Official sources and updates

### Supporting copy

> Search selected indexed publications, review source details, and trace updates into client work.

### Default view

Use a dense, searchable list with:

- authority;
- title;
- publication type;
- publication date;
- effective date;
- indexing state;
- review state;
- linked client-impact reviews.

### Source-reading view

Use a two-pane layout on desktop:

- Left: source list and filters
- Right: selected source details

The detail pane should show:

- title;
- authority;
- type and reference number;
- publication/effective dates;
- official-source link;
- indexing state;
- summary;
- key operative points;
- client facts that may be relevant;
- linked drafts and impact reviews.

On mobile, the detail view becomes a full-screen sheet or route.

---

## 10. Briefings

### Page title

> Internal drafts and review

### Supporting copy

> Review source-linked briefs, client requests, checklists, and proposed calendar changes.

### List states

- Draft
- Awaiting review
- Changes requested
- Reviewed
- Archived

Do not use **Sent** unless the product stores a real external-send event.

### Draft header

Show:

- draft type;
- client;
- source;
- creator;
- created/updated time;
- reviewer;
- review state.

Primary action:

> Send for review

Reviewer action:

> Mark reviewed

Secondary reviewer action:

> Request changes

---

## 11. Calendar

### Page title

> Source-linked calendar

### Supporting copy

> Review recurring obligations and selected effective dates alongside their supporting sources.

### Event states

Each event must identify whether it is:

- recurring general obligation;
- selected regulatory effective date;
- client-specific task deadline;
- proposed calendar change.

### Event detail

Show:

- event type;
- authority;
- source;
- affected client, if recorded;
- owner;
- due date;
- recurrence;
- review state;
- what the product does and does not know.

Do not imply portal status or filing completion.

---

## 12. Settings and billing

### Settings sections

- Firm
- Team and roles
- Source library
- Review policy
- Notifications
- Appearance

Change the page explanation to:

> Manage your firm, selected sources, reviewer roles, and workspace policy.

### Source library

Use:

- Indexed
- Not indexed
- Source page reachable
- Source page unavailable
- Last checked

Avoid:

- Connected, when no persistent integration exists
- Live
- Synced, unless a real sync occurred

### Billing

Until the commercial model is real, use:

**Title**

> Pilot and account

**States**

- Sample session
- Pilot requested
- Pilot active
- Pilot ended

Do not show a fictional plan, price, trial countdown, or payment state.

---

## 13. Shared component specifications

Build or standardise these primitives before polishing individual pages.

### `PageHeader`

Props:

- eyebrow
- title
- description
- primaryAction
- secondaryAction

Rules:

- one primary action maximum;
- title left aligned;
- description no wider than 680px;
- actions stack on mobile.

### `StatusBadge`

Badge families:

- Evidence
- Applicability
- Review
- Work
- Sample

Do not permit free-form badge colours. Each family has a controlled state map.

### `EvidenceStack`

Displays:

- source identity;
- official-source link;
- publication date;
- indexing state;
- source-review state;
- cited clauses.

### `MissingFact`

Shows:

- missing information;
- why it matters;
- who can provide it;
- request action.

### `ImpactRecord`

Shows:

- update;
- client;
- applicability status;
- facts used;
- missing facts;
- proposed work;
- reviewer.

### `ReviewTrail`

Shows:

- created;
- edited;
- sent for review;
- changes requested;
- reviewed;
- archived.

### `EmptyState`

Every empty state must explain:

1. what is absent;
2. why that is okay or important;
3. what the user can do next.

Do not use illustrations merely to fill space.

### `Skeleton`

Use content-shaped skeletons for loading. Do not use a full-page spinner.

---

## 14. Interaction rules

### Reduce clicks

The main daily path should be:

> Today → open item → inspect evidence → prepare review → mark reviewed

Targets:

- Open the highest-priority review: 1 click
- Reach its official source: no more than 2 clicks
- Prepare a source-linked draft: no more than 2 clicks from the item
- Return to the client record: 1 click

### Progressive disclosure

Show the decision first. Reveal supporting detail on demand.

Default visible:

- what;
- client;
- timing;
- state;
- next action.

Expandable:

- full source metadata;
- cited passages;
- activity history;
- secondary caveats.

### Inline changes

Prefer inline editing for:

- owner;
- review state;
- due date;
- client facts;
- sector and entity type.

Use a full form only for initial client creation or a complex policy change.

### Bulk actions

Add bulk actions only where the same professional action genuinely applies:

- assign owner;
- send selected drafts for review;
- archive reviewed items;
- export selected records.

Never bulk-approve applicability conclusions.

---

## 15. Responsive behaviour

### Desktop

- Persistent 248px sidebar
- Sticky top bar
- Two-pane reading views where evidence comparison benefits
- Dense lists and tables

### Tablet

- Collapsible sidebar
- Preserve table columns that drive decisions
- Move secondary metadata into expandable rows

### Mobile

- Bottom navigation for Today, Clients, and Assistant
- Calendar and More in the top bar or overflow menu
- Cards replace tables only when columns cannot remain scannable
- Sticky bottom action bar for the primary review action
- Full-screen sheets for source detail and filters

Do not simply shrink the desktop layout.

---

## 16. Accessibility and quality

Required:

- WCAG AA text contrast
- visible focus states
- keyboard access to every action and scrollable region
- meaningful button and link labels
- correct heading hierarchy
- reduced-motion support
- 44px minimum mobile touch targets
- no status communicated by colour alone
- errors announced with `role="alert"`
- empty, loading, error, disabled, hover, active, and focus states

The existing automated accessibility suite must remain at:

> **30/30 passing**

---

## 17. Recommended execution order

### Phase 1 — Truth and vocabulary

1. Replace ambiguous and inflated state language.
2. Standardise evidence, applicability, review, and work states.
3. Update navigation, headings, helper text, empty states, and buttons.
4. Ensure sample data is labelled everywhere.

### Phase 2 — Shared product primitives

1. Page header
2. Status badge families
3. Evidence stack
4. Missing-fact row
5. Impact record
6. Review trail
7. Empty state
8. Skeleton

### Phase 3 — Core workflow

1. Today
2. Client profile
3. Assistant
4. Briefings
5. Regulations
6. Calendar

### Phase 4 — Navigation and efficiency

1. Improve command palette search groups.
2. Add stable filters.
3. Add safe inline editing.
4. Add justified bulk actions.
5. Verify click counts for the main workflow.

### Phase 5 — Polish and verification

1. Desktop visual pass
2. Mobile visual pass
3. Dark-mode pass
4. Long-content and zero-state pass
5. Keyboard pass
6. Automated accessibility
7. Type check, lint, tests, and production build

---

## 18. File-level implementation map

Start here:

| Area | Files |
| --- | --- |
| Tokens | `src/app/tokens.css` |
| Shared product styles | `src/app/globals.css` |
| Product shell | `src/components/app-shell.tsx` |
| Navigation | `src/lib/navigation.ts` |
| Trust language | `src/lib/trust.ts`, `src/components/trust-badge.tsx` |
| Today | `src/components/today-experience.tsx` |
| Clients | `src/components/clients-experience.tsx`, `src/components/client-card.tsx`, `src/app/clients/[id]/page.tsx` |
| Assistant | `src/components/assistant-experience.tsx`, `src/components/evidence-panel.tsx` |
| Briefings | `src/app/briefings/page.tsx` |
| Calendar | `src/components/compliance-calendar.tsx`, `src/app/calendar.css` |
| Regulations | `src/app/regulations/page.tsx` |
| Settings | `src/app/settings/page.tsx` |
| Billing | `src/app/billing/page.tsx` |
| Command palette | `src/components/command-palette.tsx` |

---

## 19. Acceptance checklist

The migration is complete only when:

- [ ] The website and product use the same category, promise, and vocabulary.
- [ ] The authenticated product no longer leads with “AI”.
- [ ] Every important output shows its source state.
- [ ] Missing client facts are visible, not buried in prose.
- [ ] Applicability and source review are separate states.
- [ ] Drafted, reviewed, sent, filed, and completed are never conflated.
- [ ] Today behaves as a prioritised review queue.
- [ ] Client profiles connect facts, impacts, work, and activity.
- [ ] Assistant answers use direct answer → why it matters → sources → caveats → next step.
- [ ] No invented risk scores remain.
- [ ] Sample data is consistently labelled.
- [ ] Desktop, mobile, and dark mode feel intentionally designed.
- [ ] The main workflow requires fewer clicks than before.
- [ ] All automated accessibility checks pass.
- [ ] Type check, lint, tests, and production build pass.

---

## 20. Final design test

Before approving any screen, ask:

1. Can a CA understand the next decision in five seconds?
2. Can they see what is sourced and what is assumed?
3. Can they see what information is missing?
4. Can they reach the official source quickly?
5. Does the action label describe what truly happens?
6. Does this feel like the same product promised by the public website?
7. Does it look considered, or like a generic dashboard template?

If any answer is weak, the screen is not finished.

