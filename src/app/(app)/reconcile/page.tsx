import type { Metadata } from "next";
import { ReconcileExperience } from "@/components/reconcile-experience";

export const metadata: Metadata = {
  title: "Reconcile 2B",
  description: "Match GSTR-2B against the purchase register, invoice by invoice, in the browser.",
};

// The back-end task Apoorv named as the real value: GSTR-2B against the books,
// which every firm currently does by eye across two Excel dumps. The matching
// runs entirely client-side (see reconcile-experience) — this file only frames
// the page.
export default function ReconcilePage() {
  return (
    <>
      <header className="today-hero">
        <div>
          <p className="eyebrow">Back-end work · GST</p>
          <h1>Reconcile GSTR-2B with the books</h1>
          <p>
            Invoice-level matching between what suppliers filed and what is booked — the manual
            Excel job, done in seconds, with every exception explained.
          </p>
        </div>
      </header>
      <ReconcileExperience />
    </>
  );
}
