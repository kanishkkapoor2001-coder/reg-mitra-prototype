const workflowNodes = [
  {
    className: "workflow-source",
    eyebrow: "01 · Official source",
    title: "Start with the publication",
    description: "Open the authority, date, status, and original text behind the question.",
  },
  {
    className: "workflow-radar",
    eyebrow: "02 · Source-grounded answer",
    title: "See what changed",
    description: "Get a concise explanation with citations, caveats, and missing evidence.",
  },
  {
    className: "workflow-explain",
    eyebrow: "03A · Client context",
    title: "Check recorded facts",
    description: "Compare sector, location, registrations, and open work. Missing facts stay unknown.",
  },
  {
    className: "workflow-match",
    eyebrow: "03B · Applicability",
    title: "Identify who needs review",
    description: "Flag clients that may be affected and show what still needs confirmation.",
  },
  {
    className: "workflow-act",
    eyebrow: "04 · Prepare",
    title: "Create the next draft",
    description: "Prepare a brief, checklist, calendar update, document pack, or client note.",
  },
  {
    className: "workflow-review",
    eyebrow: "05 · Professional review",
    title: "Approve before use",
    description: "A named reviewer checks the source, client facts, and draft. Nothing is sent or filed.",
  },
] as const;

export function MarketingWorkflow() {
  return (
    <section className="workflow-explainer" id="workflow" aria-labelledby="workflow-title">
      <header className="workflow-heading">
        <div>
          <p className="marketing-kicker">How Reg Mitra works</p>
          <h2 id="workflow-title">Keep the source attached from question to review.</h2>
        </div>
        <p>
          Research the update, compare it with client context, and prepare the next piece of
          work. Your team decides the final position.
        </p>
      </header>

      <div className="workflow-frame">
        <div className="workflow-live-label"><i /> Review workflow</div>
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
        One review trail connects the publication, the client decision, and the prepared work.
      </p>
    </section>
  );
}
import type { CSSProperties } from "react";
