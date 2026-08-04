import { PublicShell } from "@/components/public-shell";

const errors: Record<string, string> = {
  invalid_workspace: "Enter a firm name, domain, and a short workspace address.",
  trial_required: "Request pilot access with this work email before creating a workspace.",
  trial_claimed: "This organization has already used its Reg Mitra trial.",
  unavailable: "That workspace address is unavailable. Try a different one.",
  not_configured: "Workspace setup is not available right now. Try again later.",
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
          <h1>Set up your firm workspace.</h1>
          <p>This creates a separate workspace with you as its owner. Add client records only after setup is complete.</p>
          <ul>
            <li><span>01</span> Your pilot begins when this workspace is created</li>
            <li><span>02</span> You control invitations and member roles</li>
            <li><span>03</span> Review actions are recorded in the workspace audit history</li>
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
            <label htmlFor="workspace-domain">Firm website or domain</label>
            <input
              autoCapitalize="none"
              id="workspace-domain"
              name="organization_domain"
              placeholder="yourfirm.in"
              required
              type="text"
            />
            <small>The domain identifies your firm and enforces one trial per organization.</small>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="marketing-button primary wide" type="submit">
              Create workspace <span>→</span>
            </button>
          </form>
        </section>
      </main>
    </PublicShell>
  );
}
