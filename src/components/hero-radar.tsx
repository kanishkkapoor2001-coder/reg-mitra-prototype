"use client";

import { useEffect, useRef, useState } from "react";

// A calm, source-grounded "match" panel for the hero.
// A real regulatory change arrives; the client book resolves into the few it
// touches and the rest, cleared. Every match cites the official circular.
// Motion is a pure function of phase, so it loops, pauses off-screen, and
// collapses to a complete resting frame under reduced motion.

type Client = { id: string; name: string; tag: string };
type Cycle = {
  authority: string;
  tone: "fssai" | "cbdt";
  change: string;
  date: string;
  affected: string[];
  detail: { name: string; reason: string; cite: string; url: string };
};

const CLIENTS: Client[] = [
  { id: "sharma", name: "Sharma Pharma", tag: "Pharma · MH" },
  { id: "royal", name: "Royal Spice Foods", tag: "Packaged food · DL" },
  { id: "annapurna", name: "Annapurna Foods", tag: "Food processing · MH" },
  { id: "asha", name: "Asha Foundation", tag: "Charitable trust · MH" },
  { id: "meridian", name: "Meridian Tech", tag: "IT services · KA" },
  { id: "gupta", name: "Gupta Textiles", tag: "Textile trading · GJ" },
];

const CYCLES: Cycle[] = [
  {
    authority: "FSSAI",
    tone: "fssai",
    change: "Licensing & Registration — Second Amendment, 2026",
    date: "1 Jun 2026",
    affected: ["royal", "annapurna"],
    detail: {
      name: "Royal Spice Foods",
      reason: "Holds an FSSAI manufacturing licence — the amended production and storage-record rules apply.",
      cite: "FSSAI · Second Amendment, 2026",
      url: "https://www.fssai.gov.in/upload/notifications/2026/06/6a3c0a8fbaf61273797.pdf",
    },
  },
  {
    authority: "CBDT",
    tone: "cbdt",
    change: "Condonation of delay in Form 10AB — 80G approval",
    date: "2 Jul 2026",
    affected: ["asha"],
    detail: {
      name: "Asha Foundation",
      reason: "Registered under section 12A — its 80G re-approval via Form 10AB is now condonable.",
      cite: "CBDT · Circular No. 06/2026",
      url: "https://www.incometaxindia.gov.in/w/circular-no.-06/2026-condonation-of-delay-in-filing-form-no.-10ab-electronically-for-approval-under-clause-ii-of-the-first-proviso-to-section-80g-5-of-the-income-tax-act-1961",
    },
  },
];

type Phase = "idle" | "scan" | "resolved";

export function HeroRadar() {
  const ref = useRef<HTMLDivElement>(null);
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<Phase>("resolved");

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCycle(0);
      setPhase("resolved");
      return;
    }

    let timers: number[] = [];
    let running = false;
    let c = 0;
    const clear = () => {
      for (const t of timers) window.clearTimeout(t);
      timers = [];
    };
    const run = () => {
      setCycle(c);
      setPhase("idle");
      timers.push(window.setTimeout(() => setPhase("scan"), 520));
      timers.push(window.setTimeout(() => setPhase("resolved"), 2650));
      timers.push(
        window.setTimeout(() => {
          c = (c + 1) % CYCLES.length;
          run();
        }, 7200),
      );
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !running) {
          running = true;
          run();
        } else if (!entry?.isIntersecting && running) {
          running = false;
          clear();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      clear();
    };
  }, []);

  const cy = CYCLES[cycle]!;
  const affected = new Set(cy.affected);
  const resolved = phase === "resolved";
  const clearedCount = CLIENTS.length - cy.affected.length;

  return (
    <div className={`hero-radar tone-${cy.tone} phase-${phase}`} ref={ref} aria-hidden="true">
      <div className="hero-radar-bar">
        <span className="hero-radar-book">Client book</span>
        <span className="hero-radar-fresh"><i />28 sources · updated 29 Jul</span>
      </div>

      <div className="hero-radar-change">
        <span className="hero-radar-auth">
          <i className="hero-radar-dot" />
          {cy.authority}
        </span>
        <span className="hero-radar-change-title">{cy.change}</span>
        <span className="hero-radar-change-date">{cy.date}</span>
      </div>

      <div className="hero-radar-list">
        <span className="hero-radar-scan" aria-hidden="true" />
        {CLIENTS.map((client) => {
          const isHit = affected.has(client.id);
          const state = resolved ? (isHit ? "hit" : "cleared") : "";
          return (
            <div className={`hero-radar-row ${state}`} key={client.id}>
              <span className="hero-radar-name">{client.name}</span>
              <span className="hero-radar-tag">{client.tag}</span>
              <span className="hero-radar-state" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      <div className="hero-radar-detail">
        <p className="hero-radar-scanning">
          Matching your book against 28 official sources<span className="hero-radar-ell"><i>.</i><i>.</i><i>.</i></span>
        </p>
        <div className="hero-radar-detail-body">
          <span className="hero-radar-detail-name">{cy.detail.name}</span>
          <p className="hero-radar-detail-reason">{cy.detail.reason}</p>
          <span className="hero-radar-cite">{cy.detail.cite} <i>↗</i></span>
        </div>
      </div>

      <div className="hero-radar-foot">
        <span className="hero-radar-count">
          <strong>{cy.affected.length}</strong> of {CLIENTS.length} may be affected
        </span>
        <span className="hero-radar-cleared">{clearedCount} cleared</span>
      </div>
    </div>
  );
}
