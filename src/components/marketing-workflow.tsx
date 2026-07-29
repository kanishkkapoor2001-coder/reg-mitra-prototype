import type { CSSProperties } from "react";

const workflowNodes = [
  {
    className: "workflow-source",
    eyebrow: "01 · Official source",
    title: "A rule changes",
    description: "A circular, notification, order, or deadline is published.",
  },
  {
    className: "workflow-radar",
    eyebrow: "02 · Source check",
    title: "Reg Mitra checks the source",
    description: "The authority, dates, and original source stay attached.",
  },
  {
    className: "workflow-explain",
    eyebrow: "03A · Explain",
    title: "Understand the impact",
    description: "A plain-English explanation, with anything uncertain clearly marked.",
  },
  {
    className: "workflow-match",
    eyebrow: "03B · Match",
    title: "Find affected clients",
    description: "Based on sector, location, registrations, profile, and transactions.",
  },
  {
    className: "workflow-act",
    eyebrow: "04 · Prepare",
    title: "Prepare the next step",
    description: "A client brief, task, checklist, calendar update, or draft.",
  },
  {
    className: "workflow-review",
    eyebrow: "05 · Review",
    title: "Your team reviews",
    description: "Nothing leaves the firm until a person approves it.",
  },
] as const;

export function MarketingWorkflow() {
  return (
    <section className="workflow-explainer" id="workflow" aria-labelledby="workflow-title">
      <header className="workflow-heading">
        <div>
          <p className="marketing-kicker">How Reg Mitra works</p>
          <h2 id="workflow-title">From official change to reviewed client action.</h2>
        </div>
        <p>
          Reg Mitra connects the source, the affected clients, and the next action in one
          clear workflow—so your firm can move earlier while keeping professional judgement.
        </p>
      </header>

      <div className="workflow-frame">
        <svg
          aria-hidden="true"
          className="workflow-lines"
          preserveAspectRatio="none"
          viewBox="0 0 1200 520"
        >
          <path d="M192 260 H252" pathLength="1" />
          <path d="M444 260 C480 260 468 80 504 80" pathLength="1" />
          <path d="M444 260 C480 260 468 440 504 440" pathLength="1" />
          <path d="M696 80 C732 80 720 260 756 260" pathLength="1" />
          <path d="M696 440 C732 440 720 260 756 260" pathLength="1" />
          <path d="M948 260 H1008" pathLength="1" />
          <circle className="workflow-pulse pulse-one" cx="192" cy="260" r="4" />
          <circle className="workflow-pulse pulse-two" cx="444" cy="260" r="4" />
          <circle className="workflow-pulse pulse-three" cx="696" cy="440" r="4" />
          <circle className="workflow-pulse pulse-four" cx="948" cy="260" r="4" />
        </svg>

        <ol className="workflow-grid">
          {workflowNodes.map((node, index) => (
            <li
              className={`workflow-node ${node.className}`}
              key={node.eyebrow}
              style={{ "--workflow-delay": `${index * 1.15}s` } as CSSProperties}
            >
              <span>{node.eyebrow}</span>
              <h3>{node.title}</h3>
              <p>{node.description}</p>
            </li>
          ))}
        </ol>
      </div>

      <p className="workflow-caption">
        One regulatory change becomes a sourced, client-specific, review-ready action.
      </p>
    </section>
  );
}
