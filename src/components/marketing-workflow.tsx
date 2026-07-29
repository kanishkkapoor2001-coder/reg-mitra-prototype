import type { CSSProperties } from "react";

const workflowNodes = [
  {
    className: "workflow-source",
    eyebrow: "01 · Official source",
    title: "A rule changes",
    description: "A circular, notification, or deadline appears.",
  },
  {
    className: "workflow-radar",
    eyebrow: "02 · Source check",
    title: "Reg Mitra checks the source",
    description: "Keeps the authority, date, and original text attached.",
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
    description: "Checks profile, registrations, location, and transactions.",
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
          <p className="marketing-kicker">The path through Reg Mitra</p>
          <h2 id="workflow-title">One update in. The right client action out.</h2>
        </div>
        <p>
          The system reads the official source, explains the change, finds affected clients,
          and prepares the next step. Your team makes the final call.
        </p>
      </header>

      <div className="workflow-frame">
        <div className="workflow-live-label"><i /> Live workflow</div>
        <svg
          aria-hidden="true"
          className="workflow-lines"
          preserveAspectRatio="none"
          viewBox="0 0 1200 610"
        >
          <g className="workflow-base">
            <path d="M192 305 H252" />
            <path d="M444 305 C480 305 468 95 504 95" />
            <path d="M444 305 C480 305 468 515 504 515" />
            <path d="M696 95 C732 95 720 305 756 305" />
            <path d="M696 515 C732 515 720 305 756 305" />
            <path d="M948 305 H1008" />
          </g>
          <path d="M192 305 H252" pathLength="1" />
          <path d="M444 305 C480 305 468 95 504 95" pathLength="1" />
          <path d="M444 305 C480 305 468 515 504 515" pathLength="1" />
          <path d="M696 95 C732 95 720 305 756 305" pathLength="1" />
          <path d="M696 515 C732 515 720 305 756 305" pathLength="1" />
          <path d="M948 305 H1008" pathLength="1" />
          <circle className="workflow-pulse pulse-one" cx="192" cy="305" r="4" />
          <circle className="workflow-pulse pulse-two" cx="444" cy="305" r="4" />
          <circle className="workflow-pulse pulse-three" cx="696" cy="515" r="4" />
          <circle className="workflow-pulse pulse-four" cx="948" cy="305" r="4" />
          <circle className="workflow-runner" r="5">
            <animateMotion
              begin="0s"
              dur="7.2s"
              path="M192 305 H252 M252 305 H444 C480 305 468 95 504 95"
              repeatCount="indefinite"
            />
          </circle>
          <circle className="workflow-runner secondary" r="5">
            <animateMotion
              begin="2.2s"
              dur="7.2s"
              path="M444 305 C480 305 468 515 504 515 H696 C732 515 720 305 756 305"
              repeatCount="indefinite"
            />
          </circle>
          <circle className="workflow-runner" r="5">
            <animateMotion
              begin="4.3s"
              dur="7.2s"
              path="M756 305 H948 H1008"
              repeatCount="indefinite"
            />
          </circle>
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
        The moving signal is the core value: one official update becomes the right action for the right client.
      </p>
    </section>
  );
}
