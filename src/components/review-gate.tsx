import type { ReactNode } from "react";
import { CheckCircleIcon } from "@/components/icons";
import { TrustBadge } from "@/components/trust-badge";

interface ReviewGateProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function ReviewGate({ title, description, children }: ReviewGateProps) {
  return (
    <section className="review-gate" aria-label="Professional review required">
      <span className="review-gate-icon"><CheckCircleIcon /></span>
      <div className="review-gate-copy">
        <div className="review-gate-title">
          <h3>{title}</h3>
          <TrustBadge kind="review" state="not-reviewed" />
        </div>
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}
