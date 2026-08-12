// Google and Microsoft sign-in, shared by /login and /signup.
//
// Both pages post to the same /api/auth/oauth route, so the markup lives in one
// place — a button that exists on sign-up but not sign-in reads as a broken
// account rather than a missing option, which is exactly the bug this avoids.
//
// The providers appear only once they are switched on in Supabase. A button
// that cannot complete a sign-in is worse than no button: it looks like the
// product is broken rather than like it offers one fewer route in. The email
// path is always the dependable default underneath.

export type OauthProvider = "google" | "microsoft";

export function enabledOauthProviders(): Record<OauthProvider, boolean> {
  const configured = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return {
    google: configured.includes("google"),
    microsoft: configured.includes("microsoft"),
  };
}

export function hasAnyOauthProvider(): boolean {
  const providers = enabledOauthProviders();
  return providers.google || providers.microsoft;
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="oauth-logo">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="oauth-logo">
      <path fill="#F25022" d="M0 0h8.5v8.5H0z"/>
      <path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z"/>
      <path fill="#00A4EF" d="M0 9.5h8.5V18H0z"/>
      <path fill="#FFB900" d="M9.5 9.5H18V18H9.5z"/>
    </svg>
  );
}

export function OauthButtons({
  from,
  intent,
  origin = "login",
  plan,
  verb = "Continue",
}: Readonly<{
  from: string;
  /** Carried through the provider round-trip so the operator alert still knows. */
  intent?: string;
  /** Which page to return to if the provider handshake fails. */
  origin?: "login" | "signup";
  plan?: string;
  verb?: string;
}>) {
  const providers = enabledOauthProviders();
  if (!providers.google && !providers.microsoft) return null;

  return (
    <>
      <div className="oauth-stack">
        {providers.google ? (
          <form action="/api/auth/oauth" method="post">
            <input type="hidden" name="provider" value="google" />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="origin" value={origin} />
            {plan ? <input type="hidden" name="plan" value={plan} /> : null}
            {intent ? <input type="hidden" name="intent" value={intent} /> : null}
            {/* One expression, not `{verb} with Google` — adjacent expression and
                literal children make React emit a comment node between them,
                which splits the label for anything reading the markup. */}
            <button className="oauth-button" type="submit">
              <GoogleLogo />
              {`${verb} with Google`}
            </button>
          </form>
        ) : null}

        {providers.microsoft ? (
          <form action="/api/auth/oauth" method="post">
            <input type="hidden" name="provider" value="microsoft" />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="origin" value={origin} />
            {plan ? <input type="hidden" name="plan" value={plan} /> : null}
            {intent ? <input type="hidden" name="intent" value={intent} /> : null}
            <button className="oauth-button" type="submit">
              <MicrosoftLogo />
              {`${verb} with Microsoft`}
            </button>
          </form>
        ) : null}
      </div>
      <p className="oauth-divider"><span>or</span></p>
    </>
  );
}
