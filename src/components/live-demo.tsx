"use client";

import { useEffect, useRef } from "react";

// A self-contained, seekable product-demo engine.
// Everything is a pure function of time `t`, so the scene can loop, pause when
// off-screen, and collapse to its final composed frame under reduced-motion.
export interface TypeStep {
  el: string; // id of the target text node
  at: number;
  dur: number;
  text: string;
  caret?: boolean;
}

export interface CursorStep {
  at: number;
  to?: string; // selector, resolved to element centre
  xy?: [number, number]; // fallback point, relative to the stage
  click?: boolean;
}

export interface DemoScene {
  total: number;
  hold: number; // seconds held on the final frame before looping
  type: TypeStep[];
  cursor: CursorStep[];
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function useDemoTimeline(
  rootRef: React.RefObject<HTMLDivElement | null>,
  scene: DemoScene,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ghost = root.querySelector<HTMLElement>(".rm-demo-cursor");
    const tnodes = Array.from(root.querySelectorAll<HTMLElement>(".rm-demo-node"));

    const stageRect = () => root.getBoundingClientRect();

    function pointFor(step: CursorStep): { x: number; y: number } | null {
      const stage = stageRect();
      if (step.to) {
        const el = root!.querySelector(step.to);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.width || r.height) {
            return { x: r.left - stage.left + r.width / 2, y: r.top - stage.top + r.height / 2 };
          }
        }
      }
      if (step.xy) return { x: step.xy[0], y: step.xy[1] };
      return null;
    }

    let lastCursor = { x: stageRect().width * 0.4, y: stageRect().height * 0.5 };

    function renderCursor(t: number) {
      if (!ghost || reduce || !scene.cursor.length) return;
      let i = 0;
      for (let k = 0; k < scene.cursor.length; k++) {
        const step = scene.cursor[k];
        if (step && step.at <= t) i = k;
        else break;
      }
      const a = scene.cursor[i];
      const b = scene.cursor[Math.min(i + 1, scene.cursor.length - 1)];
      if (!a || !b) return;
      const span = b.at - a.at;
      const frac = span > 0 ? clamp01((t - a.at) / span) : 1;
      const pa = pointFor(a) || lastCursor;
      const pb = pointFor(b) || pa;
      const e = easeInOut(frac);
      const x = pa.x + (pb.x - pa.x) * e;
      const y = pa.y + (pb.y - pa.y) * e;
      lastCursor = { x, y };
      ghost.style.transform = `translate(${x}px, ${y}px)`;

      let pressing = false;
      let ripple = false;
      for (const wp of scene.cursor) {
        if (!wp.click) continue;
        const d = t - wp.at;
        if (d >= -0.06 && d <= 0.12) pressing = true;
        if (d >= 0 && d <= 0.4) ripple = true;
      }
      ghost.style.scale = pressing ? "0.82" : "1";
      ghost.classList.toggle("click", ripple);
    }

    function renderNodes(t: number) {
      for (const el of tnodes) {
        const at = Number.parseFloat(el.dataset.at ?? "0");
        const until = el.dataset.until ? Number.parseFloat(el.dataset.until) : null;
        const visible = t >= at && (until === null || t < until);
        if (!visible) {
          el.style.opacity = "0";
          el.style.transform = "translateY(7px)";
          el.style.pointerEvents = "none";
          continue;
        }
        const p = reduce ? 1 : clamp01((t - at) / 0.4);
        el.style.opacity = String(p);
        el.style.transform = `translateY(${(1 - p) * 7}px)`;
      }
    }

    function renderTyping(t: number) {
      const byEl = new Map<string, TypeStep | null>();
      for (const ty of scene.type) {
        if (t >= ty.at) {
          const cur = byEl.get(ty.el);
          if (!cur || ty.at > cur.at) byEl.set(ty.el, ty);
        } else if (!byEl.has(ty.el)) {
          byEl.set(ty.el, null);
        }
      }
      for (const [elId, ty] of byEl) {
        const el = root!.querySelector<HTMLElement>(`#${elId}`);
        if (!el) continue;
        if (!ty) {
          el.textContent = "";
          el.classList.remove("rm-caret");
          continue;
        }
        const p = reduce ? 1 : clamp01((t - ty.at) / ty.dur);
        el.textContent = ty.text.slice(0, Math.floor(p * ty.text.length));
        const typing = !reduce && t < ty.at + ty.dur;
        el.classList.toggle("rm-caret", !!ty.caret && typing);
      }
    }

    function render(t: number) {
      renderNodes(t);
      renderTyping(t);
      renderCursor(t);
    }

    if (reduce) {
      render(scene.total);
      return;
    }

    let raf = 0;
    let startedAt: number | null = null;
    let playing = false;
    const loopLength = scene.total + scene.hold;

    function frame(now: number) {
      if (startedAt === null) startedAt = now;
      const t = ((now - startedAt) / 1000) % loopLength;
      render(Math.min(t, scene.total));
      raf = window.requestAnimationFrame(frame);
    }

    function play() {
      if (playing) return;
      playing = true;
      startedAt = null;
      raf = window.requestAnimationFrame(frame);
    }
    function pause() {
      playing = false;
      window.cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) play();
          else pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(root);
    render(0);

    return () => {
      io.disconnect();
      pause();
    };
  }, [rootRef, scene]);
}

const ASSISTANT_SCENE: DemoScene = {
  total: 21.5,
  hold: 3.4,
  type: [
    {
      el: "rm-demo-composer",
      at: 0.8,
      dur: 3.4,
      caret: true,
      text: "Does a GST portal notice with a verifiable RFN also need a DIN under section 169?",
    },
    {
      el: "rm-demo-a1",
      at: 8.6,
      dur: 3.6,
      caret: true,
      text: "No — a GST common-portal communication served under section 169 that already carries a verifiable RFN does not need a separate DIN to be treated as valid.",
    },
    {
      el: "rm-demo-a2",
      at: 12.6,
      dur: 2.8,
      caret: true,
      text: "CBIC has clarified this and modified the earlier DIN circulars to that extent.",
    },
  ],
  cursor: [
    { at: 0, xy: [150, 150] },
    { at: 0.7, to: "#rm-demo-composer-box" },
    { at: 4.6, to: "#rm-demo-composer-box" },
    { at: 5.0, to: "#rm-demo-send" },
    { at: 5.2, to: "#rm-demo-send", click: true },
    { at: 6.5, to: "#rm-demo-send" },
    { at: 16.5, to: "#rm-demo-source" },
    { at: 18.5, to: "#rm-demo-source-open" },
    { at: 21.5, to: "#rm-demo-source-open" },
  ],
};

export function AssistantLiveDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  useDemoTimeline(rootRef, ASSISTANT_SCENE);

  return (
    <div className="rm-demo" ref={rootRef} aria-hidden="true">
      <div className="rm-demo-window">
        <div className="rm-demo-titlebar">
          <span className="rm-demo-symbol">✦</span>
          <span className="rm-demo-title">Assistant</span>
          <span className="rm-demo-mode">Answer</span>
          <span className="rm-demo-flag">Source-grounded</span>
        </div>

        <div className="rm-demo-thread">
          {/* user question */}
          <div className="rm-demo-msg rm-demo-user rm-demo-node" data-at="5.2">
            <span className="rm-demo-avatar">RM</span>
            <div className="rm-demo-bubble">
              Does a GST portal notice with a verifiable RFN also need a DIN under section 169?
            </div>
          </div>

          {/* thinking */}
          <div className="rm-demo-thinking rm-demo-node" data-at="5.9" data-until="8.6">
            <span className="rm-demo-mark">✦</span>
            <span>Searching indexed official sources</span>
            <span className="rm-demo-dots"><i /><i /><i /></span>
          </div>

          {/* answer */}
          <div className="rm-demo-msg rm-demo-ai rm-demo-node" data-at="8.6">
            <span className="rm-demo-mark">✦</span>
            <div className="rm-demo-answer">
              <p className="rm-demo-eyebrow">Direct answer</p>
              <p>
                <span id="rm-demo-a1" /> <span className="rm-demo-cite rm-demo-node" data-at="11.8">S1</span>
              </p>
              <p className="rm-demo-a2line">
                <span id="rm-demo-a2" /> <span className="rm-demo-cite rm-demo-node" data-at="15.0">S1</span>
              </p>

              <div className="rm-demo-source rm-demo-node" id="rm-demo-source" data-at="15.8">
                <span className="rm-demo-source-cite">S1</span>
                <div className="rm-demo-source-body">
                  <div className="rm-demo-source-meta">
                    <span>CBIC</span>
                    <span>Circular No. 249/06/2025-GST</span>
                    <span className="rm-demo-source-status">Active</span>
                  </div>
                  <p>DIN requirement for GST common-portal communications carrying a verifiable RFN</p>
                </div>
                <span className="rm-demo-source-open" id="rm-demo-source-open">Open official ↗</span>
              </div>

              <p className="rm-demo-footnote rm-demo-node" data-at="16.6">
                Every claim traced to official text. Nothing sent or filed.
              </p>
            </div>
          </div>
        </div>

        <div className="rm-demo-composer" id="rm-demo-composer-box">
          <span className="rm-demo-composer-text"><span id="rm-demo-composer" /></span>
          <span className="rm-demo-send" id="rm-demo-send">Get answer ↑</span>
        </div>
      </div>

      <div className="rm-demo-cursor"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l6 16 2.5-6.5L19 9 4 2z" /></svg></div>
    </div>
  );
}
