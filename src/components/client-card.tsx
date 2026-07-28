import Link from "next/link";
import { TrustBadge } from "@/components/trust-badge";
import type { Client } from "@/lib/types";

export function ClientCard({ client }: Readonly<{ client: Client }>) {
  return (
    <Link className="client-card" href={`/clients/${client.id}`}>
      <div className="client-card-head">
        <span className="client-avatar">{client.initials}</span>
        <span style={{ minWidth: 0 }}>
          <h2>{client.shortName}</h2>
          <span className="client-card-sub">{client.sector} · {client.location}</span>
        </span>
        <span className={`risk-chip ${client.risk}`}>{client.risk}</span>
      </div>
      <div className="client-metrics">
        <span className="client-metric"><strong>{client.pending}</strong><span>Pending</span></span>
        <span className="client-metric"><strong>{client.dueThisWeek}</strong><span>This week</span></span>
        <span className="client-metric"><strong>{client.compliant}</strong><span>Compliant</span></span>
      </div>
      <span className="source-line"><TrustBadge kind="evidence" state="demo" /> Connect sources to verify</span>
    </Link>
  );
}
