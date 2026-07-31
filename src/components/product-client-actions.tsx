"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientEditorDialog, type ClientEditorValue } from "@/components/client-editor-dialog";
import type { ManagedClient } from "@/lib/public-client-store";

export function ProductClientActions({
  client,
}: Readonly<{
  client: Pick<ManagedClient, "id" | "legalName" | "displayName" | "sector" | "stateCode">;
}>) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const editorClient: ManagedClient = {
    ...client,
    location: "",
    identifiers: [],
    risk: "low",
    notes: "",
    facts: [],
    tasks: [],
    archived: false,
    createdAt: "",
    updatedAt: "",
    source: "browser",
  };

  async function save(value: ClientEditorValue) {
    setWorking(true);
    const response = await fetch(`/api/clients/${encodeURIComponent(client.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    setWorking(false);
    if (!response.ok) return;
    setEditing(false);
    router.refresh();
  }

  async function archive() {
    setWorking(true);
    const response = await fetch(`/api/clients/${encodeURIComponent(client.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    if (response.ok) router.push("/clients");
    else setWorking(false);
  }

  return (
    <>
      <div className="button-row">
        <button className="button" disabled={working} onClick={() => setEditing(true)} type="button">Edit client</button>
        <button className="client-archive-button" disabled={working} onClick={archive} type="button">Archive</button>
      </div>
      <ClientEditorDialog client={editorClient} onClose={() => setEditing(false)} onSave={save} open={editing} />
    </>
  );
}
