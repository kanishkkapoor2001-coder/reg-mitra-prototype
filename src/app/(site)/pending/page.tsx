import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = {
  title: "Access requested",
  description: "Your Reg Mitra access request is being reviewed.",
};

export default async function PendingPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ status?: string; error?: string }> }>) {
  const params = await searchParams;
  const rejected = params.status === "rejected";
  const unavailable = Boolean(params.error);

  return (
    <PublicShell>
      <main className="editorial-page">
        <header className="editorial-hero narrow">
          <p className="marketing-kicker">
            {rejected ? "Request closed" : unavailable ? "Just a moment" : "Request received"}
          </p>
          <h1>
            {rejected
              ? "This account isn’t open."
              : unavailable
                ? "We couldn’t confirm your access."
                : "You’re on the list."}
          </h1>
          <p>
            {rejected
              ? "We couldn’t open a workspace for this account. If you think that’s a mistake, reply to us and we’ll take another look."
              : unavailable
                ? "Your sign-in worked, but we couldn’t read your access status just now. Refresh in a minute — if it keeps happening, email us."
                : "Your account is signed in and your request is with us. We open workspaces by hand, so there’s nothing more for you to do — we’ll email you as soon as yours is ready."}
          </p>
        </header>

        <section className="pending-card">
          <p className="pending-card-title">What happens next</p>
          <ol className="pending-steps">
            <li><span>01</span> We confirm your firm and set up billing with you directly</li>
            <li><span>02</span> Your workspace is opened and your 7-day trial starts</li>
            <li><span>03</span> You get an email — sign in again and you’re straight in</li>
          </ol>
        </section>

        <p className="pricing-foot">
          Need it sooner? <a href="mailto:kanishk@learno.ai">Email us</a> or message us on{" "}
          <a href="https://wa.me/919711017316" target="_blank" rel="noreferrer">WhatsApp</a>.
        </p>
      </main>
    </PublicShell>
  );
}
