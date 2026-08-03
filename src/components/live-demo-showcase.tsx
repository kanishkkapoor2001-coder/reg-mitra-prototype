"use client";

import { useRef } from "react";
import { AssistantLiveDemo, useDemoTimeline, type DemoScene } from "@/components/live-demo";

// ---- Scene 2: Today review queue (cursor navigation, no typing) ----
const TODAY_SCENE: DemoScene = {
  total: 13,
  hold: 3,
  type: [],
  cursor: [
    { at: 0, xy: [120, 120] },
    { at: 1.3, to: "#rm-q1" },
    { at: 1.5, to: "#rm-q1", click: true },
    { at: 4.4, to: "#rm-q1-review" },
    { at: 4.6, to: "#rm-q1-review", click: true },
    { at: 8.5, to: "#rm-q2" },
    { at: 13, to: "#rm-q2" },
  ],
};

function TodayReviewDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  useDemoTimeline(rootRef, TODAY_SCENE);
  return (
    <div className="rm-demo" ref={rootRef} aria-hidden="true">
      <div className="rm-demo-window">
        <div className="rm-demo-titlebar">
          <span className="rm-demo-symbol">✓</span>
          <span className="rm-demo-title">Today</span>
          <span className="rm-demo-mode">Review queue</span>
          <span className="rm-demo-flag">
            <span className="rm-demo-node" data-at="0" data-until="4.6">5 need a decision</span>
            <span className="rm-demo-node" data-at="4.6">4 need a decision</span>
          </span>
        </div>
        <div className="rm-demo-queue">
          <div className="rm-demo-q" id="rm-q1">
            <div className="rm-demo-q-head">
              <span className="rm-demo-q-rank high">1</span>
              <span className="rm-demo-q-copy">
                <strong>Verify IGST rate change for pharma intermediates</strong>
                <small>Sharma Pharma · CBIC</small>
              </span>
              <span className="rm-demo-q-due high">Immediate</span>
            </div>
            <div className="rm-demo-q-detail rm-demo-node" data-at="1.6">
              <p>No approved applicability attached. Confirm the official source and client facts before acting.</p>
              <div className="rm-demo-q-actions">
                <span className="rm-demo-chip">Source not reviewed</span>
                <span className="rm-demo-q-review" id="rm-q1-review">✓ Mark reviewed</span>
              </div>
            </div>
            <div className="rm-demo-q-done rm-demo-node" data-at="4.9">✓ Reviewed · saved to audit history</div>
          </div>
          <div className="rm-demo-q" id="rm-q2">
            <div className="rm-demo-q-head">
              <span className="rm-demo-q-rank">2</span>
              <span className="rm-demo-q-copy">
                <strong>Review overdue FSSAI transition confirmation</strong>
                <small>Royal Spice · FSSAI</small>
              </span>
              <span className="rm-demo-q-due high">Overdue</span>
            </div>
          </div>
          <div className="rm-demo-q">
            <div className="rm-demo-q-head">
              <span className="rm-demo-q-rank">3</span>
              <span className="rm-demo-q-copy">
                <strong>Prepare TDS 26Q working papers</strong>
                <small>Sharma Pharma · CBDT</small>
              </span>
              <span className="rm-demo-q-due">15 Aug</span>
            </div>
          </div>
        </div>
      </div>
      <div className="rm-demo-cursor"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l6 16 2.5-6.5L19 9 4 2z" /></svg></div>
    </div>
  );
}

// ---- Scene 3: Client impact ----
const CLIENT_SCENE: DemoScene = {
  total: 12,
  hold: 3,
  type: [],
  cursor: [
    { at: 0, xy: [120, 120] },
    { at: 1.6, to: "#rm-cl-row" },
    { at: 1.8, to: "#rm-cl-row", click: true },
    { at: 7.5, to: "#rm-cl-confirm" },
    { at: 12, to: "#rm-cl-confirm" },
  ],
};

export function ClientImpactDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  useDemoTimeline(rootRef, CLIENT_SCENE);
  return (
    <div className="rm-demo" ref={rootRef} aria-hidden="true">
      <div className="rm-demo-window">
        <div className="rm-demo-titlebar">
          <span className="rm-demo-symbol">◍</span>
          <span className="rm-demo-title">Clients</span>
          <span className="rm-demo-flag">Who may be affected</span>
        </div>
        <div className="rm-demo-clients">
          <div className="rm-demo-cl-table rm-demo-node" data-at="0" data-until="1.8">
            <div className="rm-demo-cl-row" id="rm-cl-row">
              <span><strong>Sharma Pharma</strong><small>Pharma · MH</small></span>
              <span className="rm-demo-q-due high">High</span>
              <span>5 open</span>
            </div>
            <div className="rm-demo-cl-row muted">
              <span><strong>Royal Spice</strong><small>F&amp;B · DL</small></span>
              <span className="rm-demo-q-due">Medium</span>
              <span>3 open</span>
            </div>
          </div>
          <div className="rm-demo-cl-detail rm-demo-node" data-at="1.8">
            <div className="rm-demo-cl-detail-head">
              <span className="rm-demo-avatar">SP</span>
              <span><strong>Sharma Pharma</strong><small>Pharma / Manufacturing · Maharashtra</small></span>
            </div>
            <p className="rm-demo-eyebrow rm-demo-node" data-at="2.6">May be affected by</p>
            <div className="rm-demo-cl-impact rm-demo-node" data-at="3.2">
              <span className="rm-demo-cite">CBIC</span>
              <span>IGST rate schedule revised for pharma intermediates</span>
              <span className="rm-demo-chip">Unverified</span>
            </div>
            <div className="rm-demo-cl-impact rm-demo-node" data-at="4.4">
              <span className="rm-demo-cite">CBDT</span>
              <span>Q1 TDS certificate deadline extended</span>
              <span className="rm-demo-chip">Unverified</span>
            </div>
            <div className="rm-demo-cl-confirm rm-demo-node" id="rm-cl-confirm" data-at="5.8">
              To confirm: does the IGST change apply to this client’s HSN codes?
            </div>
          </div>
        </div>
      </div>
      <div className="rm-demo-cursor"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l6 16 2.5-6.5L19 9 4 2z" /></svg></div>
    </div>
  );
}

// ---- Scene 4: Prepare a client note (Assistant · Prepare mode, typed) ----
const PREPARE_SCENE: DemoScene = {
  total: 20,
  hold: 3.2,
  type: [
    {
      el: "rm-pr-composer",
      at: 0.8,
      dur: 3.4,
      caret: true,
      text: "Draft a short client note on the GSTR-3B deadline for Sharma Pharma.",
    },
    {
      el: "rm-pr-draft",
      at: 8.4,
      dur: 5.2,
      caret: true,
      text: "Your GSTR-3B summary return for June 2026 is due on 20 July 2026. Please confirm the month’s outward supplies and input tax credit so we can prepare the filing for your approval.",
    },
  ],
  cursor: [
    { at: 0, xy: [130, 130] },
    { at: 0.7, to: "#rm-pr-composer-box" },
    { at: 4.6, to: "#rm-pr-composer-box" },
    { at: 5.0, to: "#rm-pr-send" },
    { at: 5.2, to: "#rm-pr-send", click: true },
    { at: 15.5, to: "#rm-pr-gate" },
    { at: 20, to: "#rm-pr-gate" },
  ],
};

function PrepareNoteDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  useDemoTimeline(rootRef, PREPARE_SCENE);
  return (
    <div className="rm-demo" ref={rootRef} aria-hidden="true">
      <div className="rm-demo-window">
        <div className="rm-demo-titlebar">
          <span className="rm-demo-symbol">✦</span>
          <span className="rm-demo-title">Assistant</span>
          <span className="rm-demo-mode">Prepare</span>
          <span className="rm-demo-flag">Draft for review</span>
        </div>
        <div className="rm-demo-thread">
          <div className="rm-demo-msg rm-demo-user rm-demo-node" data-at="5.2">
            <span className="rm-demo-avatar">RM</span>
            <div className="rm-demo-bubble">Draft a short client note on the GSTR-3B deadline for Sharma Pharma.</div>
          </div>
          <div className="rm-demo-thinking rm-demo-node" data-at="5.9" data-until="8.4">
            <span className="rm-demo-mark">✦</span><span>Preparing a draft</span>
            <span className="rm-demo-dots"><i /><i /><i /></span>
          </div>
          <div className="rm-demo-msg rm-demo-ai rm-demo-node" data-at="8.4">
            <span className="rm-demo-mark">✦</span>
            <div className="rm-demo-answer">
              <p className="rm-demo-eyebrow">Draft — client note</p>
              <p id="rm-pr-draft" />
              <div className="rm-demo-gate rm-demo-node" id="rm-pr-gate" data-at="14.2">
                <span className="rm-demo-gate-row"><b>Approval gate</b> Partner review required before sending.</span>
                <span className="rm-demo-gate-row muted">Execution status — nothing was sent, filed, or paid.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="rm-demo-composer" id="rm-pr-composer-box">
          <span className="rm-demo-composer-text"><span id="rm-pr-composer" /></span>
          <span className="rm-demo-send" id="rm-pr-send">Prepare ↑</span>
        </div>
      </div>
      <div className="rm-demo-cursor"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l6 16 2.5-6.5L19 9 4 2z" /></svg></div>
    </div>
  );
}

// ---- Scene 5: Statutory calendar ----
const CALENDAR_SCENE: DemoScene = {
  total: 11,
  hold: 3,
  type: [],
  cursor: [
    { at: 0, xy: [120, 120] },
    { at: 1.4, to: "#rm-cal-7" },
    { at: 2.6, to: "#rm-cal-15" },
    { at: 3.8, to: "#rm-cal-20" },
    { at: 4.0, to: "#rm-cal-20", click: true },
    { at: 11, to: "#rm-cal-detail" },
  ],
};

function CalendarDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  useDemoTimeline(rootRef, CALENDAR_SCENE);
  const days = [
    { n: 7, id: "rm-cal-7", tag: "TDS" },
    { n: 11, tag: "GSTR-1" },
    { n: 15, id: "rm-cal-15", tag: "EPF" },
    { n: 20, id: "rm-cal-20", tag: "GSTR-3B", sel: true },
  ];
  return (
    <div className="rm-demo" ref={rootRef} aria-hidden="true">
      <div className="rm-demo-window">
        <div className="rm-demo-titlebar">
          <span className="rm-demo-symbol">▦</span>
          <span className="rm-demo-title">Calendar</span>
          <span className="rm-demo-mode">July 2026</span>
          <span className="rm-demo-flag">Source-linked deadlines</span>
        </div>
        <div className="rm-demo-cal-body">
          <div className="rm-demo-cal-grid">
            {Array.from({ length: 21 }, (_, i) => {
              const day = days.find((d) => d.n === i + 1);
              return (
                <span
                  key={i}
                  id={day?.id}
                  className={`rm-demo-cal-cell${day ? " has" : ""}${day?.sel ? " sel" : ""}`}
                >
                  <b>{i + 1}</b>
                  {day ? <small>{day.tag}</small> : null}
                </span>
              );
            })}
          </div>
          <div className="rm-demo-cal-detail rm-demo-node" id="rm-cal-detail" data-at="4.2">
            <p className="rm-demo-eyebrow">20 July · obligation</p>
            <strong>GSTR-3B monthly return for June 2026</strong>
            <p>Standard monthly due date is the 20th of the succeeding month, subject to notifications.</p>
            <div className="rm-demo-source">
              <span className="rm-demo-source-cite">S</span>
              <div className="rm-demo-source-body">
                <div className="rm-demo-source-meta"><span>GSTN</span><span className="rm-demo-source-status">Active</span></div>
                <p>GST portal · GSTR-3B guidance</p>
              </div>
              <span className="rm-demo-source-open">Open official ↗</span>
            </div>
          </div>
        </div>
      </div>
      <div className="rm-demo-cursor"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l6 16 2.5-6.5L19 9 4 2z" /></svg></div>
    </div>
  );
}

const SCENES = [
  {
    key: "ask",
    step: "01",
    label: "Research",
    title: "Ask a question. Get a cited answer.",
    body: "Type any GST, income-tax, or MCA question. Reg Mitra answers from indexed official sources — every claim linked to the exact circular, with caveats and missing facts shown, so you can check the reasoning, not just trust it.",
    watch: "Watch: the question is answered and a CBIC circular is attached as the source.",
    Scene: AssistantLiveDemo,
  },
  {
    key: "today",
    step: "02",
    label: "Daily review",
    title: "See what needs a decision first.",
    body: "Your morning queue, ranked by urgency. Open the top item, confirm the official source and the client facts, and mark it reviewed — every decision is saved to the workspace audit history.",
    watch: "Watch: the top task is opened and marked reviewed — the counter drops from 5 to 4.",
    Scene: TodayReviewDemo,
  },
  {
    key: "clients",
    step: "03",
    label: "Client impact",
    title: "Know which clients a change touches.",
    body: "When a rule changes, open a client to see whether it may apply and what still needs confirming — before you advise. Nothing is called verified until a source and a reviewer say so.",
    watch: "Watch: opening a client reveals the changes that may affect it, and what to confirm.",
    Scene: ClientImpactDemo,
  },
  {
    key: "prepare",
    step: "04",
    label: "Prepare work",
    title: "Draft the client note — keep the guardrails.",
    body: "Turn a question into a client-ready brief, checklist, or note. There is always an approval gate for a professional to sign off. Reg Mitra never sends, files, or pays.",
    watch: "Watch: a client note is drafted, then held at an approval gate — nothing is sent.",
    Scene: PrepareNoteDemo,
  },
  {
    key: "calendar",
    step: "05",
    label: "Deadlines",
    title: "Every deadline, with its source.",
    body: "A source-linked compliance calendar across your whole client book. Open a date to see the obligation and the official guidance behind it — no guessing which return is due when.",
    watch: "Watch: selecting the 20th opens the GSTR-3B obligation and its official source.",
    Scene: CalendarDemo,
  },
] as const;

export function LiveDemoShowcase() {
  return (
    <div className="rm-demo-stack">
      {SCENES.map((scene, index) => (
        <div className={`rm-demo-block ${index % 2 === 1 ? "reversed" : ""}`} key={scene.key}>
          <div className="rm-demo-block-copy">
            <p className="marketing-kicker">{scene.step} · {scene.label}</p>
            <h3>{scene.title}</h3>
            <p>{scene.body}</p>
            <p className="rm-demo-watch"><span aria-hidden="true">▸</span> {scene.watch}</p>
          </div>
          <div className="rm-demo-block-stage">
            <scene.Scene />
          </div>
        </div>
      ))}
    </div>
  );
}
