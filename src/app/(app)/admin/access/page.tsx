import { notFound } from "next/navigation";
import { listAccessRequests } from "@/lib/access/approve";
import { hasFounderAccess } from "@/lib/billing/entitlements";
import { TIERS } from "@/lib/billing/tiers";
import { getServerUser } from "@/lib/supabase/server";

// Approving a firm used to mean running SQL by hand. This is the same decision
// as a button, which is the difference between onboarding someone in ten
// seconds and putting it off until the evening.

export const dynamic = "force-dynamic";

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function AdminAccessPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ done?: string; error?: string }> }>) {
  const email = (await getServerUser())?.email;

  // Anyone else should not learn this page exists.
  if (!email || !hasFounderAccess(email)) notFound();

  const params = await searchParams;
  const requests = await listAccessRequests();
  const pending = requests.filter((request) => request.status === "pending");
  const decided = requests.filter((request) => request.status !== "pending");

  return (
    <>
      <section className="detail-hero" style={{ marginTop: 4 }}>
        <div>
          <p className="eyebrow">Operator</p>
          <h1>Access requests</h1>
          <p className="page-subtitle">
            Trials from a firm’s own domain let themselves in and never appear here.
            Approving anyone below sends them a sign-in email automatically.
          </p>
        </div>
      </section>

      {params.done ? (
        <div className="notice">
          <strong>{params.done === "approved" ? "Approved." : "Marked as rejected."}</strong>
          {params.done === "approved" ? " They have been emailed a sign-in link." : ""}
        </div>
      ) : null}
      {params.error ? (
        <div className="notice"><strong>That did not work.</strong> Please try again.</div>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          {/* Work-domain trials approve themselves now, so this list is no
              longer "everyone who signed up" — it is the ones that could not be
              decided automatically. Saying otherwise implies the queue is the
              whole funnel. */}
          <div><h2>Waiting</h2><p>Paid requests, and trials from a personal email address</p></div>
          {pending.length ? <span className="radar-count">{pending.length}</span> : null}
        </div>

        {pending.length === 0 ? (
          <div className="empty-state">
            <h2>Nothing waiting</h2>
            <p>New signups appear here, and you are emailed when one arrives.</p>
          </div>
        ) : (
          <ul className="access-list">
            {pending.map((request) => (
              <li className="access-row" key={request.id}>
                <div className="access-who">
                  <strong>{request.fullName || request.email}</strong>
                  {request.fullName ? <span className="access-email">{request.email}</span> : null}
                  <span className="access-meta">
                    Wants {TIERS[request.requestedTier].name}
                    {request.requestedTier === "enterprise" ? " (agreed directly)" : ""}
                    {" · "}via {request.provider ?? "email"}
                    {" · "}{formatWhen(request.requestedAt)}
                  </span>
                </div>
                <div className="access-actions">
                  <form action="/api/admin/access" method="post">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button className="button primary" type="submit">Approve</button>
                  </form>
                  <form action="/api/admin/access" method="post">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button className="button" type="submit">Reject</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length ? (
        <section className="panel">
          <div className="panel-header"><div><h2>Decided</h2><p>Everyone else</p></div></div>
          <ul className="access-list">
            {decided.map((request) => (
              <li className="access-row" key={request.id}>
                <div className="access-who">
                  <strong>{request.fullName || request.email}</strong>
                  {request.fullName ? <span className="access-email">{request.email}</span> : null}
                  <span className="access-meta">
                    {TIERS[request.requestedTier].name} · {formatWhen(request.lastSeenAt)}
                  </span>
                </div>
                <span className={`access-state is-${request.status}`}>{request.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
