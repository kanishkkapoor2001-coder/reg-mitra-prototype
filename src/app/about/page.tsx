import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Why Reg Mitra exists",
  description: "Why Reg Mitra keeps the official source, client context, and review-ready work together for Indian CA firms.",
};

const principles = [
  {
    num: "1",
    title: "Start with the source",
    body: "Every answer shows its authority, when it was checked, and any gap.",
  },
  {
    num: "2",
    title: "Make the client the question",
    body: "A change matters only against a client's facts — so their context is in the review.",
  },
  {
    num: "3",
    title: "Prepare, don't fake done",
    body: "Draft the brief or note. Approval and any sending stay explicit and yours.",
  },
  {
    num: "4",
    title: "Where we are today",
    body: "A private pilot: source library, answers, workspaces, and a calendar. Portal filing isn't live yet.",
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

        <section className="about-flow" aria-label="How Reg Mitra is built">
          <ol className="flow">
            {principles.map((p) => (
              <li className="flow-step" key={p.num}>
                <span className="flow-num">{p.num}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-callout">
          <blockquote>Less time reconstructing the research. More time reviewing the decision.</blockquote>
          <Link className="marketing-button primary" href="/today">Open the product</Link>
        </section>
      </main>
    </PublicShell>
  );
}
