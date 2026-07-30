import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Founder access",
  description: "Private founder access to the Reg Mitra product workspace.",
};

const errors: Record<string, string> = {
  invalid_code: "That founder code is not valid.",
  not_configured: "Founder access is not configured right now.",
  unavailable: "We could not open the workspace. Please try again.",
};

export default async function FounderPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; from?: string }>;
}>) {
  const params = await searchParams;
  const from = params.from?.startsWith("/") && !params.from.startsWith("//")
    ? params.from
    : "/today";

  if (getSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(from);
  }

  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Private founder access</p>
          <h1>One code. Straight into the real product.</h1>
          <p>
            This opens the authenticated Lerno workspace—never the public demo—and does not
            depend on an email arriving in your inbox.
          </p>
          <ul>
            <li><span>01</span> Opens the full paid workspace</li>
            <li><span>02</span> Creates a secure signed-in session</li>
            <li><span>03</span> Reuse the same private code when you sign out</li>
          </ul>
        </section>
        <section className="login-panel" aria-labelledby="founder-title">
          <div className="login-mark">R/M</div>
          <p className="access-label">Lerno founder workspace</p>
          <h2 id="founder-title">Enter your founder code</h2>
          <form action="/api/auth/founder" method="post">
            <input name="from" type="hidden" value={from} />
            <label htmlFor="founder-code">Founder code</label>
            <input
              autoCapitalize="characters"
              autoComplete="off"
              id="founder-code"
              name="access_code"
              placeholder="RM-••••-••••"
              required
              spellCheck={false}
              type="password"
            />
            {params.error ? (
              <p className="form-error" role="alert">
                {errors[params.error] ?? errors.unavailable}
              </p>
            ) : null}
            <button className="marketing-button primary wide" type="submit">
              Open the real product <span>→</span>
            </button>
          </form>
          <small>Keep this code private. Reg Mitra never asks for a portal password or OTP.</small>
          <Link href="/login">Sign in as a customer instead →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
