import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { trialDaysRemaining } from "@/lib/billing/entitlements";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function BillingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ canceled?: string; success?: string }> }>) {
  const [workspace, params] = await Promise.all([getCurrentWorkspace(), searchParams]);
  if (!workspace) return null;
  const days = trialDaysRemaining(workspace.trialEndsAt);
  const entitled = workspace.subscriptionStatus === "active"
    || (workspace.subscriptionStatus === "trialing" && days > 0);

  return (
    <>
      <PageHeading
        eyebrow="Workspace access"
        title={workspace.subscriptionStatus === "active" ? "Your subscription is active" : days ? `${days} trial ${days === 1 ? "day" : "days"} remaining` : "Choose a plan to continue"}
        description="Access is enforced by the server for every protected product route."
      />
      {params.success === "1" ? <div className="notice"><strong>Payment received.</strong> Access will update as soon as Stripe confirms the subscription.</div> : null}
      {params.canceled === "1" ? <div className="notice"><strong>Checkout canceled.</strong> No payment change was made.</div> : null}
      <section className="billing-panel">
        <div>
          <p className="eyebrow">Reg Mitra workspace</p>
          <h2>{workspace.name}</h2>
          <p>
            {entitled
              ? "Your workspace can use the product while this entitlement remains active."
              : "Your records remain isolated and retained, but product routes are unavailable until access is restored."}
          </p>
        </div>
        <dl>
          <div><dt>Status</dt><dd>{workspace.subscriptionStatus.replaceAll("_", " ")}</dd></div>
          <div><dt>Role</dt><dd>{workspace.role}</dd></div>
        </dl>
        <div className="button-row">
          {workspace.subscriptionStatus === "active" ? (
            <form action="/api/billing/portal" method="post">
              <button className="button primary" type="submit">Manage subscription</button>
            </form>
          ) : (
            <form action="/api/billing/checkout" method="post">
              <button className="button primary" type="submit">Continue with Reg Mitra</button>
            </form>
          )}
          {entitled ? <Link className="button" href="/today">Return to workspace</Link> : null}
        </div>
      </section>
    </>
  );
}
