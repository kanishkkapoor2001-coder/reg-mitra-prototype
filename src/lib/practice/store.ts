"use client";

// Browser-only persistence for the practice profile.
//
// Deliberately localStorage and nothing else: no account, no server round-trip,
// no client data in Reg Mitra's custody. The cost of that choice is that the data
// is per-device and dies with the browser profile, so export/import is a
// first-class feature here, not a nicety.

import {
  EMPTY_PROFILE,
  type PracticeClient,
  type PracticeProfile,
} from "@/lib/practice/types";

const STORAGE_KEY = "regmitra.practice.v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function coerceClient(value: unknown): PracticeClient | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 120) : "";
  if (!name) return null;
  const str = (key: string, max = 120) =>
    typeof raw[key] === "string" && (raw[key] as string).trim()
      ? (raw[key] as string).trim().slice(0, max)
      : null;
  const bool = (key: string) => (typeof raw[key] === "boolean" ? (raw[key] as boolean) : null);

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : crypto.randomUUID(),
    name,
    gstin: str("gstin", 20),
    gstRegistration: str("gstRegistration", 20) as PracticeClient["gstRegistration"],
    gstFrequency: str("gstFrequency", 20) as PracticeClient["gstFrequency"],
    entityType: str("entityType", 20) as PracticeClient["entityType"],
    taxAuditApplicable: bool("taxAuditApplicable"),
    presumptiveTaxation: bool("presumptiveTaxation"),
    deductsTds: bool("deductsTds"),
    turnoverBand: str("turnoverBand", 20) as PracticeClient["turnoverBand"],
    sector: str("sector", 60),
    twentyPlusEmployees: bool("twentyPlusEmployees"),
    trustRegistrations: Array.isArray(raw.trustRegistrations)
      ? (raw.trustRegistrations as unknown[])
        .filter((item): item is string => typeof item === "string")
        .slice(0, 6)
      : [],
    notes: str("notes", 400),
    lastConfirmedAt: typeof raw.lastConfirmedAt === "string" && raw.lastConfirmedAt
      ? raw.lastConfirmedAt
      : new Date().toISOString(),
  };
}

function coerceProfile(value: unknown): PracticeProfile {
  if (!value || typeof value !== "object") return EMPTY_PROFILE;
  const raw = value as Record<string, unknown>;
  const list = (key: string, max: number) =>
    Array.isArray(raw[key])
      ? (raw[key] as unknown[])
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        .slice(0, max)
      : [];

  return {
    regulators: list("regulators", 12),
    states: list("states", 40),
    sectors: list("sectors", 12),
    clients: Array.isArray(raw.clients)
      ? (raw.clients as unknown[])
        .map(coerceClient)
        .filter((client): client is PracticeClient => Boolean(client))
        .slice(0, 300)
      : [],
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
}

export function loadProfile(): PracticeProfile {
  if (!isBrowser()) return EMPTY_PROFILE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY_PROFILE;
    return coerceProfile(JSON.parse(stored));
  } catch {
    // Corrupt or unreadable storage must never break the page.
    return EMPTY_PROFILE;
  }
}

// ── React store plumbing ─────────────────────────────────────────────────────
// Exposed through useSyncExternalStore rather than useState + useEffect: the
// source of truth is localStorage, an external store. This also gives correct
// SSR behaviour and keeps two open tabs in sync for free.

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedProfile: PracticeProfile = EMPTY_PROFILE;

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeToProfile(listener: () => void): () => void {
  listeners.add(listener);
  // Edits made in another tab land here.
  if (isBrowser()) window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    if (isBrowser()) window.removeEventListener("storage", listener);
  };
}

/** Must return a referentially stable value, or useSyncExternalStore loops. */
export function getProfileSnapshot(): PracticeProfile {
  if (!isBrowser()) return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedProfile;
    cachedRaw = raw;
    cachedProfile = raw ? coerceProfile(JSON.parse(raw)) : EMPTY_PROFILE;
    return cachedProfile;
  } catch {
    return EMPTY_PROFILE;
  }
}

export function getProfileServerSnapshot(): PracticeProfile {
  return EMPTY_PROFILE;
}

export function saveProfile(profile: PracticeProfile): PracticeProfile {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  if (!isBrowser()) return next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    cachedRaw = window.localStorage.getItem(STORAGE_KEY);
    cachedProfile = next;
  } catch {
    // Quota or private-mode failures are non-fatal: the session keeps working,
    // it simply will not persist.
  }
  notify();
  return next;
}

export function clearProfile() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedProfile = EMPTY_PROFILE;
  } catch {
    // Nothing useful to do.
  }
  notify();
}

export function hasAnyProfileData(profile: PracticeProfile): boolean {
  return Boolean(
    profile.regulators.length || profile.states.length
    || profile.sectors.length || profile.clients.length,
  );
}

export function emptyClient(): PracticeClient {
  return {
    id: crypto.randomUUID(),
    name: "",
    gstin: null,
    gstRegistration: null,
    gstFrequency: null,
    entityType: null,
    taxAuditApplicable: null,
    presumptiveTaxation: null,
    deductsTds: null,
    turnoverBand: null,
    sector: null,
    twentyPlusEmployees: null,
    trustRegistrations: [],
    notes: null,
    lastConfirmedAt: new Date().toISOString(),
  };
}

/** Downloads the whole profile as JSON — the backup for browser-only storage. */
export function exportProfile(profile: PracticeProfile) {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `regmitra-practice-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importProfile(file: File): Promise<PracticeProfile> {
  const text = await file.text();
  return coerceProfile(JSON.parse(text));
}
