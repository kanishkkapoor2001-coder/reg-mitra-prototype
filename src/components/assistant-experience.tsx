"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowUpIcon, CheckCircleIcon, SparklesIcon } from "@/components/icons";
import { ReviewGate } from "@/components/review-gate";
import { TrustBadge } from "@/components/trust-badge";
import { clients } from "@/lib/demo-data";

const prompts = [
  "What needs attention for Sharma Pharma?",
  "Prepare a review checklist for the next filing",
  "Compare open work across all clients",
  "Help me verify a regulatory claim",
] as const;

interface PreparedAnswer {
  title: string;
  summary: string;
  steps: readonly string[];
  clientId: string | null;
  clientLabel: string | null;
}

function prepareLocalAnswer(query: string): PreparedAnswer {
  const normalized = query.toLowerCase();
  const client = clients.find((item) =>
    normalized.includes(item.shortName.toLowerCase())
    || normalized.includes(item.name.split(" ").at(0)?.toLowerCase() ?? ""),
  );

  if (normalized.includes("compare") || normalized.includes("all client")) {
    return {
      title: "Portfolio review prepared",
      summary: "Three demo clients are marked high risk. Start with Sharma Pharma, then Gupta Auto and Royal Spice. These scores are illustrative and are not verified against portal or client data.",
      steps: [
        "Confirm each client’s open period and assigned owner.",
        "Attach the relevant circular, notice, or portal record.",
        "Review high-risk exceptions before routine filings.",
      ],
      clientId: null,
      clientLabel: null,
    };
  }

  if (normalized.includes("verify") || normalized.includes("source") || normalized.includes("claim")) {
    return {
      title: "Verification workflow prepared",
      summary: "No authoritative regulatory source is connected in this demo. The claim should remain unverified until the original notification and client applicability are recorded.",
      steps: [
        "Locate the original publication on the issuing authority’s website.",
        "Match the effective date, jurisdiction, entity type, and period.",
        "Record the source and have a responsible professional review the conclusion.",
      ],
      clientId: client?.id ?? null,
      clientLabel: client?.shortName ?? null,
    };
  }

  return {
    title: client ? `Review prepared for ${client.shortName}` : "Review checklist prepared",
    summary: client
      ? `${client.shortName} has ${client.pending} demo actions and ${client.dueThisWeek} illustrative items due this week. The workspace has no connected sources, so every action still requires verification.`
      : "I prepared a safe review sequence from the local demo workspace. No live AI, filing portal, or client system was contacted.",
    steps: [
      "Confirm the client, return period, and responsible owner.",
      "Verify the obligation against an authoritative source.",
      "Review the working papers and record professional approval.",
    ],
    clientId: client?.id ?? null,
    clientLabel: client?.shortName ?? null,
  };
}

export function AssistantExperience({ initialPrompt = "" }: Readonly<{ initialPrompt?: string }>) {
  const [draft, setDraft] = useState(initialPrompt);
  const [submittedPrompt, setSubmittedPrompt] = useState("");

  const answer = useMemo(
    () => submittedPrompt ? prepareLocalAnswer(submittedPrompt) : null,
    [submittedPrompt],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPrompt = draft.trim();
    if (!nextPrompt) return;
    setSubmittedPrompt(nextPrompt);
  }

  function selectPrompt(prompt: string) {
    setDraft(prompt);
    setSubmittedPrompt(prompt);
  }

  return (
    <>
      <header className="assistant-hero">
        <span className="assistant-symbol"><SparklesIcon /></span>
        <div>
          <p className="eyebrow">Preparation workspace</p>
          <h1>Ask Reg Mitra</h1>
          <p>Turn a compliance question into a clear, reviewable next step.</p>
        </div>
      </header>

      <div className="assistant-layout">
        <section className="assistant-main">
          {!answer ? (
            <div className="assistant-welcome">
              <div>
                <h2>What are you trying to get done?</h2>
                <p>
                  Choose a starting point or describe the result you need.
                  This local demo prepares a workflow; it does not retrieve live law or file anything.
                </p>
                <div className="prompt-grid">
                  {prompts.map((prompt) => (
                    <button className="prompt-card" onClick={() => selectPrompt(prompt)} type="button" key={prompt}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="assistant-response" aria-live="polite">
              <div className="assistant-query">
                <span>You asked</span>
                <p>{submittedPrompt}</p>
              </div>
              <div className="prepared-answer">
                <div className="answer-heading">
                  <span className="answer-icon"><CheckCircleIcon /></span>
                  <div>
                    <p className="eyebrow">Prepared from local demo data</p>
                    <h2>{answer.title}</h2>
                  </div>
                </div>
                <p className="answer-summary">{answer.summary}</p>
                <ol className="answer-steps">
                  {answer.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <div className="answer-actions">
                  {answer.clientId ? (
                    <Link className="button primary" href={`/clients/${answer.clientId}`}>
                      Open {answer.clientLabel}
                    </Link>
                  ) : (
                    <Link className="button primary" href="/clients">Review clients</Link>
                  )}
                  <Link className="button" href="/settings">Connect a source</Link>
                </div>
              </div>
              <ReviewGate
                title="A professional must verify this"
                description="This result is generated from illustrative local data. Confirm the authority, effective date, applicability, and client records before acting."
              />
            </div>
          )}

          <form className="composer" onSubmit={submit}>
            <textarea
              aria-label="Ask Reg Mitra"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Describe the outcome you need…"
              value={draft}
            />
            <div className="composer-actions">
              <span className="composer-note">Local demo · no live AI or external systems</span>
              <button className="button primary" disabled={!draft.trim()} type="submit">
                Prepare <ArrowUpIcon />
              </button>
            </div>
          </form>
        </section>

        <aside className="context-panel" aria-label="Trust and review context">
          <div className="context-section">
            <p className="eyebrow">What is available</p>
            <h2>Local demo workspace</h2>
            <div className="context-item"><TrustBadge kind="evidence" state="demo" /><span>Six illustrative client profiles.</span></div>
            <div className="context-item"><TrustBadge kind="evidence" state="not-connected" /><span>No live regulatory or portal data.</span></div>
          </div>
          <div className="context-section">
            <p className="eyebrow">Safe result</p>
            <h2>Every answer should leave you with</h2>
            <div className="context-item"><span className="context-num">1</span><span>A plain-language conclusion.</span></div>
            <div className="context-item"><span className="context-num">2</span><span>A short, ordered review path.</span></div>
            <div className="context-item"><span className="context-num">3</span><span>A visible source and approval state.</span></div>
          </div>
        </aside>
      </div>
    </>
  );
}
