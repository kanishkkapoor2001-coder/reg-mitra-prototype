import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

const errors: Record<string, string> = {
  invalid_email: "Enter a valid work email address.",
  invalid_link: "That sign-in link is incomplete. Request a new one.",
  expired_link: "That sign-in link has expired or was already used.",
  send_failed: "We could not send the sign-in link. Please try again.",
  not_configured: "Customer sign-in is not enabled in this environment.",
};

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ error?: string; sent?: string; from?: string }>;
}>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;
  const from = params.from?.startsWith("/") && !params.from.startsWith("//")
    ? params.from
    : "/today";

  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Reg Mitra workspace</p>
          <h1>Return to your firm’s regulatory workspace.</h1>
          <p>A secure sign-in link keeps passwords out of your workflow. Use the email address associated with your firm.</p>
          <ul>
            <li><span>01</span> Firm and client data remains isolated by workspace</li>
            <li><span>02</span> Roles govern access, review, and administration</li>
            <li><span>03</span> Sessions can be revoked without changing a password</li>
          </ul>
        </section>
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-mark">R/M</div>
          <p className="access-label">Secure access</p>
          <h2 id="login-title">Email me a sign-in link</h2>
          {params.sent === "1" ? (
            <div className="notice" role="status">
              <strong>Check your inbox.</strong>
              The sign-in link expires shortly and can only be used once.
            </div>
          ) : (
            <form action="/api/auth/start" method="post">
              <input name="from" type="hidden" value={from} />
              <label htmlFor="login-email">Work email</label>
              <input
                autoComplete="email"
                id="login-email"
                inputMode="email"
                name="email"
                placeholder="you@firm.in"
                required
                type="email"
              />
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="marketing-button primary wide" type="submit">
                Send secure link <span>→</span>
              </button>
            </form>
          )}
          <small>Never share portal credentials, passwords, client records, or OTPs on this page.</small>
          <Link href="/start">New to Reg Mitra? Start your 7-day trial →</Link>
        </section>
      </main>
    </PublicShell>
  );
}
