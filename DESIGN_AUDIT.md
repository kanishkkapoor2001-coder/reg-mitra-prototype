# Design Audit — RegMitra

**Date:** 2026-08-06
**Scope audited:** all 27 pages (13 public `(site)/`, 14 signed-in `(app)/`), 29 components, 4 stylesheets (5,234 lines).
**Scope fixed in this pass:** the 13 public pages + `marketing.css` only. App-half findings are specced in §9 and left untouched — see the note there.
**Reference bar:** Stripe (editorial marketing surfaces), Linear (dense app surfaces).
**Brand direction preserved:** Newsreader serif + Plus Jakarta Sans, paper ground, forest green strictly as accent, flat/hairline depth, light sections.

Severity: **Critical** = visibly broken or damages trust on the live site · **Major** = systemic inconsistency a designer would flag immediately · **Minor** = polish.

---

## 1. Method

Findings are measured, not eyeballed. Type/colour/radius/motion inventories come from parsing the stylesheets; layout and overflow numbers come from driving all 12 reachable public pages headless at 320/375/768/1024/1440/1920px. Every number below is reproducible.

The two signed-in-only pages could not be rendered (auth wall), so app findings are static-analysis only — stated as such in §9.

---

## 2. Critical

### C1 — Content jumps horizontally when you navigate between pages
Measured left edge of first content element at 1440px:

| Page | Left edge |
|---|---|
| `/` | **100px** |
| `/pricing` `/about` `/faq` `/founder` `/newsletter` `/login` `/signup` `/start` `/onboarding` `/pending` | **166px** |
| `/features` | **380px** |

The header and footer stay put while the body content shifts up to 280px. Root cause is three competing page shells and four gutter formulas:

- `.marketing-hero` / `.public-header` / `.public-footer` — `max-width: 1344px`, gutter `clamp(24px, 4vw, 52px)` — [marketing.css:64](src/app/marketing.css:64)
- `.editorial-page` — `max-width: 1280px`, gutter `clamp(24px, 6vw, 90px)` — [marketing.css:804](src/app/marketing.css:804)
- `.login-page` — `max-width: 1280px`, gutter `clamp(24px, 6vw, 90px)` — [marketing.css:880](src/app/marketing.css:880)
- `.features-hero` — `max-width: 760px`, flat `40px` gutter, centred — [marketing.css:1029](src/app/marketing.css:1029)

**Fix:** one shell token, one gutter formula, applied to every page wrapper.

### C2 — `/features` overflows horizontally on phones
`scrollWidth` exceeds `clientWidth` by **+127px at 320px** and **+72px at 375px**. Every other page is clean at all six widths. The page is genuinely broken on a small phone — sideways scroll, content cut off.

Origin: `.features-hero` keeps a flat `40px` inline padding while the demo blocks below assume a wider track — [marketing.css:1029](src/app/marketing.css:1029), [marketing.css:1033](src/app/marketing.css:1033).

### C3 — No favicon exists at all
- No `public/` directory in the project
- No `icon.*` / `favicon.*` / `apple-icon.*` anywhere in `src/app/`
- No `<link rel="icon">` in the served HTML
- **`https://regmitra.in/favicon.ico` returns 404 in production**

Every browser tab, bookmark and link preview for the paid product currently shows a blank page glyph.

---

## 3. Major — Typography

### M1 — Fifteen distinct font weights
The variable font is being dialled freehand rather than used on a scale.

- `marketing.css` — 9 weights: `400, 450, 500, 550, 600, 650, 700, 750, 800`
- `globals.css` — 12 weights: `500, 520, 560, 600, 620, 650, 680, 700, 750, 760, 800, 850`

`520` vs `560`, `750` vs `760`, `650` vs `680` are not perceptible differences — they are noise. Target is 3.

### M2 — Thirty-one font sizes on the site, including half-pixels
`marketing.css`: `8.5, 9, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 17, 18, 20, 21, 22, 23, 24, 26, 28, 32, 38, 42, 46, 50, 52, 54`
`globals.css`: 25 more, including `16.5`.

A type scale already exists in `tokens.css` (`--text-2xs` … `--text-3xl`) and is almost entirely unused by `marketing.css`.

### M7 — Five different h1 treatments across 12 pages
Measured at 1440px:

| Pages | size | line-height | tracking |
|---|---|---|---|
| `/pricing` `/about` `/faq` `/pending` | 82px | 86.1px | -2.87px |
| `/features` | 60px | 61.8px | -2.1px |
| `/newsletter` | 56px | 56px | -2.35px |
| `/founder` `/login` `/signup` `/start` `/onboarding` | 52px | 54.6px | -1.98px |
| `/` | 50px | 52px | -1.9px |

The 82px editorial group is now the outlier — the homepage, the most important page, has the *smallest* h1 on the site.

---

## 4. Major — Colour

### M5 — 138 hardcoded hex values against a 23-colour token file
| File | Distinct hex |
|---|---|
| `tokens.css` (the intended palette) | 23 |
| `globals.css` | **138** |
| `marketing.css` | 10 |
| `calendar.css` | 8 |

`marketing.css` is close to clean. `globals.css` is where "three slightly different greys" lives. Its ten site-side strays are all in the demo mock-ups: `#a8d5b7` (×8), `#f4f0df`, `#f2c9bd`, `#e6a08c`, `#ecd9a8`, `#e6c78c`, `#dce7df`, `#c2624e`, `#b1503b`, `#9bc9ac`.

### M4 — The token file itself has no scale
Three names resolve to one value, so the "scale" carries no information:

```
--radius-md: 10px;  --radius-lg: 10px;  --radius-xl: 10px;   /* identical */
--shadow-sm: none;  --shadow-md: none;                        /* identical */
--text-2xs: 0.75rem; --text-xs: 0.75rem;                      /* identical */
```
[tokens.css:44](src/app/tokens.css:44)

Picking `--radius-lg` over `--radius-md` today is a coin flip that silently becomes a real difference the day someone changes one.

---

## 5. Major — Shape, depth, motion

### M3 — Radii are freehand
`marketing.css` uses effectively every integer from 2 to 18 (`2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18`) plus `999px` and `50%`. `globals.css` adds asymmetric one-offs: `13px 13px 3px 13px`, `10px 12px 3px 12px`, `14px 14px 4px 14px`, `0 3px 3px 0`, `0 7px 7px 0`.

Sibling elements on the same card can differ by 1–2px — below conscious notice, above the threshold that makes a screen feel unresolved.

### M6 — Fourteen transition durations
`marketing.css`: `45, 70, 90, 135, 160, 180, 220, 225, 240, 260, 280, 420, 480ms`.
`220` vs `225` and `240` vs `260` are indistinguishable to the eye. `tokens.css` defines exactly two durations (`--duration-fast: 120ms`, `--duration-standard: 160ms`) and they are barely referenced.

### M8 — z-index is untokenized
`globals.css`: `1, 20, 35, 40, 41, 100` · `marketing.css`: `0, 1, 2, 5, 10`.
`40` next to `41` is the start of a z-index war. No scale, no names, no way to reason about stacking without grepping.

---

## 6. Major — Responsive

### M9 — Eight breakpoints, inconsistently shared
`marketing.css`: `560, 600, 720, 760, 860, 900, 1100`
`globals.css`: `720, 760, 820, 900, 1100`

Only `720 / 760 / 900 / 1100` are common. `560`, `600`, `860` and `820` are one-offs. Nothing targets 1440 or 1920, so on a large display the layout simply stops adapting above 1344px.

---

## 7. Minor

- **m1 — Missing page metadata.** `(site)/page.tsx` (the homepage), `(site)/login/page.tsx` and `(site)/onboarding/page.tsx` have no `export const metadata`, so they fall back to the root title. The homepage in particular should own its title and description.
- **m2 — Focus-visible coverage is thin.** 9 occurrences in `marketing.css`, 8 in `globals.css`, against a far larger population of links, buttons, inputs and radios. Keyboard users lose the ring on most surfaces.
- **m3 — `.marketing-button.light` had no hover state** before this pass (base colours only), so the button on the dark CTA band was inert on hover. Fixed.
- **m4 — Dead CSS.** `.tier-soon-pill` (`min-height: 52px`) is styled but rendered nowhere; `.hero-rotator*` rules survive the removal of the rotating word from the homepage.

**Verified healthy — not findings:** `::selection` is themed to `--forest-800` and `-webkit-font-smoothing: antialiased` is set ([globals.css:7](src/app/globals.css:7), [globals.css:14](src/app/globals.css:14)); both apply site-wide because the root layout imports `globals.css` for every route. No horizontal overflow on 11 of 12 public pages at any of the six widths tested. One icon approach throughout (inline SVG, no icon-font/emoji mixing).

---

## 8. Results — public site (this pass)

All verified by re-running the same measurements.

| # | Finding | Before | After |
|---|---|---|---|
| 1 | C1 content edge | 100 / 166 / 380px | **152px on all 12 pages** |
| 2 | C2 `/features` overflow | +127px @320, +72px @375 | **0 overflow, 72/72 page×breakpoint combos clean** |
| 3 | C3 favicon | 404 in production | `icon.svg` served, `<link rel="icon">` emitted |
| 4 | M4 duplicate tokens | 3 names → 1 value (×3) | every token distinct |
| 5 | M1 font weights | 9 on the site | **3** — zero raw weights remain |
| 6 | M2 font sizes | 31, incl. 7 half-pixels | **9 UI + 3 display** — zero raw sizes remain |
| 7 | M3 radii | ~20 freehand values | **4 + full** — zero raw radii remain |
| 8 | M6 durations | 14 | **3** — zero raw `ms` remain |
| 9 | M7 h1 treatments | 5 sizes, tracking -1.9 → -2.87 | **2 tiers** (52px sentence / 64px editorial) |
| 10 | M8 z-index | 5 raw values | 7 named tokens |
| 11 | M9 breakpoints | 7 on the site | 4 |
| 12 | m1 metadata | 3 pages missing | all present |
| 13 | m2 focus | 9 selectors | one `:focus-visible` baseline covering the site |
| 14 | m4 dead CSS | `.tier-soon-pill`, `.hero-rotator*` | removed |

Two judgement calls worth recording:

- **`/features` was centred at 760px** while every other page is left-aligned in the shell. Centring it was the reason its content sat 260px off the site's column, so it is now left-aligned on the shell. This is a visual change beyond pure consistency, made because "everything centred" was the actual defect.
- **The app's radii are pinned, not migrated.** `globals.css` consumes `--radius-md` (×25) and `--radius-lg` (×9). Changing them to the new scale would have silently restyled 34 app surfaces that cannot be visually verified behind the auth wall, so both are pinned at their original `10px` in `:root` and the real scale is scoped to `.public-site`. **Deleting that override is the last step of the app migration.**

## 9. App half — specced, deliberately not touched

`globals.css` (2,653 lines, 138 hex, 25 sizes, 12 weights, 18 radii) and the 14 `(app)/` pages carry the larger share of the debt. They are excluded from this pass for two reasons:

1. **All 14 pages sit behind auth**, so a refactor there could not be visually verified — 138 colour substitutions applied blind to a live product is not a defensible change.
2. It is the lane another session has been actively building in today (wedge phases 1–5, shipped to production this afternoon).

Recommended sequencing when it is picked up, in dependency order:

1. Land the shared token file from this pass first — it is the contract both stylesheets consume.
2. Colour: map all 138 hex values onto the neutral ramp + accent + semantic tokens. Expect ~40 genuine duplicates to collapse.
3. Weights: 12 → 3. Highest visual payoff per line changed.
4. Radii and z-index onto the scales.
5. Component sweep: buttons, inputs, cards, tables, badges — the app has no shared primitives, so each is styled per-screen and drifts.
6. States: empty, loading, error per screen — needs a signed-in session to do honestly.

**To do it properly I need a way into the product** — a test account or a magic link. Without one the work is guesswork.
