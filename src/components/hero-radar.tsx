"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A slow, click-through walkthrough of the product's client-impact view.
// One real regulatory change is matched across a sample client book, then
// prepared into review-ready work. Auto-advances gently; the viewer can click
// any step to drive it.

type Client = { id: string; name: string; tag: string };

// The walkthrough uses a circular Reg Mitra has actually ingested, verified and
// can match today — an RBI direction with a live applicability rule — rather
// than an illustrative one. The previous FSSAI example was plausible but the
// product held no FSSAI rule behind it, so the demo promised something the
// system could not yet do.
const CLIENTS: Client[] = [
  { id: "sharma", name: "Sharma Pharma", tag: "Pharma · MH" },
  { id: "sahyadri", name: "Sahyadri Co-op Bank", tag: "Rural co-op bank · MH" },
  { id: "godavari", name: "Godavari Gramin Bank", tag: "Rural co-op bank · MH" },
  { id: "asha", name: "Asha Foundation", tag: "Charitable trust · MH" },
  { id: "meridian", name: "Meridian Tech", tag: "IT services · KA" },
  { id: "gupta", name: "Gupta Textiles", tag: "Textile trading · GJ" },
];

const AFFECTED = new Set(["sahyadri", "godavari"]);

const CHANGE = {
  authority: "RBI",
  title: "Rural Co-operative Banks — IRACP Third Amendment Directions, 2026",
  date: "15 Jul 2026",
  summary: "Amended income recognition, asset classification and provisioning norms for rural co-operative banks.",
};

const DETAIL = {
  name: "Sahyadri Co-op Bank",
  reason: "A rural co-operative bank — the amended income recognition and provisioning norms apply to it directly.",
  cite: "RBI · IRACP Third Amendment Directions, 2026",
  url: "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13578&Mode=0",
};

const STEPS = [
  { label: "New rule", caption: "A new RBI direction is published — here's exactly what changed." },
  { label: "Checking", caption: "Reg Mitra checks it against every client in your book." },
  { label: "Flagged", caption: "It flags who may be affected — and clears the rest." },
  { label: "Why", caption: "Each flag shows why, linked to the official circular." },
  { label: "Prepare", caption: "Edit the brief, send by email or WhatsApp — then it's marked done and tracked to closure." },
];

const STEP_MS = 3800;

export function HeroRadar() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(3);
  const manualRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Reduced motion: leave the walkthrough on its initial resting step (3) and
    // never start the interval. No setState needed — that is already the state.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const clear = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const start = () => {
      clear();
      setStep(0);
      intervalRef.current = window.setInterval(() => {
        setStep((s) => (s + 1) % STEPS.length);
      }, STEP_MS);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !manualRef.current) start();
        else if (!entry?.isIntersecting) clear();
      },
      { threshold: 0.3 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      clear();
    };
  }, []);

  const goTo = useCallback((i: number) => {
    manualRef.current = true;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStep(i);
  }, []);

  const scanning = step === 1;
  const resolved = step >= 2;
  const clearedCount = CLIENTS.length - AFFECTED.size;

  return (
    <div className="hero-radar-wrap">
      <div
        className={`hero-radar tone-rbi step-${step}${scanning ? " is-scan" : ""}${resolved ? " is-resolved" : ""}`}
        ref={ref}
      >
        <div className="hero-radar-bar">
          <span className="hero-radar-book">Client book</span>
          <span className="hero-radar-fresh"><i />28 sources · updated just now</span>
        </div>

        <div className="hero-radar-change">
          <span className="hero-radar-change-eyebrow">Incoming change</span>
          <span className="hero-radar-change-date">{CHANGE.date}</span>
          <span className="hero-radar-auth"><i className="hero-radar-dot" />{CHANGE.authority}</span>
          <span className="hero-radar-change-title">{CHANGE.title}</span>
        </div>

        <div className="hero-radar-list">
          <span className="hero-radar-scan" aria-hidden="true" />
          {CLIENTS.map((client) => {
            const isHit = AFFECTED.has(client.id);
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
          {step === 4 ? (
            <div className="hero-radar-brief" key="brief">
              <div className="hero-radar-brief-head">
                <span className="hero-radar-brief-title">Client brief · {DETAIL.name}</span>
                <span className="hero-radar-brief-edit" aria-hidden="true">Edit</span>
              </div>
              <p className="hero-radar-brief-body">
                Following the RBI IRACP Third Amendment Directions (15 Jul 2026), your income
                recognition and provisioning norms need to be applied in the revised form. We&rsquo;ve
                prepared the checklist — please confirm your current classification so we can
                update your file.
              </p>
              <div className="hero-radar-brief-send">
                <span className="hero-radar-send email">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12v8H2z" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M2.5 4.5 8 8.5l5.5-4" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
                  Email
                </span>
                <span className="hero-radar-send wa">
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2a6 6 0 0 0-5.2 9L2 14l3.1-.8A6 6 0 1 0 8 2Z" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
                  WhatsApp
                </span>
                <span className="hero-radar-brief-note">Sends from your firm — only when you click.</span>
              </div>
              <div className="hero-radar-brief-track">
                <i className="hero-radar-track-tick" aria-hidden="true" />
                Sent items are marked done and logged to your audit trail.
              </div>
            </div>
          ) : step === 3 ? (
            <div className="hero-radar-detail-body" key="why">
              <span className="hero-radar-detail-name">{DETAIL.name}</span>
              <p className="hero-radar-detail-reason">{DETAIL.reason}</p>
              <a className="hero-radar-cite" href={DETAIL.url} target="_blank" rel="noreferrer">
                {DETAIL.cite} <i aria-hidden="true">↗</i>
              </a>
            </div>
          ) : step === 2 ? (
            <p className="hero-radar-hint" key="hint">2 clients flagged — open one to see why.</p>
          ) : scanning ? (
            <p className="hero-radar-scanning" key="scan">
              Checking your client book<span className="hero-radar-ell"><i>.</i><i>.</i><i>.</i></span>
            </p>
          ) : (
            <p className="hero-radar-rule-summary" key="rule">{CHANGE.summary}</p>
          )}
        </div>

        <div className="hero-radar-foot">
          {resolved ? (
            <>
              <span className="hero-radar-count"><strong>{AFFECTED.size}</strong> may be affected</span>
              <span className="hero-radar-cleared">{clearedCount} cleared</span>
            </>
          ) : (
            <span className="hero-radar-status">{CLIENTS.length} clients in your book</span>
          )}
        </div>
      </div>

      <div className="hero-radar-steps" role="tablist" aria-label="How Reg Mitra works, step by step">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-selected={i === step}
            className={`hero-radar-step${i === step ? " active" : ""}${i < step ? " done" : ""}`}
            onClick={() => goTo(i)}
          >
            <span className="hero-radar-step-num" aria-hidden="true">{i + 1}</span>
            <span className="hero-radar-step-label">{s.label}</span>
          </button>
        ))}
      </div>
      <p className="hero-radar-caption" aria-live="polite" key={step}>{STEPS[step]?.caption}</p>
    </div>
  );
}
