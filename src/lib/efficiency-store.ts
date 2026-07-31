import { useSyncExternalStore } from "react";

const EFFICIENCY_STORAGE_KEY = "reg-mitra:efficiency:v1";
const EFFICIENCY_EVENT = "reg-mitra:efficiency-updated";
const MAX_EVENTS = 500;
const EMPTY_EVENTS: EfficiencyEvent[] = [];

export type EfficiencyEventType = "assistant-answer" | "assistant-draft" | "review-recorded";

export interface EfficiencyEvent {
  id: string;
  type: EfficiencyEventType;
  occurredAt: string;
  durationMs: number | null;
}

export interface EfficiencyBaselines {
  answerMinutes: number | null;
  draftMinutes: number | null;
}

export interface EfficiencyState {
  baselines: EfficiencyBaselines;
  events: EfficiencyEvent[];
}

const EMPTY_STATE: EfficiencyState = {
  baselines: { answerMinutes: null, draftMinutes: null },
  events: EMPTY_EVENTS,
};

let cachedValue: string | null | undefined;
let cachedState = EMPTY_STATE;

function finitePositive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(value, 480)
    : null;
}

function isEfficiencyEvent(value: unknown): value is EfficiencyEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.id === "string"
    && ["assistant-answer", "assistant-draft", "review-recorded"].includes(String(event.type))
    && typeof event.occurredAt === "string"
    && (event.durationMs === null || (
      typeof event.durationMs === "number"
      && Number.isFinite(event.durationMs)
      && event.durationMs >= 0
    ))
  );
}

export function readEfficiencyState(): EfficiencyState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const stored = window.localStorage.getItem(EFFICIENCY_STORAGE_KEY);
    if (!stored) return EMPTY_STATE;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const baselines = (parsed.baselines ?? {}) as Record<string, unknown>;
    return {
      baselines: {
        answerMinutes: finitePositive(baselines.answerMinutes),
        draftMinutes: finitePositive(baselines.draftMinutes),
      },
      events: Array.isArray(parsed.events)
        ? parsed.events.filter(isEfficiencyEvent).slice(0, MAX_EVENTS)
        : EMPTY_EVENTS,
    };
  } catch {
    return EMPTY_STATE;
  }
}

function snapshot() {
  if (typeof window === "undefined") return EMPTY_STATE;
  const value = window.localStorage.getItem(EFFICIENCY_STORAGE_KEY);
  if (value === cachedValue) return cachedState;
  cachedValue = value;
  cachedState = readEfficiencyState();
  return cachedState;
}

function subscribe(callback: () => void) {
  const update = () => callback();
  window.addEventListener("storage", update);
  window.addEventListener(EFFICIENCY_EVENT, update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener(EFFICIENCY_EVENT, update);
  };
}

function writeEfficiencyState(state: EfficiencyState) {
  if (typeof window === "undefined") return;
  const next: EfficiencyState = {
    baselines: state.baselines,
    events: state.events.slice(0, MAX_EVENTS),
  };
  const value = JSON.stringify(next);
  window.localStorage.setItem(EFFICIENCY_STORAGE_KEY, value);
  cachedValue = value;
  cachedState = next;
  window.dispatchEvent(new CustomEvent(EFFICIENCY_EVENT));
}

export function recordEfficiencyEvent(type: EfficiencyEventType, durationMs: number | null = null) {
  if (typeof window === "undefined") return;
  const state = readEfficiencyState();
  writeEfficiencyState({
    ...state,
    events: [
      {
        id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        occurredAt: new Date().toISOString(),
        durationMs: durationMs === null ? null : Math.max(0, Math.round(durationMs)),
      },
      ...state.events,
    ],
  });
}

export function startEfficiencyTimer() {
  return performance.now();
}

export function finishEfficiencyTimer(startedAt: number) {
  return Math.max(0, performance.now() - startedAt);
}

export function recentEfficiencyEvents(events: readonly EfficiencyEvent[], days = 30) {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  return events.filter((event) => Date.parse(event.occurredAt) >= cutoff);
}

export function updateEfficiencyBaselines(baselines: EfficiencyBaselines) {
  const state = readEfficiencyState();
  writeEfficiencyState({
    ...state,
    baselines: {
      answerMinutes: finitePositive(baselines.answerMinutes),
      draftMinutes: finitePositive(baselines.draftMinutes),
    },
  });
}

export function useEfficiencyState() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY_STATE);
}
