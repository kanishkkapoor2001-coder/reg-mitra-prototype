import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

const questions = [
  ["Is Reg Mitra legal or tax advice?", "No. It is a research and workflow aid for professionals. Applicability and filing decisions still require qualified review."],
  ["Are the calendar dates real?", "The recurring dates in the demo are based on linked official sources. Each item states its applicability and may still be affected by notifications, holidays, extensions, or a client’s facts."],
  ["Can I use my real client data?", "Not yet. The current workspace is a product demo with sample records. Private customer workspaces will open only after production authentication and data controls are in place."],
  ["What does the AI assistant use?", "The demo assistant uses Gemini through a server-side connection. It is instructed to distinguish general guidance from verified evidence and should be professionally reviewed."],
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
          <Link className="marketing-button primary" href="/login">Open demo workspace</Link>
        </section>
      </main>
    </PublicShell>
  );
}
