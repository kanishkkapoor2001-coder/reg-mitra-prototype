import { ClientCard } from "@/components/client-card";
import { DemoNotice } from "@/components/demo-notice";
import { PageHeading } from "@/components/page-heading";
import { clients } from "@/lib/demo-data";

export default function ClientsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Portfolio"
        title="Clients"
        description="Review obligations, risks, and upcoming work for every client from one place."
        actions={<button className="button primary" type="button">Add client</button>}
      />
      <DemoNotice />
      <div className="filter-bar">
        <input className="filter-input" aria-label="Search clients" placeholder="Search clients…" />
        <select className="filter-select" aria-label="Filter by risk" defaultValue="all"><option value="all">All risk levels</option><option value="high">High risk</option><option value="medium">Medium risk</option><option value="low">Low risk</option></select>
        <select className="filter-select" aria-label="Filter by sector" defaultValue="all"><option value="all">All sectors</option><option value="manufacturing">Manufacturing</option><option value="services">Services</option></select>
      </div>
      <section className="client-grid" aria-label="Client portfolio">
        {clients.map((client) => <ClientCard client={client} key={client.id} />)}
      </section>
    </>
  );
}
