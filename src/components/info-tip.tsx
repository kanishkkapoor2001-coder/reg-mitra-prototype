"use client";

import { useId, type ReactNode } from "react";

export function InfoTip({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  const tooltipId = useId();

  return (
    <span className="info-tip">
      <button aria-describedby={tooltipId} aria-label={label} type="button">?</button>
      <span id={tooltipId} role="tooltip">{children}</span>
    </span>
  );
}
