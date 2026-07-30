import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { faqQuestions } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Reg Mitra FAQ",
  description: "Clear answers about Reg Mitra’s sources, coverage, client-impact review, data boundaries, and seven-day pilot.",
};

export default function FaqPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Before you try Reg Mitra</p>
          <h1>What the pilot does—and what it does not.</h1>
          <p>Clear answers about sources, coverage, client data, and external actions.</p>
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
            <p className="marketing-kicker">See the review flow</p>
            <h2>Explore the sample workspace before adding any firm data.</h2>
            <p>Follow a source-linked question, client check, and prepared draft using sample records.</p>
          </div>
          <div className="faq-contact-actions">
            <Link className="marketing-button" href="/demo">Explore the sample workspace</Link>
            <Link className="marketing-button primary" href="/today">Open the product</Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
