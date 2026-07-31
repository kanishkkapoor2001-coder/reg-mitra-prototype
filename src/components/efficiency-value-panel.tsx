"use client";

import { useMemo, useState } from "react";
import { InfoTip } from "@/components/info-tip";
import { CheckCircleIcon, ChevronRightIcon } from "@/components/icons";
import {
  recentEfficiencyEvents,
  updateEfficiencyBaselines,
  useEfficiencyState,
  type EfficiencyBaselines,
} from "@/lib/efficiency-store";

function parseMinutes(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 480) : null;
}

function formatMinutes(minutes: number) {
  if (minutes > 0 && minutes < 1) return "<1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function EfficiencyValuePanel() {
  const state = useEfficiencyState();
  const [answerMinutes, setAnswerMinutes] = useState("");
  const [draftMinutes, setDraftMinutes] = useState("");
  const recentEvents = useMemo(() => recentEfficiencyEvents(state.events), [state.events]);
  const answerEvents = recentEvents.filter((event) => event.type === "assistant-answer");
  const draftEvents = recentEvents.filter((event) => event.type === "assistant-draft");
  const reviewEvents = recentEvents.filter((event) => event.type === "review-recorded");
  const generationMs = [...answerEvents, ...draftEvents]
    .reduce((total, event) => total + (event.durationMs ?? 0), 0);
  const hasApplicableBaseline = (
    (answerEvents.length > 0 && state.baselines.answerMinutes !== null)
    || (draftEvents.length > 0 && state.baselines.draftMinutes !== null)
  );
  const estimatedMinutes = Math.max(0,
    (answerEvents.length * (state.baselines.answerMinutes ?? 0))
    + (draftEvents.length * (state.baselines.draftMinutes ?? 0))
    - (generationMs / 60_000),
  );

  function saveBaselines() {
    const next: EfficiencyBaselines = {
      answerMinutes: parseMinutes(answerMinutes) ?? state.baselines.answerMinutes,
      draftMinutes: parseMinutes(draftMinutes) ?? state.baselines.draftMinutes,
    };
    updateEfficiencyBaselines(next);
    setAnswerMinutes("");
    setDraftMinutes("");
  }

  return (
    <details className="efficiency-panel">
      <summary>
        <span>
          <span className="efficiency-mark"><CheckCircleIcon /></span>
          <span>
            <strong>Efficiency &amp; value</strong>
            <small>Usage-backed time estimate · hidden until you open it</small>
          </span>
        </span>
        <span className="efficiency-summary-value">
          {hasApplicableBaseline ? formatMinutes(estimatedMinutes) : "Set baseline"}
          <ChevronRightIcon />
        </span>
      </summary>

      <div className="efficiency-body">
        <header>
          <div>
            <p className="eyebrow">
              Last 30 days
              <InfoTip label="Explain how the efficiency period works">
                Counts successful actions recorded in this browser during the latest rolling 30-day period.
              </InfoTip>
            </p>
            <h2>Value tracked from completed work</h2>
            <p>Actual usage is counted. Time reclaimed appears only after your firm supplies its manual-work baseline.</p>
          </div>
          <span className="efficiency-local-label">This browser</span>
        </header>

        <div className="efficiency-metrics">
          <article>
            <span>Assistant outputs</span>
            <strong>{answerEvents.length + draftEvents.length}</strong>
            <small>{answerEvents.length} answers · {draftEvents.length} drafts</small>
          </article>
          <article>
            <span>Decisions recorded</span>
            <strong>{reviewEvents.length}</strong>
            <small>Not included in the time estimate</small>
          </article>
          <article className="featured">
            <span>
              Estimated time reclaimed
              <InfoTip label="Explain estimated time reclaimed">
                Your manual baseline minus Reg Mitra’s measured generation time. It is an operational estimate, not a billing or accounting record.
              </InfoTip>
            </span>
            <strong>{hasApplicableBaseline ? formatMinutes(estimatedMinutes) : "—"}</strong>
            <small>{hasApplicableBaseline ? `${formatMinutes(generationMs / 60_000)} measured generation time` : "Add a baseline to calculate"}</small>
          </article>
        </div>

        <section className="efficiency-method">
          <div>
            <p className="eyebrow">Your firm’s baseline</p>
            <h3>How long would comparable manual work take?</h3>
            <p>Use your own typical time. Reg Mitra never assigns a benchmark on your behalf.</p>
          </div>
          <div className="efficiency-inputs">
            <label>
              <span>Source-grounded answer</span>
              <span>
                <input
                  inputMode="numeric"
                  min="1"
                  max="480"
                  onChange={(event) => setAnswerMinutes(event.target.value)}
                  placeholder={state.baselines.answerMinutes?.toString() ?? "Minutes"}
                  type="number"
                  value={answerMinutes}
                />
                min
              </span>
            </label>
            <label>
              <span>Internal draft</span>
              <span>
                <input
                  inputMode="numeric"
                  min="1"
                  max="480"
                  onChange={(event) => setDraftMinutes(event.target.value)}
                  placeholder={state.baselines.draftMinutes?.toString() ?? "Minutes"}
                  type="number"
                  value={draftMinutes}
                />
                min
              </span>
            </label>
            <button
              className="button"
              disabled={!answerMinutes && !draftMinutes}
              onClick={saveBaselines}
              type="button"
            >
              Save baseline
            </button>
          </div>
        </section>

        <p className="efficiency-footnote">
          This prototype stores value events in this browser. Firm-wide, cross-device reporting requires workspace analytics sync.
        </p>
      </div>
    </details>
  );
}
