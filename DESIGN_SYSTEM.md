# RegMitra Design System

The rules established in the 2026-08-06 audit pass. Source of truth is
[`src/app/tokens.css`](src/app/tokens.css) — this document explains *why*, the token
file is *what*. If the two disagree, the token file wins and this doc is stale.

**Applies fully to:** the public site (`src/app/(site)/**`, `marketing.css`).
**Applies aspirationally to:** the signed-in product (`(app)/**`, `globals.css`) — mid-migration, see [DESIGN_AUDIT.md](DESIGN_AUDIT.md) §9.

---

## The one rule

**When in doubt, choose restraint.** Fewer colours, fewer sizes, fewer weights, more
whitespace, quieter borders. If you are about to add a token, first prove that no
existing step works.

Reference bar: **Stripe** for the marketing surfaces (generous type, confident
whitespace, colour used sparingly), **Linear** for dense product surfaces (tight rows,
hairline borders, fast subtle motion).

---

## Brand

Editorial, not SaaS-generic. Newsreader serif for display, Plus Jakarta Sans for UI.
Paper ground (`--paper`), never pure white pages. **Forest green is an accent, not a
background** — buttons, kickers, numerals, the single dark closing band. Do not
re-darken marketing section grounds; that decision was made deliberately on
2026-08-03 and reversing it cascades into the product.

---

## Type

### Scale — 9 UI steps, 3 display steps
| Token | px | Use |
|---|---|---|
| `--text-3xs` | 10 | Mock-up chrome only. Never real copy. |
| `--text-2xs` | 11 | Eyebrows, dense labels |
| `--text-xs` | 12 | Captions, footnotes |
| `--text-sm` | 13 | Dense UI, table cells |
| `--text-md` | 15 | Default UI — buttons, labels, nav |
| `--text-base` | 17 | Body copy, ledes |
| `--text-lg` | 20 | Card titles, small serif headings |
| `--text-xl` | 24 | Section subheads |
| `--text-2xl` | 32 | Section heads |
| `--display-sm` | 28→36 | Large section heads |
| `--display-md` | 36→52 | **h1 for full-sentence headlines** |
| `--display-lg` | 44→64 | **h1 for short editorial headlines** |

**No raw `px` font sizes.** Half-pixel sizes (`13.5px`, `14.5px`) are banned outright —
they were the single biggest source of drift before this pass.

### Which h1 tier?
Two tiers, chosen by headline length, not by page importance:
- **`--display-lg`** — short, punchy, ≤6 words. *"Try it free for 7 days."*
- **`--display-md`** — a full sentence. *"Indian regulatory intelligence for CA practices and compliance professionals."*

### Weights — three, and only three
| Token | Value | Use |
|---|---|---|
| `--weight-normal` | 400 | Body, and **all** editorial-serif display type |
| `--weight-medium` | 550 | Labels, nav, secondary emphasis |
| `--weight-bold` | 700 | Buttons, headings, kickers |

The variable font tempts you to type `620` or `750`. Those are indistinguishable from
their neighbours and were 15 distinct weights before this pass. Three.

### Line height & tracking
`--leading-display` 1.04 · `--leading-tight` 1.25 · `--leading-body` 1.6 · `--leading-loose` 1.7
`--tracking-display` -0.038em · `--tracking-tight` -0.015em · `--tracking-normal` -0.006em · `--tracking-caps` 0.16em

Large serif headlines get negative tracking; uppercase kickers get positive. Never the reverse.

### Text colour — four, not twelve
`--ink-950` primary · `--ink-600` body/muted · `--ink-500` supporting · `--ink-400` disabled.

---

## Colour

One neutral ramp, one accent, semantic colours **for meaning only**.

- **Neutrals** — `--ink-950/800/600/500/400`, `--paper`, `--surface`, `--surface-muted`, `--surface-hover`, `--line`, `--line-strong`
- **Accent** — `--forest-950/900/800`, `--green-700/600/100`
- **Semantic** — amber (warning), red (error), blue (info). Each has a `-700` (text/border) and `-100` (fill). **Never use these decoratively.**

No raw hex in stylesheets. The only survivors are inside the product mock-ups on
`/features`, which imitate a dark app UI and are documented as such.

---

## Shape & depth

| Token | px | Use |
|---|---|---|
| `--radius-xs` | 4 | Chips, inline tags |
| `--radius-sm` | 8 | Buttons, inputs |
| `--radius-md` | 12 | Cards, panels |
| `--radius-lg` | 18 | Feature blocks, large surfaces |
| `--radius-full` | 999 | Pills, avatars |

> `--radius-md` and `--radius-lg` are **pinned to 10px in `:root`** for the un-migrated
> app and overridden to their real values on `.public-site`. Deleting that override is
> the final step of the app migration.

**This system is flat.** Depth comes from hairline borders, not shadows. `--shadow-overlay`
exists for true floating overlays only. Never mix a border and a shadow on the same element
to create emphasis — pick one.

Sibling elements must share a radius. A card at 12px containing a button at 8px is
correct; two buttons at 8px and 9px is not.

---

## Spacing

4px rhythm: `--space-1` (4) through `--space-24` (96). **Every** margin, padding and gap
is a step on it. Related items closer than unrelated items.

### Page shell — one width, one gutter, every page
```
--shell-max: 1280px
--shell-gutter: clamp(20px, 5vw, 76px)
--shell-top / --shell-bottom / --section-gap
```
Before this pass there were three shells (1344/1280/1200) and four gutter formulas, so
content jumped up to 280px horizontally when navigating between pages. **Every page
wrapper uses these tokens.** If a page needs a narrower measure, constrain the *content*
(`max-width: 58ch` on a paragraph), never the shell.

---

## Motion

Three durations, one easing.

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | Colour and opacity on hover |
| `--duration-standard` | 160ms | Transforms, small reveals |
| `--duration-slow` | 320ms | Panels, accordions, entrances |

`--ease-out: cubic-bezier(.2,.8,.2,1)` for everything.

**Buttons press, they do not hop.** A `translateY(-1px)` hover lift is banned — it reads
as a template default and jitters against tight type. Hover changes colour; `:active`
presses `0.5px`.

Every animation must be disabled under `prefers-reduced-motion: reduce`.

---

## States

Every interactive element needs hover, `:active`, `:focus-visible` and disabled.

**Focus is non-negotiable.** `.public-site :focus-visible` applies `--focus-ring`
(2px `--green-600`) at `--focus-offset` to everything. Never `outline: none` without a
replacement in the same rule.

Tap targets ≥ 40×44px. Buttons are `min-height: 44px`; the header CTA is 38px because it
sits in a 72px bar with its own padding.

---

## Components

**Buttons** (`.marketing-button`) — 44px min-height, `--radius-sm`, `--text-md`,
`--weight-bold`, 18px inline padding, 8px icon gap. Variants: `.primary` (forest fill),
`.quiet` (hairline), `.light` (on dark grounds), `.wide` (full-width, centred).
The same variant must look identical on every page.

**Icons** — inline SVG only. One stroke width (1.4), sized 12/16/20/24. Never an emoji,
never an icon font, never a text glyph like `↗` (it cannot be optically aligned).

**Inputs** — identical height, border, radius, focus treatment across the site.

---

## Z-index

Named steps, so stacking can be reasoned about without grepping:
`--z-base` 1 · `--z-sticky` 20 · `--z-header` 40 · `--z-dropdown` 60 · `--z-overlay` 80 · `--z-modal` 100 · `--z-toast` 120.

Never write a raw z-index. `z-index: 41` next to `z-index: 40` is how the wars start.

---

## Breakpoints

Four. CSS custom properties cannot be used in media queries, so these are typed by hand:

| px | Meaning |
|---|---|
| 600 | Phone |
| 900 | Tablet / stacked |
| 1100 | Small laptop |
| 1440 | Large desktop |

Do not add a fifth without a reason worth writing down. There were eight before this pass.

**Verify at 320/375/768/1024/1440/1920 before shipping.** Zero horizontal overflow is a
hard requirement — the check is `document.documentElement.scrollWidth > clientWidth`.

> Grid gotcha that caused the one real overflow bug on this site: grid items default to
> `min-width: auto`, so a track cannot shrink below its content's min-content width. Use
> `minmax(0, 1fr)` and `min-width: 0` on grid children that contain wide content.
