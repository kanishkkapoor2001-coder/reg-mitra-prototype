import { useSyncExternalStore } from "react";

const CLIENT_TABS_STORAGE_KEY = "reg-mitra:client-tabs:v1";
const MAX_CLIENT_TABS = 5;
const emptyTabs: ClientWorkspaceTab[] = [];
let cachedValue: string | null | undefined;
let cachedTabs = emptyTabs;

export interface ClientWorkspaceTab {
  id: string;
  name: string;
  subtitle: string;
  openedAt: string;
}

function isClientTab(value: unknown): value is ClientWorkspaceTab {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string"
    && typeof record.name === "string"
    && typeof record.subtitle === "string"
    && typeof record.openedAt === "string";
}

export function readClientTabs(): ClientWorkspaceTab[] {
  if (typeof window === "undefined") return emptyTabs;
  try {
    const stored = window.localStorage.getItem(CLIENT_TABS_STORAGE_KEY);
    if (!stored) return emptyTabs;
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(isClientTab).slice(0, MAX_CLIENT_TABS)
      : emptyTabs;
  } catch {
    return emptyTabs;
  }
}

function clientTabsSnapshot() {
  if (typeof window === "undefined") return emptyTabs;
  const value = window.localStorage.getItem(CLIENT_TABS_STORAGE_KEY);
  if (value === cachedValue) return cachedTabs;
  cachedValue = value;
  cachedTabs = readClientTabs();
  return cachedTabs;
}

function subscribe(callback: () => void) {
  const update = () => callback();
  window.addEventListener("storage", update);
  window.addEventListener("reg-mitra:client-tabs-updated", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("reg-mitra:client-tabs-updated", update);
  };
}

function writeClientTabs(tabs: readonly ClientWorkspaceTab[]) {
  if (typeof window === "undefined") return;
  const value = JSON.stringify(tabs.slice(0, MAX_CLIENT_TABS));
  window.localStorage.setItem(CLIENT_TABS_STORAGE_KEY, value);
  cachedValue = value;
  cachedTabs = tabs.slice(0, MAX_CLIENT_TABS);
  window.dispatchEvent(new CustomEvent("reg-mitra:client-tabs-updated"));
}

export function openClientTab(input: Omit<ClientWorkspaceTab, "openedAt">) {
  const existing = readClientTabs().filter((tab) => tab.id !== input.id);
  writeClientTabs([
    { ...input, openedAt: new Date().toISOString() },
    ...existing,
  ]);
}

export function closeClientTab(clientId: string) {
  writeClientTabs(readClientTabs().filter((tab) => tab.id !== clientId));
}

export function useClientTabs() {
  return useSyncExternalStore(subscribe, clientTabsSnapshot, () => emptyTabs);
}
