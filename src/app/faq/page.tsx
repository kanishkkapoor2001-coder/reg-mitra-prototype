import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

const questions = [
  ["Is Reg Mitra legal or tax advice?", "No. It is a research and workflow aid for professionals. Applicability and filing decisions still require qualified review."],
  ["Are the calendar dates real?", "The recurring dates are based on linked official sources. Each item states its applicability and may still be affected by notifications, holidays, extensions, or a client’s facts."],
  ["Can I use my real client data?", "Not yet. This local early-access workspace is not approved for confidential client data. Private customer workspaces will open after production authentication and data controls are in place."],
  ["How does the AI assistant work?", "The assistant uses a protected server-side AI connection. It is instructed to distinguish general guidance from verified evidence and should be professionally reviewed."],
  ["When will paid access launch?", "After secure customer authentication, billing, and service terms are ready. Pricing will be published before any paywall is activated."],
] as const;

export default function FaqPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Frequently asked</p>
          <h1>Clear answers before you enter.</h1>
        </header>
        <section className="faq-list">
          {questions.map(([question, answer], index) => (
            <details key={question}>
              <summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<i>+</i></summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
        <section className="faq-cta">
          <h2>See it in practice.</h2>
          <Link className="marketing-button primary" href="/start">Start today</Link>
        </section>
      </main>
    </PublicShell>
  );
}
