"use client";

import { useEffect, useState } from "react";

// Rotates the object of the hero sentence through the rule types Reg Mitra
// actually ingests. Kept on its own headline line so width changes never
// reflow the rest.
//
// Only name a regulator we have a working scraper for. FSSAI was listed while
// the pipeline held zero FSSAI documents — the scraper works, but FSSAI
// publishes rarely and nothing had landed. A headline that names a source we
// cannot show anything from is the same overclaim this product exists to avoid.
const WORDS = [
  "GST notification",
  "CBDT circular",
  "RBI direction",
  "EPFO circular",
  "MCA update",
  "SEBI circular",
];

const INTERVAL_MS = 2400;

export function RotatingWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % WORDS.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="hero-rotator" aria-live="polite">
      <span className="hero-rotator-word" key={WORDS[i]}>{WORDS[i]}</span>
    </span>
  );
}
