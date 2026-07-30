import { cookies } from "next/headers";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { trialDaysRemaining } from "@/lib/billing/entitlements";
import { getCurrentWorkspace } from "@/lib/workspace";

const statusLabels: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Cancelled",
  expired: "Expired",
};

export default async function BillingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ canceled?: string; success?: string }> }>) {
  const [sessionCookies, workspace, params] = await Promise.all([
    cookies(),
    getCurrentWorkspace(),
    searchParams,
  ]);
  const isDemo = sessionCookies.get("reg_mitra_session")?.value === "demo";

  if (isDemo) {
    return (
      <>
        <PageHeading
          eyebrow="Plan and billing"
          title="Explore the Reg Mitra sample workspace"
          description="This page shows how trial and subscription controls work. No payment can be made from the demo."
        />
        <section className="billing-panel demo-billing-panel">
          <div>
            <p className="eyebrow">Demo plan</p>
            <h2>Reg Mitra for teams</h2>
            <p>
              Explore Today, Clients, Calendar, Briefings, Regulations, and Assistant
              with sample data. Your sample session lasts up to eight hours and never creates a charge.
            </p>
          </div>
          <dl>
            <div><dt>Access</dt><dd>Sample session</dd></div>
            <div><dt>Payment</dt><dd>Disabled</dd></div>
            <div><dt>Data</dt><dd>Fictional only</dd></div>
          </dl>
          <div className="button-row">
            <Link className="button primary" href="/today">Return to Today</Link>
            <Link className="button" href="/pricing">View pilot details</Link>
          </div>
        </section>
        <section className="billing-explainer" aria-labelledby="billing-demo-title">
          <div>
            <p className="eyebrow">What happens in a real workspace</p>
            <h2 id="billing-demo-title">Seven days free, then you decide.</h2>
          </div>
          <ol>
            <li><strong>Start free</strong><span>Create a private firm workspace. No card is required.</span></li>
            <li><strong>Use the firm workspace</strong><span>Add clients, review updates, and save your work for seven days.</span></li>
            <li><strong>Choose whether to continue</strong><span>Your team subscribes only if you approve it.</span></li>
          </ol>
        </section>
      </>
    );
  }

  if (!workspace) {
    return (
      <>
        <PageHeading
          eyebrow="Plan and billing"
          title="Finish setting up your workspace"
          description="Create or join a firm workspace before managing a trial or subscription."
        />
        <section className="panel">
          <div className="empty-state">
            <h2>No workspace is linked to this account</h2>
            <p>Complete workspace setup, then return here to view access and billing.</p>
            <Link className="button primary" href="/onboarding">Set up workspace</Link>
          </div>
        </section>
      </>
    );
  }

  const days = trialDaysRemaining(workspace.trialEndsAt);
  const entitled = workspace.founderAccess
    || workspace.subscriptionStatus === "active"
    || (workspace.subscriptionStatus === "trialing" && days > 0);

  return (
    <>
      <PageHeading
        eyebrow="Plan and billing"
        title={workspace.founderAccess ? "Founder access is active" : workspace.subscriptionStatus === "active" ? "Your subscription is active" : days ? `${days} trial ${days === 1 ? "day" : "days"} remaining` : "Choose a plan to continue"}
        description={workspace.founderAccess ? "Your approved founder account has access to this firm workspace without billing." : "See your plan, trial period, and payment settings."}
      />
      {params.success === "1" ? <div className="notice"><strong>Payment received.</strong> Access will update as soon as Stripe confirms the subscription.</div> : null}
      {params.canceled === "1" ? <div className="notice"><strong>Checkout canceled.</strong> No payment change was made.</div> : null}
      <section className="billing-panel">
        <div>
          <p className="eyebrow">Reg Mitra workspace</p>
          <h2>{workspace.name}</h2>
          <p>
            {entitled
              ? "Your team has access to the features available in this workspace."
              : "Your records remain in the workspace, but access is paused until you choose a plan."}
          </p>
        </div>
        <dl>
          <div><dt>Status</dt><dd>{workspace.founderAccess ? "Founder access" : statusLabels[workspace.subscriptionStatus] ?? workspace.subscriptionStatus}</dd></div>
          <div><dt>Role</dt><dd>{workspace.role}</dd></div>
        </dl>
        <div className="button-row">
          {workspace.founderAccess ? null : workspace.subscriptionStatus === "active" ? (
            <form action="/api/billing/portal" method="post">
              <button className="button primary" type="submit">Manage subscription</button>
            </form>
          ) : (
            <form action="/api/billing/checkout" method="post">
              <button className="button primary" type="submit">View plan and price</button>
            </form>
          )}
          {entitled ? <Link className={`button ${workspace.founderAccess ? "primary" : ""}`} href="/today">Return to workspace</Link> : null}
        </div>
      </section>
    </>
  );
}
