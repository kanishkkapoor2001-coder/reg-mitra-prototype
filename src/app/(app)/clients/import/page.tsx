import Link from "next/link";
import { ClientImport } from "@/components/client-import";
import { PageHeading } from "@/components/page-heading";

export default function ImportClientsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Client portfolio"
        title="Import your client book"
        description="A CSV from Tally, Zoho or Excel. The columns are read for you and shown before anything is created."
      />
      <ClientImport />
      <p className="import-foot">
        Adding one client instead? <Link href="/clients/new">Add a client</Link>
      </p>
    </>
  );
}
