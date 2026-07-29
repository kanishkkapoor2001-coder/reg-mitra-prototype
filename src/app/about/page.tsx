import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export default function AboutPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero">
          <p className="marketing-kicker">Why Reg Mitra exists</p>
          <h1>Compliance software should reduce cognitive load—not rearrange it.</h1>
          <p>We are building a workspace where deadlines, evidence, client context, and judgment stay connected.</p>
        </header>
        <section className="manifesto-grid">
          <p>Most regulatory tools begin with the database. Reg Mitra begins with the day of the person using it.</p>
          <div>
            <h2>Fewer places to look</h2>
            <p>A focused Today queue replaces the ritual of checking five systems before meaningful work can begin.</p>
            <h2>Evidence stays attached</h2>
            <p>Rules and AI answers should show where they came from, when they were checked, and what still needs professional judgment.</p>
            <h2>Complexity appears when needed</h2>
            <p>The default experience stays simple. Client detail, caveats, and source depth remain one step away.</p>
          </div>
        </section>
        <section className="editorial-callout">
          <blockquote>Simple is not the absence of substance. It is substance arranged around the user.</blockquote>
          <Link className="marketing-button primary" href="/start">Start today</Link>
        </section>
      </main>
    </PublicShell>
  );
}
