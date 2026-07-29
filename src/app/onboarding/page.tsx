import { PublicShell } from "@/components/public-shell";

const errors: Record<string, string> = {
  invalid_workspace: "Enter a firm name and a short workspace address.",
  unavailable: "That workspace address is unavailable. Try a different one.",
  not_configured: "Customer workspaces are not enabled in this environment.",
};

export default async function OnboardingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;

  return (
    <PublicShell>
      <main className="login-page">
        <section className="login-copy">
          <p className="marketing-kicker">Create your workspace</p>
          <h1>Give your firm one trusted compliance workspace.</h1>
          <p>This creates an isolated workspace with you as its owner. Client records are added only after the workspace is ready.</p>
          <ul>
            <li><span>01</span> Your firm starts with seven days of full product access</li>
            <li><span>02</span> You control invitations and member roles</li>
            <li><span>03</span> Every material change is recorded in the audit history</li>
          </ul>
        </section>
        <section className="login-panel" aria-labelledby="workspace-title">
          <div className="login-mark">R/M</div>
          <p className="access-label">Firm setup</p>
          <h2 id="workspace-title">Name your workspace</h2>
          <form action="/api/workspaces" method="post">
            <label htmlFor="workspace-name">Firm name</label>
            <input
              autoComplete="organization"
              id="workspace-name"
              name="name"
              placeholder="Mehta Shah & Associates"
              required
              type="text"
            />
            <label htmlFor="workspace-slug">Workspace address</label>
            <input
              autoCapitalize="none"
              id="workspace-slug"
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="mehta-shah"
              required
              type="text"
            />
            <small>Use lowercase letters, numbers, and hyphens. You can invite your team after setup.</small>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="marketing-button primary wide" type="submit">
              Create secure workspace <span>→</span>
            </button>
          </form>
        </section>
      </main>
    </PublicShell>
  );
}
