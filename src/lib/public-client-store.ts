import { clients as sampleClients, workItems } from "@/lib/demo-data";
import type { RiskLevel } from "@/lib/types";
import { useSyncExternalStore } from "react";

export const PUBLIC_CLIENTS_STORAGE_KEY = "reg-mitra:clients:v1";
const serverClients = sampleManagedClients();
let cachedValue: string | null | undefined;
let cachedClients = serverClients;

export interface ManagedClientTask {
  id: string;
  title: string;
  authority: string;
  due: string;
  urgency: RiskLevel;
  state: "needs-review" | "in-progress" | "upcoming" | "complete";
}

export interface ManagedClient {
  id: string;
  legalName: string;
  displayName: string;
  sector: string;
  stateCode: string;
  location: string;
  identifiers: string[];
  risk: RiskLevel;
  notes: string;
  facts: string[];
  tasks: ManagedClientTask[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  source: "sample" | "browser";
}

export function sampleManagedClients(): ManagedClient[] {
  return sampleClients.map((client) => ({
    id: client.id,
    legalName: client.name,
    displayName: client.shortName,
    sector: client.sector,
    stateCode: client.location.split(",").at(-1)?.trim() ?? "",
    location: client.location,
    identifiers: [...client.identifiers],
    risk: client.risk,
    notes: "",
    facts: [
      `Sector: ${client.sector}`,
      `Primary location: ${client.location}`,
    ],
    tasks: workItems
      .filter((item) => item.clientId === client.id)
      .map((item) => ({
        id: item.id,
        title: item.title,
        authority: item.authority,
        due: item.due,
        urgency: item.urgency,
        state: item.state === "draft-ready" ? "in-progress" : item.state,
      })),
    archived: false,
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    source: "sample",
  }));
}

function isManagedClient(value: unknown): value is ManagedClient {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string"
    && typeof record.legalName === "string"
    && typeof record.displayName === "string"
    && Array.isArray(record.identifiers)
    && Array.isArray(record.tasks)
  );
}

export function readManagedClients(): ManagedClient[] {
  if (typeof window === "undefined") return sampleManagedClients();
  try {
    const stored = window.localStorage.getItem(PUBLIC_CLIENTS_STORAGE_KEY);
    if (!stored) return sampleManagedClients();
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed) && parsed.every(isManagedClient)
      ? parsed
      : sampleManagedClients();
  } catch {
    return sampleManagedClients();
  }
}

function clientSnapshot() {
  if (typeof window === "undefined") return serverClients;
  const value = window.localStorage.getItem(PUBLIC_CLIENTS_STORAGE_KEY);
  if (value === cachedValue) return cachedClients;
  cachedValue = value;
  cachedClients = readManagedClients();
  return cachedClients;
}

function subscribeToClients(callback: () => void) {
  const update = () => callback();
  window.addEventListener("storage", update);
  window.addEventListener("reg-mitra:clients-updated", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("reg-mitra:clients-updated", update);
  };
}

export function useManagedClients() {
  return useSyncExternalStore(subscribeToClients, clientSnapshot, () => serverClients);
}

export function writeManagedClients(clients: readonly ManagedClient[]) {
  if (typeof window === "undefined") return;
  const value = JSON.stringify(clients);
  window.localStorage.setItem(PUBLIC_CLIENTS_STORAGE_KEY, value);
  cachedValue = value;
  cachedClients = [...clients];
  window.dispatchEvent(new CustomEvent("reg-mitra:clients-updated"));
}

export function createManagedClient(
  input: Pick<ManagedClient, "legalName" | "displayName" | "sector" | "stateCode" | "location" | "identifiers">,
): ManagedClient {
  const now = new Date().toISOString();
  const id = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...input,
    id,
    risk: "low",
    notes: "",
    facts: [
      input.sector ? `Sector: ${input.sector}` : "Sector not yet recorded",
      input.location ? `Primary location: ${input.location}` : "Primary location not yet recorded",
    ],
    tasks: [
      {
        id: `${id}-setup-1`,
        title: "Confirm registrations and filing profile",
        authority: "Client setup",
        due: "Next",
        urgency: "high",
        state: "needs-review",
      },
      {
        id: `${id}-setup-2`,
        title: "Record recurring compliance obligations",
        authority: "Client setup",
        due: "This week",
        urgency: "medium",
        state: "upcoming",
      },
    ],
    archived: false,
    createdAt: now,
    updatedAt: now,
    source: "browser",
  };
}

export function managedClientHref(clientId: string) {
  return `/clients/${encodeURIComponent(clientId)}`;
}
