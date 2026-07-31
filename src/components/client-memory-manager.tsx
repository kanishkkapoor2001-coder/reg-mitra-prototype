"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { INCLUDED_CLIENT_MEMORIES, type ClientMemory } from "@/lib/public-client-store";

function formatMemoryDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ClientMemoryManager({
  memories,
  onChange,
}: Readonly<{
  memories: readonly ClientMemory[];
  onChange: (memories: ClientMemory[]) => void;
}>) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null);
  const atLimit = memories.length >= INCLUDED_CLIENT_MEMORIES;

  function addMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || atLimit) return;
    const now = new Date().toISOString();
    onChange([
      ...memories,
      {
        id: `memory-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        content: content.slice(0, 500),
        createdAt: now,
        updatedAt: now,
      },
    ]);
    setDraft("");
  }

  function beginEdit(memory: ClientMemory) {
    setEditingId(memory.id);
    setEditDraft(memory.content);
    setConfirmingRemoval(null);
  }

  function saveEdit(memoryId: string) {
    const content = editDraft.trim();
    if (!content) return;
    onChange(memories.map((memory) => memory.id === memoryId
      ? { ...memory, content: content.slice(0, 500), updatedAt: new Date().toISOString() }
      : memory));
    setEditingId(null);
    setEditDraft("");
  }

  function removeMemory(memoryId: string) {
    onChange(memories.filter((memory) => memory.id !== memoryId));
    setConfirmingRemoval(null);
    if (editingId === memoryId) setEditingId(null);
  }

  return (
    <section className="client-memory-panel">
      <div className="client-memory-heading">
        <div>
          <p className="eyebrow">Assistant memory</p>
          <h2>What Reg Mitra remembers</h2>
        </div>
        <span className={atLimit ? "at-limit" : ""}>
          <strong>{memories.length}</strong> / {INCLUDED_CLIENT_MEMORIES}
        </span>
      </div>
      <p className="client-memory-intro">
        Every saved memory is visible here and supplied only to this client&apos;s Assistant conversations.
      </p>

      {memories.length ? (
        <ol className="client-memory-list">
          {memories.map((memory, index) => (
            <li key={memory.id}>
              <span className="client-memory-number">{String(index + 1).padStart(2, "0")}</span>
              <div className="client-memory-copy">
                {editingId === memory.id ? (
                  <textarea
                    aria-label={`Edit memory ${index + 1}`}
                    autoFocus
                    maxLength={500}
                    onChange={(event) => setEditDraft(event.target.value)}
                    rows={4}
                    value={editDraft}
                  />
                ) : (
                  <p>{memory.content}</p>
                )}
                <small>{memory.createdAt === memory.updatedAt ? "Saved" : "Updated"} {formatMemoryDate(memory.updatedAt)}</small>
              </div>
              <div className="client-memory-actions">
                {editingId === memory.id ? (
                  <>
                    <button disabled={!editDraft.trim()} onClick={() => saveEdit(memory.id)} type="button">Save</button>
                    <button onClick={() => setEditingId(null)} type="button">Cancel</button>
                  </>
                ) : confirmingRemoval === memory.id ? (
                  <>
                    <button className="danger" onClick={() => removeMemory(memory.id)} type="button">Remove?</button>
                    <button onClick={() => setConfirmingRemoval(null)} type="button">Keep</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => beginEdit(memory)} type="button">Edit</button>
                    <button onClick={() => setConfirmingRemoval(memory.id)} type="button">Remove</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="client-memory-empty">
          <strong>No memories saved yet</strong>
          <p>Add stable facts or working preferences that should follow this client into Assistant conversations.</p>
        </div>
      )}

      {atLimit ? (
        <div className="client-memory-upgrade">
          <div>
            <strong>Five included memories are in use</strong>
            <p>Additional client-memory capacity is available as a paid add-on.</p>
          </div>
          <Link className="button" href="/pricing#client-memory">See memory add-on</Link>
        </div>
      ) : (
        <form className="client-memory-composer" onSubmit={addMemory}>
          <label htmlFor="client-memory-new">Add memory</label>
          <textarea
            id="client-memory-new"
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Example: Monthly GST filer. Partner prefers one-page briefs."
            rows={4}
            value={draft}
          />
          <div>
            <small>{INCLUDED_CLIENT_MEMORIES - memories.length} remaining · {draft.length}/500</small>
            <button className="button" disabled={!draft.trim()} type="submit">Save memory</button>
          </div>
        </form>
      )}
      <p className="client-memory-footnote">
        Open product: stored in this browser. Never save passwords, OTPs, or portal secrets.
      </p>
    </section>
  );
}
