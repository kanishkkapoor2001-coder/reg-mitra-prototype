import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Regulatory Radar — the Reg Mitra newsletter",
  description:
    "A free Monday, Wednesday and Friday brief on what Indian regulators actually published — what changed, who should examine it, and a link to the official text.",
};

const NEWSLETTER_ARCHIVE = "https://reg-mitra.vercel.app/issues";

const steps = [
  {
    num: "1",
    title: "Read the official source",
    body: "Every issue is built from what the regulator published — not a news summary, a forwarded PDF, or a LinkedIn post.",
  },
  {
    num: "2",
    title: "Reduce it to the change",
    body: "One circular becomes a few lines: what actually changed, the dates that bind, and the action worth considering.",
  },
  {
    num: "3",
    title: "Check who it applies to",
    body: "Applicability is extracted twice and both passes must agree against the exact wording before it is published.",
  },
  {
    num: "4",
    title: "Send it with the receipt",
    body: "You get the short brief, the longer expert reading, and a direct link to the official publication to verify.",
  },
];

const regulators = [
  "CBIC",
  "GSTN",
  "Income Tax",
  "RBI",
  "SEBI",
  "FSSAI",
  "DGFT",
  "IBBI",
  "IRDAI",
  "EPFO",
];

const errors: Record<string, string> = {
  email: "Enter a valid email address.",
  profession: "Choose one option so we know who you are.",
  rate: "Too many attempts just now. Try again in a few minutes.",
  server: "Something went wrong on our side. Please try again.",
  invalid: "Something went wrong on our side. Please try again.",
};

export default async function NewsletterPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ subscribed?: string; error?: string }>;
}>) {
  const params = await searchParams;
  const subscribed = params.subscribed === "1";
  const error = params.error ? errors[params.error] : null;

  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero">
          <p className="marketing-kicker">Regulatory Radar · free newsletter</p>
          <h1>Ten regulators. Three mornings a week. One short read.</h1>
          <p>
            Regulatory Radar is the free brief behind Reg Mitra. Every Monday,
            Wednesday and Friday it turns what India&rsquo;s regulators actually
            published into a few lines you can act on — each one linked back to
            the official text.
          </p>
          <div className="marketing-actions">
            <Link className="marketing-button primary" href="/signup?plan=pro">
              Start free trial
            </Link>
            <a className="marketing-button quiet" href="#subscribe">
              Subscribe free
            </a>
          </div>
        </header>

        <section className="about-lead">
          <p className="marketing-kicker">The point</p>
          <p className="about-lead-line">
            You do not need to be told a circular exists. You need to know
            whether it touches one of your clients — and to prove why.
          </p>
        </section>

        <section className="about-flow" aria-label="How each issue is built">
          <div className="section-intro">
            <p className="marketing-kicker">How each issue is built</p>
            <h2>Four steps, and the fourth one is the receipt.</h2>
          </div>
          <ol className="flow">
            {steps.map((step) => (
              <li className="flow-step" key={step.num}>
                <span className="flow-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="newsletter-coverage" aria-label="Sources monitored">
          <div className="section-intro">
            <p className="marketing-kicker">What it watches</p>
            <h2>Ten official sources, checked on every run.</h2>
          </div>
          <ul className="newsletter-sources">
            {regulators.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

        <section className="compare-section" aria-label="What the brief will and will not claim">
          <div className="compare-grid">
            <div className="compare-card">
              <p className="compare-label">What you get</p>
              <p>
                The change in plain English, the dates, who should examine it,
                and a link to the official publication. Short enough to read
                before your first meeting.
              </p>
            </div>
            <div className="compare-card">
              <p className="compare-label">What it will not do</p>
              <p>
                Guess. If the official text is incomplete or the two passes
                disagree, the applicability line is withheld rather than
                published. A missing answer beats a confident wrong one.
              </p>
            </div>
          </div>
        </section>

        <section className="newsletter-subscribe" id="subscribe">
          <div className="section-intro">
            <p className="marketing-kicker">Get it free</p>
            <h2>Have the next issue in your inbox on Monday.</h2>
          </div>

          {subscribed ? (
            <p className="newsletter-form-success" role="status">
              You&rsquo;re on the list. The next issue goes out Monday morning —
              every email has a one-click unsubscribe.
            </p>
          ) : (
            <form className="newsletter-form" action="/api/newsletter-subscribe" method="post">
              <label htmlFor="newsletter-email">Work email</label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@firm.in"
              />

              <fieldset className="newsletter-form-choice">
                <legend>Are you a CA or accounts professional?</legend>
                <label>
                  <input type="radio" name="profession" value="ca" defaultChecked />
                  <span>Yes</span>
                </label>
                <label>
                  <input type="radio" name="profession" value="other" />
                  <span>No</span>
                </label>
              </fieldset>

              {/* Honeypot — hidden from people, irresistible to bots. */}
              <div className="newsletter-form-trap" aria-hidden="true">
                <label htmlFor="newsletter-company">Company</label>
                <input id="newsletter-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              {error ? (
                <p className="newsletter-form-error" role="alert">{error}</p>
              ) : null}

              <button className="marketing-button primary" type="submit">
                Subscribe free
              </button>
              <p className="newsletter-form-note">
                Three issues a week. No cost, no card, unsubscribe in one click.
              </p>
            </form>
          )}
        </section>

        <section className="about-callout">
          <blockquote>
            The newsletter tells you something changed. Reg Mitra tells you
            which of your clients it lands on.
          </blockquote>
          <Link className="marketing-button primary" href="/signup?plan=pro">
            Start free trial
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
