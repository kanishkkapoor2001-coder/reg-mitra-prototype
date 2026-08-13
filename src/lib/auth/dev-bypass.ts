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
// Requires NODE_ENV to be exactly "development" — not merely "not production".
//
// The weaker test would have opened the product on any host where NODE_ENV was
// simply unset, which is the normal state of a bare `node server.js` on a VPS.
// That turned one careless copy of .env.local onto a server into anonymous
// access to every firm's client roster. Self-hosting made that a real path
// rather than a theoretical one, so the guard names the environment it wants
// instead of excluding the one it fears.
// `nodeEnv` is typed as a plain string, not NODE_ENV's narrow union: the value
// this guards against is precisely one the union says cannot occur — an unset
// or unexpected NODE_ENV on someone's server. Typing it narrowly would make the
// dangerous cases unrepresentable in the tests.
export function isDevAuthBypassEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  flag: string | undefined = process.env.REGMITRA_DEV_AUTH,
): boolean {
  return nodeEnv === "development" && flag === "1";
}
