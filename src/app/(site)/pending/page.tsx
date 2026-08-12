import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { parseIntent } from "@/lib/billing/signup-intent";

export const metadata: Metadata = {
  title: "Access requested",
  description: "Your Reg Mitra access request is being reviewed.",
};

export default async function PendingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ status?: string; error?: string; intent?: string }> }>) {
  const params = await searchParams;
  const rejected = params.status === "rejected";
  const unavailable = Boolean(params.error);
  // A firm that asked to pay gets told what it bought, not that it is queued.
  const founding = !rejected && !unavailable && parseIntent(params.intent) === "paid";

  return (
    <PublicShell authPage>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">
            {rejected
              ? "Request closed"
              : unavailable
                ? "Just a moment"
                : founding ? "Founding firm" : "Request received"}
          </p>
          <h1>
            {rejected
              ? "This account isn’t open."
              : unavailable
                ? "We couldn’t confirm your access."
                : founding
                  ? "We’ll set you up ourselves."
                  : "You’re on the list."}
          </h1>
          <p>
            {rejected
              ? "We couldn’t open a workspace for this account. If you think that’s a mistake, reply to us and we’ll take another look."
              : unavailable
                ? "Your sign-in worked, but we couldn’t read your access status just now. Refresh in a minute — if it keeps happening, email us."
                : founding
                  ? "Reg Mitra is early, and the firms joining now get something later ones won’t: we set the product up around your practice by hand, and you deal with the person who builds it. Expect to hear from us within a working day."
                  : "Your account is signed in and your request is with us. We open workspaces by hand, so there’s nothing more for you to do — we’ll email you as soon as yours is ready."}
          </p>
        </header>

        {founding ? (
          <section className="pending-card">
            <p className="pending-card-title">What being a founding firm means</p>
            <ol className="pending-steps">
              <li><span>01</span> We load your client book with you — you don’t start at an empty screen</li>
              <li><span>02</span> A direct line to the founder on WhatsApp, not a support queue</li>
              <li><span>03</span> Your price is held for as long as you stay, whatever we charge later</li>
              <li><span>04</span> What you ask for goes to the front of what gets built next</li>
            </ol>
          </section>
        ) : (
          <section className="pending-card">
            <p className="pending-card-title">What happens next</p>
            <ol className="pending-steps">
              <li><span>01</span> We confirm your firm and set up billing with you directly</li>
              <li><span>02</span> Your workspace is opened and your 7-day trial starts</li>
              <li><span>03</span> You get an email — sign in again and you’re straight in</li>
            </ol>
          </section>
        )}

        <p className="pricing-foot">
          {founding ? "Want to talk now? " : "Need it sooner? "}
          <a href="mailto:kanishk@5avenures.in">Email us</a> or message us on{" "}
          <a href="https://wa.me/919711017316" target="_blank" rel="noreferrer">WhatsApp</a>.
        </p>
      </main>
    </PublicShell>
  );
}
