"use client";

import { FormEvent, useEffect, useRef } from "react";
import type { ManagedClient } from "@/lib/public-client-store";

export interface ClientEditorValue {
  legalName: string;
  displayName: string;
  sector: string;
  stateCode: string;
  location: string;
  identifiers: string[];
}

export function ClientEditorDialog({
  client,
  onClose,
  onSave,
  open,
}: Readonly<{
  client?: ManagedClient | null;
  onClose: () => void;
  onSave: (value: ClientEditorValue) => void;
  open: boolean;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const legalName = String(form.get("legalName") ?? "").trim();
    const displayName = String(form.get("displayName") ?? "").trim();
    if (!legalName || !displayName) return;
    onSave({
      legalName,
      displayName,
      sector: String(form.get("sector") ?? "").trim(),
      stateCode: String(form.get("stateCode") ?? "").trim().toUpperCase(),
      location: String(form.get("location") ?? "").trim(),
      identifiers: String(form.get("identifiers") ?? "")
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 12),
    });
  }

  return (
    <dialog
      aria-labelledby="client-editor-title"
      className="client-editor-dialog"
      onCancel={onClose}
      onClose={onClose}
      ref={dialogRef}
    >
      <form className="client-editor-form" method="dialog" onSubmit={submit}>
        <header>
          <div>
            <p className="eyebrow">Client record</p>
            <h2 id="client-editor-title">{client ? "Edit client" : "Add a client"}</h2>
            <p>Start with the facts your team uses most. You can deepen the record later.</p>
          </div>
          <button aria-label="Close client editor" className="dialog-close" onClick={onClose} type="button">×</button>
        </header>
        <div className="client-editor-grid">
          <label>
            <span>Legal name</span>
            <input defaultValue={client?.legalName} name="legalName" required />
          </label>
          <label>
            <span>Working name</span>
            <input defaultValue={client?.displayName} name="displayName" required />
          </label>
          <label>
            <span>Sector</span>
            <input defaultValue={client?.sector} name="sector" placeholder="e.g. Manufacturing" />
          </label>
          <label>
            <span>State or jurisdiction</span>
            <input defaultValue={client?.stateCode} maxLength={20} name="stateCode" />
          </label>
          <label className="wide">
            <span>Primary location</span>
            <input defaultValue={client?.location} name="location" placeholder="City, state" />
          </label>
          <label className="wide">
            <span>Registrations</span>
            <textarea
              defaultValue={client?.identifiers.join("\n")}
              name="identifiers"
              placeholder={"GSTIN …\nPAN …\nCIN …"}
              rows={4}
            />
            <small>One registration per line. Stored only in this browser in the open product.</small>
          </label>
        </div>
        <footer>
          <button className="button" onClick={onClose} type="button">Cancel</button>
          <button className="button primary" type="submit">{client ? "Save changes" : "Create client"}</button>
        </footer>
      </form>
    </dialog>
  );
}
