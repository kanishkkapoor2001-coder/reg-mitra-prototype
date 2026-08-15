# product/ — the RegMitra website AND the logged-in product

This one Next.js app is BOTH the marketing website (`/`, `/pricing`, `/about`, `/features`…) and the signed-in product (`/assistant`, `/clients`, `/today`, `/calendar`…). A CA reaches the product from the website, so they live together here on purpose.

- Deploys to Vercel project **`reg-mitra-migration`** → https://reg-mitra-migration.vercel.app
- Working branch: **`chatbot/overhaul`**
- This is NOT the demo. The frozen demo is `../demo-FROZEN/` — never touch it for product/website work.
- Newsletter is a separate app in `../newsletter/`.

Before deploying, `pwd` to confirm you're in `product/`. See `../CLAUDE.md` for the full workspace map.

## Running it locally

`preview_start` fails on this path (sandbox EPERM reading Desktop). Run the binary directly, sandbox disabled:

```bash
cd product && ./node_modules/.bin/next dev -p 3007
```

Port 3000 is usually taken by an unrelated app. `npx next` fails with exit 127 — use `./node_modules/.bin/next`.

### Opening the signed-in product locally

`.env.local` points at a placeholder Supabase (`local-dev.supabase.co`), so `auth.getUser()` can never
return a user and every gated route redirects to `/login`. Two `.env.local` flags open it for local work:

```
REGMITRA_DEV_AUTH=1              # skips auth/approval/workspace in the proxy
REGMITRA_DISABLE_RATE_LIMIT=true # lets the 65-case answer eval past the 40/hr cap
```

Both are **double-gated on `NODE_ENV !== "production"`**, so they are inert on Vercel — see
`src/lib/auth/dev-bypass.ts` and `src/lib/rate-limit.ts`. `src/lib/auth/dev-bypass.test.ts` locks that
property; do not loosen it. Without `REGMITRA_DEV_AUTH`, `scripts/evaluate-assistant-answers.mjs`
silently cannot run — it POSTs to `/api/chat` and gets the login redirect back as `HTTP 200`.

Note these only get you *past the gate*. There is still no local database, so `getCurrentWorkspace()`
returns null and pages render their sample branch. To see the product against **real** data, use
`/founder` with `FOUNDER_ACCESS_CODE` on the deployed site.

## Keeping it fast (enforced by `src/lib/snappiness.test.ts`)

The app must feel native, and that property decays one commit at a time. Three rules,
each enforced by a failing test if broken:

1. **Mutations are optimistic.** Update client state first, `fetch()` behind it, revert
   with an inline error on failure — see `pending-decisions.tsx` or `client-radar.tsx`.
   Never `<form action="/api/...">` for an in-app action; the allowlist in the test names
   the few flows where reload semantics are correct (auth, creation-that-navigates).
2. **Pages/layouts use the request-cached lookups** — `getServerUser()` and
   `getCurrentWorkspace()` — never `supabase.auth.getUser()` directly. One auth round
   trip per navigation, shared by layout and page.
3. **`(app)/loading.tsx` stays.** It is the streaming boundary that paints the shell
   before data; without it every navigation is a blank pause.

Also part of the texture (in `globals.css`, TOUCH TEXTURE block): `:active` scale on
every pressable, no `-webkit-tap-highlight`, `touch-action: manipulation`. New
interactive components inherit this via `:where()` — don't opt out without a reason.
Independent page queries go in one `Promise.all`, never awaited in sequence.

### Before changing any prompt, model, retrieval or corpus code

```bash
npm run rag:evaluate                                            # retrieval, offline
node scripts/evaluate-assistant-answers.mjs --base http://localhost:3007  # answers, needs dev server
```

### Known gap: the corpus is barely embedded

`data/regulatory/corpus.json` ships with **21 of 1,826 chunks embedded**. `GOOGLE_GENERATIVE_AI_API_KEY`
is empty, and the AI Gateway does **not** proxy embeddings (verified: every embedding endpoint 404s with
"not supported by ai-gateway"), so retrieval runs lexical-only — the `/api/chat` retrieval event reports
`"strategy":"lexical"`. Fixing it needs a direct Google AI Studio key in `.env.local`, then
`npm run corpus:embed` (now retries and resumes; it used to abort the whole run on the first 429).
