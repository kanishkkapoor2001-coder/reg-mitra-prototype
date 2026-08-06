import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Regulatory Radar — the Reg Mitra newsletter",
  description:
    "A free Monday, Wednesday and Friday brief on what Indian regulators actually published — what changed, who should examine it, and a link to the official text.",
};

const NEWSLETTER_ARCHIVE = "https://reg-mitra.vercel.app/issues";

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
      <main className="editorial-page newsletter-page">
        <section className="newsletter-hero">
          <div className="newsletter-hero-head">
            <p className="marketing-kicker">Regulatory Radar · free newsletter</p>
            <h1>Ten regulators. Three mornings a week. One short read.</h1>
          </div>

          <div
            className={subscribed ? "newsletter-signup is-done" : "newsletter-signup"}
            id="subscribe"
          >
            {subscribed ? (
              <p className="newsletter-form-success" role="status">
                You&rsquo;re on the list. The next issue goes out Monday
                morning — every email has a one-click unsubscribe.
              </p>
            ) : (
              <form
                className="newsletter-form"
                action="/api/newsletter-subscribe"
                method="post"
              >
                <p className="newsletter-signup-title">Get it free</p>

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
          </div>

          <div className="newsletter-hero-rest">
            <p className="newsletter-hero-lede">
              What India&rsquo;s regulators actually published — the change in
              plain English, the dates that bind, and a link to the official
              text.
            </p>
            <p className="newsletter-archive-link">
              <a href={NEWSLETTER_ARCHIVE} target="_blank" rel="noreferrer">
                Read past issues ↗
              </a>
            </p>
          </div>
        </section>

        <section className="newsletter-coverage" aria-label="Sources monitored">
          <p className="marketing-kicker">Checked on every run</p>
          <ul className="newsletter-sources">
            {regulators.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
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
