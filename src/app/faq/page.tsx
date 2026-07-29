import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { faqQuestions } from "@/lib/faq";

export default function FaqPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Understand Reg Mitra</p>
          <h1>What Reg Mitra does, how it helps, and where judgment stays human.</h1>
        </header>
        <section className="faq-list">
          {faqQuestions.map(([question, answer], index) => (
            <details key={question}>
              <summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<i>+</i></summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
        <section className="faq-cta faq-contact-box">
          <div>
            <p className="marketing-kicker">Use it with your workflow</p>
            <h2>Put one compliance workflow through Reg Mitra.</h2>
            <p>Monitor the source, identify affected clients, explain the impact, and prepare the next step—with professional review built in.</p>
          </div>
          <div className="faq-contact-actions">
            <Link className="marketing-button" href="/demo">See Reg Mitra in action</Link>
            <Link className="marketing-button primary" href="/start">Start your 7-day trial</Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
