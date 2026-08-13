import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Priced on the size of your client book. Try Reg Mitra free for 7 days — no card.",
};

// kanishk@learno.ai (with the extra "a") is a dead mailbox — mail to it bounces
// and is suppressed at the provider, so enterprise enquiries sent there were
// never arriving.
const CONTACT_EMAIL = "kanishk@outreach.learno.ai";

const BANDS = [
  { id: "starter", name: "Starter", book: "Up to 25", price: "₹4,000/mo", perClient: "₹160", href: "/signup?plan=starter" },
  { id: "practice", name: "Practice", book: "Up to 100", price: "₹9,000/mo", perClient: "₹90", href: "/signup?plan=practice" },
  { id: "firm", name: "Firm", book: "Up to 300", price: "₹18,000/mo", perClient: "₹60", href: "/signup?plan=firm" },
  {
    id: "enterprise",
    name: "Enterprise",
    book: "Above 300",
    price: "Talk to us",
    perClient: "—",
    href: `mailto:${CONTACT_EMAIL}?subject=Reg%20Mitra%20enterprise%20plan`,
  },
] as const;

export default function PricingPage() {
  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">Pricing</p>
          <h1>Priced on the size of your book.</h1>
          <p>Run Reg Mitra against your real client book free for 7 days — no card required. Then pay for the band your practice actually is.</p>
        </header>

        {/* Priced on book size. Per-client cost falls as the book grows, so the
            table is the argument — three cards could not show that the ₹160 a
            small practice pays becomes ₹60 at scale. */}
        <section className="pricing-band-section" aria-label="Reg Mitra plans">
          <p className="pricing-band-intro">
            One price per band, billed monthly. Every plan includes the full product — matching,
            research, the compliance calendar and the weekly newsletter.
          </p>

          <div className="pricing-band-table-wrap">
            <table className="pricing-band-table">
              <caption className="visually-hidden">Reg Mitra plans by client book size</caption>
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Book</th>
                  <th scope="col">Price</th>
                  <th scope="col">Per client</th>
                  <th scope="col"><span className="visually-hidden">Get started</span></th>
                </tr>
              </thead>
              <tbody>
                {BANDS.map((band) => (
                  <tr key={band.id}>
                    <th scope="row">{band.name}</th>
                    <td>{band.book}</td>
                    <td className="pricing-band-price">{band.price}</td>
                    <td className="pricing-band-per">{band.perClient}</td>
                    <td className="pricing-band-cta">
                      {band.href.startsWith("mailto:") ? (
                        <a className="marketing-button quiet" href={band.href}>Talk to us</a>
                      ) : (
                        <Link className="marketing-button quiet" href={band.href}>Start free</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="pricing-band-note">
            Per-client cost falls as you grow, so moving up a band is a volume discount rather than
            a cliff. Start on the 7-day trial — no card, full product, your real client book.
          </p>
        </section>

        <p className="pricing-foot">
          Have a question about a plan? <a href={`mailto:${CONTACT_EMAIL}`}>Email us</a> or message
          us on <a href="https://wa.me/919711017316" target="_blank" rel="noreferrer">WhatsApp</a>.
        </p>
      </main>
    </PublicShell>
  );
}
