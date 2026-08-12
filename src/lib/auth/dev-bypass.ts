// Local development escape hatch for the signed-in product.
//
// A dev machine has no Supabase project of its own, so `auth.getUser()` can never
// return a user and every route matched by the proxy redirects to /login. Two
// things broke as a result:
//
//   - The signed-in product could not be opened locally at all. Every page fell
//     back to its sample branch, so the real (non-demo) code paths in
//     today/clients/assistant were written but never actually seen or exercised.
//   - scripts/evaluate-assistant-answers.mjs drives 65 cases through /api/chat,
//     so the answer-quality gate — fabrication, citation precision, refusal
//     discipline — silently could not run. Nothing was measuring answer quality.
//
// Kept beside founder-access.ts as a pure module so the production-safety
// property can be asserted directly (see dev-bypass.test.ts) rather than only
// through the proxy.
//
// This is deliberately impossible to enable in a deployment: Vercel builds and
// runs with NODE_ENV="production", so the flag alone is inert there. Both
// conditions must hold, and the flag lives only in .env.local, which is
// gitignored.
export function isDevAuthBypassEnabled(
  nodeEnv = process.env.NODE_ENV,
  flag = process.env.REGMITRA_DEV_AUTH,
): boolean {
  return nodeEnv !== "production" && flag === "1";
}
