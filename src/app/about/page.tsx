import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Why Reg Mitra exists",
  description: "See why Reg Mitra keeps official sources, client context, and review-ready work together for Indian CA firms.",
};

export default function AboutPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero">
          <p className="marketing-kicker">Why Reg Mitra exists</p>
          <h1>A regulatory update should not become five disconnected tasks.</h1>
          <p>A team may find the publication in one place, check client facts in another, draft a note elsewhere, and reconstruct the reasoning at review. Reg Mitra is being built to keep that chain together.</p>
        </header>
        <section className="manifesto-grid">
          <p>The goal is not more alerts. It is a faster, evidence-backed decision about what matters, for whom, and what happens next.</p>
          <div>
            <h2>Start with the source</h2>
            <p>Every regulatory answer should show the authority behind it, when the material was checked, and any gap that prevents a conclusion.</p>
            <h2>Make client context part of the question</h2>
            <p>A change matters only in the context of a client’s facts. Reg Mitra brings recorded context and open work into the review instead of treating the publication as generic news.</p>
            <h2>Prepare work without disguising it as completion</h2>
            <p>Draft a brief, checklist, calendar update, or client note. Professional approval—and any sending, filing, payment, or portal action—remains explicit.</p>
            <h2>Where Reg Mitra is today</h2>
            <p>Reg Mitra is currently a private pilot. The current build includes a selected official-source library, source-linked Answer and Prepare sessions, client and task workspaces, a source-linked calendar, and review controls. Automated regulatory discovery, Tally and portal connections, and external execution are not yet production capabilities.</p>
          </div>
        </section>
        <section className="editorial-callout">
          <blockquote>Less time reconstructing the research. More time reviewing the decision.</blockquote>
          <Link className="marketing-button primary" href="/demo">Explore the sample workspace</Link>
        </section>
      </main>
    </PublicShell>
  );
}
