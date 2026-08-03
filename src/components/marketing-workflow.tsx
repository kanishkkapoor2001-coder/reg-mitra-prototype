const flowSteps = [
  {
    num: "1",
    title: "Start from the source",
    body: "The official rule itself — authority, date, and exact text. Never a summary.",
  },
  {
    num: "2",
    title: "See who it affects",
    body: "Reg Mitra matches it to your client book and flags who may be affected.",
  },
  {
    num: "3",
    title: "Prepare the work",
    body: "A brief, checklist, calendar update, or client note — drafted for your review.",
  },
  {
    num: "4",
    title: "You approve",
    body: "Nothing is sent, filed, or paid. A person signs off before anything is used.",
  },
] as const;

export function MarketingWorkflow() {
  return (
    <section className="workflow-explainer" id="workflow" aria-labelledby="workflow-title">
      <header className="workflow-heading">
        <div>
          <p className="marketing-kicker">How it works</p>
          <h2 id="workflow-title">Four steps from official rule to reviewed work.</h2>
        </div>
        <p>Reg Mitra does the first three. You always make the last call.</p>
      </header>

      <ol className="flow">
        {flowSteps.map((step) => (
          <li className="flow-step" key={step.num}>
            <span className="flow-num">{step.num}</span>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
