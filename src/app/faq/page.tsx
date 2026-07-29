import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { faqQuestions } from "@/lib/faq";

export default function FaqPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Frequently asked</p>
          <h1>Clear answers before you enter.</h1>
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
            <p className="marketing-kicker">A human answer</p>
            <h2>Ask a question or connect with us.</h2>
            <p>Talk through source coverage, a client workflow, or what a private pilot could look like for your firm.</p>
          </div>
          <div className="faq-contact-actions">
            <Link className="marketing-button" href="/demo">Ask in the template</Link>
            <Link className="marketing-button primary" href="/start">Connect with us</Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
