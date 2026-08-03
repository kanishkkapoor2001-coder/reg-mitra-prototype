import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Why Reg Mitra exists",
  description: "Why Reg Mitra keeps the official source, client context, and review-ready work together for Indian CA firms.",
};

const principles = [
  {
    num: "01",
    title: "Start with the source",
    body: "Every answer shows the authority behind it, when it was checked, and any gap that prevents a conclusion.",
  },
  {
    num: "02",
    title: "Make the client part of the question",
    body: "A change matters only in the context of a client's facts — so we bring recorded context and open work into the review, not generic news.",
  },
  {
    num: "03",
    title: "Prepare the work, not completion",
    body: "Draft a brief, checklist, calendar update, or client note. Approval — and any sending or filing — stays explicit and yours.",
  },
  {
    num: "04",
    title: "Where Reg Mitra is today",
    body: "A private pilot: a selected official-source library, source-linked answers, client and task workspaces, and a source-linked calendar. Automated discovery and portal filing are not yet live.",
  },
];

export default function AboutPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero">
          <p className="marketing-kicker">Why Reg Mitra exists</p>
          <h1>A regulatory update should not become five disconnected tasks.</h1>
          <p>Teams find the publication in one place, check client facts in another, draft a note elsewhere, and rebuild the reasoning at review. Reg Mitra keeps that chain together.</p>
        </header>

        <section className="about-lead">
          <p className="marketing-kicker">The point</p>
          <p className="about-lead-line">
            The goal is not more alerts. It&rsquo;s a faster, evidence-backed decision about
            what matters, for whom, and what happens next.
          </p>
        </section>

        <section className="about-principles" aria-label="How Reg Mitra is built">
          {principles.map((p) => (
            <article className="about-principle" key={p.num}>
              <span className="about-principle-num">{p.num}</span>
              <h2>{p.title}</h2>
              <p>{p.body}</p>
            </article>
          ))}
        </section>

        <section className="about-callout">
          <blockquote>Less time reconstructing the research. More time reviewing the decision.</blockquote>
          <Link className="marketing-button primary" href="/today">Open the product</Link>
        </section>
      </main>
    </PublicShell>
  );
}
