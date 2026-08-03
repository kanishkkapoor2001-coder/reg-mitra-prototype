const flowSteps = [
  {
    num: "1",
    title: "Start from the source",
    body: "The exact official circular — never a summary.",
  },
  {
    num: "2",
    title: "See who it affects",
    body: "We match it to your clients and flag who's affected.",
  },
  {
    num: "3",
    title: "Prepare the work",
    body: "A brief, checklist, or client note — ready for you.",
  },
  {
    num: "4",
    title: "You approve",
    body: "Nothing goes out until you sign off.",
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
