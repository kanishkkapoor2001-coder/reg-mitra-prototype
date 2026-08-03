"use client";

import { useEffect, useState } from "react";

// Rotates the object of the hero sentence through the real rule types Reg Mitra
// tracks. Kept on its own headline line so width changes never reflow the rest.
const WORDS = [
  "GST notification",
  "CBDT circular",
  "RBI direction",
  "FSSAI order",
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
