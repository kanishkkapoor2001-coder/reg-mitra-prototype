// The speed of the app, as a test.
//
// "Fast" decays one commit at a time: a new page ships without a streaming
// boundary, a new button ships as a form post, a new query re-runs the auth
// check the layout already ran. Each is invisible in review and each makes the
// product feel a little more like a website. This file is the ratchet — the
// patterns that made the app feel native fail the build when they regress.
//
// If a failure here is intentional, the allowlists below are the escape hatch;
// every entry carries the reason it is allowed to be slow.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: the workspace path contains a space, which
// pathname leaves percent-encoded and the filesystem then cannot find.
const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..");
const APP_GROUP = join(ROOT, "src/app/(app)");
const COMPONENTS = join(ROOT, "src/components");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const relative = (file: string) => file.slice(ROOT.length + 1);

test("signed-in pages have a streaming boundary", () => {
  // Without (app)/loading.tsx, the shell waits for the slowest query before a
  // single byte renders, and every navigation is a blank pause.
  assert.ok(
    existsSync(join(APP_GROUP, "loading.tsx")),
    "src/app/(app)/loading.tsx is missing — navigations will hang blank until data resolves",
  );
});

test("in-app mutations are optimistic, not form-post-redirect", () => {
  // A form post to an API route re-renders the whole page per click. The only
  // acceptable uses are flows that genuinely navigate somewhere new, or rare
  // admin/auth actions where a reload is the point.
  const allowed = new Set([
    // Creation flows: the successful outcome IS a navigation to the new thing.
    "src/components/client-chat.tsx",
    "src/components/client-import.tsx",
    // Queue bootstrap from an empty state; runs once, ends on a fresh queue.
    "src/components/today-experience.tsx",
    // Profile fact recording: full-form save with server-derived facts.
    "src/components/client-profile.tsx",
    // Auth and operator surfaces: reload semantics are correct there.
    "src/components/app-shell.tsx",
    "src/components/oauth-buttons.tsx",
  ]);
  const offenders: string[] = [];
  for (const file of [...walk(COMPONENTS), ...walk(APP_GROUP)]) {
    const source = readFileSync(file, "utf8");
    if (/form action="\/api\//.test(source) && !allowed.has(relative(file)) && !relative(file).includes("(app)/admin")) {
      offenders.push(relative(file));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `These post a form and reload the page per interaction. Make the action optimistic ` +
    `(update state first, fetch behind it, revert on failure — see pending-decisions.tsx), ` +
    `or add the file to the allowlist with a reason: ${offenders.join(", ")}`,
  );
});

test("pages and layouts reuse the request-cached auth lookup", () => {
  // getServerUser()/getCurrentWorkspace() are react-cached per request. Calling
  // supabase.auth.getUser() directly from a page adds a duplicate auth round
  // trip to every navigation. Route handlers are exempt: they own their request.
  const offenders: string[] = [];
  for (const file of walk(APP_GROUP)) {
    if (/\/api\//.test(file)) continue;
    const source = readFileSync(file, "utf8");
    if (/auth\.getUser\(\)/.test(source)) offenders.push(relative(file));
  }
  assert.deepEqual(
    offenders,
    [],
    `Use getServerUser() from lib/supabase/server (request-cached) instead of ` +
    `supabase.auth.getUser() in: ${offenders.join(", ")}`,
  );
});
