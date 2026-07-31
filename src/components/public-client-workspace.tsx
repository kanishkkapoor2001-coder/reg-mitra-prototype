"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientEditorDialog, type ClientEditorValue } from "@/components/client-editor-dialog";
import { ClientMemoryManager } from "@/components/client-memory-manager";
import { CheckCircleIcon, ChevronRightIcon, SparklesIcon } from "@/components/icons";
import {
  readManagedClients,
  useManagedClients,
  writeManagedClients,
  type ClientMemory,
  type ManagedClient,
  type ManagedClientTask,
} from "@/lib/public-client-store";

const suggestedQuestions = [
  "What needs my attention for this client?",
  "Which recorded facts are missing before I assess applicability?",
  "Prepare a client information request for the open work.",
  "What upcoming regulatory changes should I review for this client?",
] as const;

function assistantHref(client: ManagedClient, prompt: string) {
  const params = new URLSearchParams({
    client: client.id,
    clientName: client.displayName,
    prompt,
  });
  return `/assistant?${params.toString()}`;
}

export function PublicClientWorkspace({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const managedClients = useManagedClients();
  const client = managedClients.find((candidate) => candidate.id === id && !candidate.archived) ?? null;
  const [editing, setEditing] = useState(false);
  const [newTask, setNewTask] = useState("");

  const openTasks = useMemo(
    () => (client?.tasks ?? [])
      .filter((task) => task.state !== "complete")
      .sort((left, right) => {
        const rank = { high: 3, medium: 2, low: 1 };
        return rank[right.urgency] - rank[left.urgency];
      }),
    [client],
  );
  const priorityTasks = openTasks.slice(0, 3);
  const laterTasks = openTasks.slice(3);

  function persist(updated: ManagedClient) {
    const all = readManagedClients();
    writeManagedClients(all.map((candidate) => candidate.id === updated.id ? updated : candidate));
  }

  function updateProfile(value: ClientEditorValue) {
    if (!client) return;
    persist({ ...client, ...value, updatedAt: new Date().toISOString() });
    setEditing(false);
  }

  function archiveClient() {
    if (!client) return;
    persist({ ...client, archived: true, updatedAt: new Date().toISOString() });
    router.push("/clients");
  }

  function toggleTask(taskId: string) {
    if (!client) return;
    persist({
      ...client,
      updatedAt: new Date().toISOString(),
      tasks: client.tasks.map((task) => task.id === taskId
        ? { ...task, state: task.state === "complete" ? "needs-review" : "complete" }
        : task),
    });
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTask.trim();
    if (!client || !title) return;
    const task: ManagedClientTask = {
      id: `${client.id}-task-${Date.now().toString(36)}`,
      title,
      authority: "Internal work",
      due: "No due date",
      urgency: "medium",
      state: "needs-review",
    };
    persist({ ...client, tasks: [...client.tasks, task], updatedAt: new Date().toISOString() });
    setNewTask("");
  }

  function saveMemories(memories: ClientMemory[]) {
    if (!client) return;
    persist({ ...client, memories, updatedAt: new Date().toISOString() });
  }

  if (!client) {
    return (
      <section className="empty-state portfolio-empty">
        <h1>Client not found</h1>
        <p>This client may have been archived or removed from this browser.</p>
        <Link className="button primary" href="/clients">Return to clients</Link>
      </section>
    );
  }

  const initials = client.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const completedCount = client.tasks.filter((task) => task.state === "complete").length;

  return (
    <div className="client-command-center">
      <Link className="text-link client-back-link" href="/clients">← All clients</Link>

      <header className="client-command-header">
        <div className="client-command-identity">
          <span className="detail-avatar">{initials || "CL"}</span>
          <div>
            <p className="eyebrow">Client command centre</p>
            <h1>{client.displayName}</h1>
            <p>{[client.legalName, client.sector, client.location || client.stateCode].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="client-header-actions">
          <button className="button" onClick={() => setEditing(true)} type="button">Edit client</button>
          <Link className="button primary" href={assistantHref(client, `What needs attention for ${client.displayName}?`)}>
            <SparklesIcon /> Ask Assistant
          </Link>
        </div>
      </header>

      <section className="client-priority-strip" aria-label="Client status">
        <div><strong>{openTasks.length}</strong><span>open items</span></div>
        <i />
        <div><strong>{priorityTasks.filter((task) => task.urgency === "high").length}</strong><span>high priority</span></div>
        <i />
        <div><strong>{completedCount}</strong><span>completed</span></div>
        <span className={`risk-chip ${client.risk}`}>{client.risk} attention</span>
      </section>

      <div className="client-command-grid">
        <main className="client-primary-column">
          <section className="client-focus-panel">
            <div className="client-section-heading">
              <div>
                <p className="eyebrow">Priority now</p>
                <h2>{priorityTasks.length ? "What deserves your attention" : "Client is clear for now"}</h2>
              </div>
              <span>{priorityTasks.length} prioritized</span>
            </div>
            {priorityTasks.length ? (
              <div className="client-priority-list">
                {priorityTasks.map((task, index) => (
                  <article className="client-priority-item" key={task.id}>
                    <span className={`client-task-rank ${task.urgency}`}>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{task.title}</strong>
                      <small>{task.authority} · {task.state.replace("-", " ")} · {task.due}</small>
                    </div>
                    <button className="client-complete-button" onClick={() => toggleTask(task.id)} type="button">
                      <CheckCircleIcon /> Mark complete
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="client-clear-state"><CheckCircleIcon /><p>No urgent or open work is recorded for this client.</p></div>
            )}
            <form className="client-quick-task" onSubmit={addTask}>
              <input
                aria-label="New task"
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="Add a task without leaving this page"
                value={newTask}
              />
              <button className="button" disabled={!newTask.trim()} type="submit">Add task</button>
            </form>
          </section>

          <section className="client-assistant-panel">
            <div className="client-section-heading">
              <div>
                <p className="eyebrow">Client-aware Assistant</p>
                <h2>Questions worth asking next</h2>
              </div>
              <SparklesIcon />
            </div>
            <div className="client-question-grid">
              {suggestedQuestions.map((question) => (
                <Link href={assistantHref(client, question)} key={question}>
                  <span>{question}</span><ChevronRightIcon />
                </Link>
              ))}
            </div>
          </section>

          <div className="client-secondary-sections">
            <details open>
              <summary><span><strong>Upcoming and routine work</strong><small>{laterTasks.length} lower-priority items</small></span><ChevronRightIcon /></summary>
              <div className="client-detail-body">
                {laterTasks.length ? laterTasks.map((task) => (
                  <div className="client-routine-row" key={task.id}>
                    <span><strong>{task.title}</strong><small>{task.authority} · {task.due}</small></span>
                    <button className="text-link" onClick={() => toggleTask(task.id)} type="button">Complete</button>
                  </div>
                )) : <p>No lower-priority work is currently recorded.</p>}
              </div>
            </details>
            <details>
              <summary><span><strong>Registrations and client facts</strong><small>{client.identifiers.length} registrations · {client.facts.length} recorded facts</small></span><ChevronRightIcon /></summary>
              <div className="client-detail-body client-record-grid">
                <div><h3>Registrations</h3>{client.identifiers.length ? client.identifiers.map((identifier) => <span className="identifier" key={identifier}>{identifier}</span>) : <p>None recorded.</p>}</div>
                <div><h3>Recorded facts</h3>{client.facts.map((fact) => <p key={fact}>{fact}</p>)}</div>
              </div>
            </details>
            <details>
              <summary><span><strong>Connections and filing evidence</strong><small>No live portal connection</small></span><ChevronRightIcon /></summary>
              <div className="client-detail-body">
                <p>Connect Tally and filing-status sources only after the firm workspace and consent boundary are active. No password, OTP, or CAPTCHA should be sent to Reg Mitra.</p>
                <Link className="button small" href="/settings">Review connection setup</Link>
              </div>
            </details>
          </div>
        </main>

        <aside className="client-context-rail">
          <ClientMemoryManager memories={client.memories} onChange={saveMemories} />
          <section>
            <p className="eyebrow">Client record</p>
            <dl>
              <div><dt>Source</dt><dd>{client.source === "sample" ? "Sample profile" : "Browser record"}</dd></div>
              <div><dt>Last changed</dt><dd>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(client.updatedAt))}</dd></div>
              <div><dt>Regulatory impact</dt><dd>Not yet reviewed</dd></div>
            </dl>
          </section>
          <button className="client-archive-button" onClick={archiveClient} type="button">Archive client</button>
        </aside>
      </div>

      <ClientEditorDialog
        client={client}
        onClose={() => setEditing(false)}
        onSave={updateProfile}
        open={editing}
      />
    </div>
  );
}
