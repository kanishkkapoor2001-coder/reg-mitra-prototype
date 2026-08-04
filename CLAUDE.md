# product/ — the RegMitra website AND the logged-in product

This one Next.js app is BOTH the marketing website (`/`, `/pricing`, `/about`, `/features`…) and the signed-in product (`/assistant`, `/clients`, `/today`, `/calendar`…). A CA reaches the product from the website, so they live together here on purpose.

- Deploys to Vercel project **`reg-mitra-migration`** → https://reg-mitra-migration.vercel.app
- Working branch: **`chatbot/overhaul`**
- This is NOT the demo. The frozen demo is `../demo-FROZEN/` — never touch it for product/website work.
- Newsletter is a separate app in `../newsletter/`.

Before deploying, `pwd` to confirm you're in `product/`. See `../CLAUDE.md` for the full workspace map.
