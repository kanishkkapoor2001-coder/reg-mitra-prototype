import { PageHeading } from "@/components/page-heading";

const prompts = [
  "What changed for Sharma Pharma this week?",
  "Prepare a review checklist for the next filing deadline",
  "Compare our demo obligations across all clients",
  "Explain the source and confidence behind a regulation",
] as const;

export default function AssistantPage() {
  return (
    <>
      <PageHeading
        eyebrow="Research assistant"
        title="Ask Reg Mitra"
        description="Research regulations and prepare compliance work with clear sources, confidence, and human review."
      />
      <div className="assistant-layout">
        <section className="assistant-main">
          <div className="assistant-welcome">
            <div>
              <span className="assistant-symbol" aria-hidden="true">✦</span>
              <h1>How can I help with compliance today?</h1>
              <p>
                Ask a question about a client, regulation, filing, or deadline.
                Answers should cite their source and will remain drafts until reviewed.
              </p>
              <div className="prompt-grid">
                {prompts.map((prompt) => <button className="prompt-card" type="button" key={prompt}>{prompt}</button>)}
              </div>
            </div>
          </div>
          <form className="composer">
            <textarea aria-label="Message Reg Mitra" placeholder="Ask about a client, regulation, or filing…" />
            <div className="composer-actions">
              <span className="composer-note">No client or portal data is connected in this demo.</span>
              <button className="button primary" type="submit">Send <span aria-hidden="true">↑</span></button>
            </div>
          </form>
        </section>
        <aside className="context-panel" aria-label="Assistant context">
          <div className="context-section">
            <p className="eyebrow">Current context</p>
            <h2>Demo workspace</h2>
            <div className="context-item"><span className="context-num">6</span><span>Illustrative client profiles available for questions.</span></div>
            <div className="context-item"><span className="context-num">0</span><span>Verified external sources connected.</span></div>
          </div>
          <div className="context-section">
            <p className="eyebrow">Review standard</p>
            <h2>Before using an answer</h2>
            <div className="context-item"><span className="context-num">1</span><span>Check the cited circular or portal source.</span></div>
            <div className="context-item"><span className="context-num">2</span><span>Confirm applicability to the client and period.</span></div>
            <div className="context-item"><span className="context-num">3</span><span>Have a responsible professional approve the action.</span></div>
          </div>
        </aside>
      </div>
    </>
  );
}
