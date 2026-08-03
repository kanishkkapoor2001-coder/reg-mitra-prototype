// The practice profile and client roster.
//
// This data lives in the professional's OWN BROWSER and is never written to a
// database. It travels to the server only as context on a question the user is
// already asking, exactly like a fact they typed themselves. That is the whole
// reason it can exist without accounts, without a security review, and without
// Reg Mitra becoming a custodian of CA client data.
//
// Field discipline: a field earns its place only if it CHANGES AN ANSWER. Every
// extra field is onboarding friction and one more thing that can be silently
// wrong. The notes below record what each one decides.

export type EntityType = "individual" | "firm" | "llp" | "company" | "trust" | "aop";
export type GstRegistration = "regular" | "composition" | "unregistered";
export type GstFrequency = "monthly" | "quarterly";
export type TurnoverBand = "under-1.5cr" | "1.5-5cr" | "5-50cr" | "above-50cr";

export interface PracticeClient {
  id: string;
  /** A label the professional recognises. May be an initialism — it never leaves the browser. */
  name: string;

  // ── GST ────────────────────────────────────────────────────────────────────
  /** First two digits are the state code, which decides the QRMP 22nd/24th group. */
  gstin: string | null;
  gstRegistration: GstRegistration | null;
  /** Monthly vs QRMP decides which due-date rule applies at all. */
  gstFrequency: GstFrequency | null;

  // ── Income tax ─────────────────────────────────────────────────────────────
  entityType: EntityType | null;
  /** Decides the ITR due date (31 Jul vs 31 Oct), which is the base for s.234A interest. */
  taxAuditApplicable: boolean | null;
  /** Presumptive taxpayers pay advance tax in ONE 15-March instalment, not four —
   *  this flips the entire s.234C computation. */
  presumptiveTaxation: boolean | null;
  /** Whether TDS obligations and s.201(1A) interest are in scope. */
  deductsTds: boolean | null;

  // ── Scope of regulators ────────────────────────────────────────────────────
  /** Turnover drives late-fee caps, e-invoicing, GSTR-9/9C and QRMP eligibility. */
  turnoverBand: TurnoverBand | null;
  /** Decides which regulator's changes can reach them (food → FSSAI, NBFC → RBI…). */
  sector: string | null;
  /** 20+ employees brings EPFO and the 15-day deposit rule into scope. */
  twentyPlusEmployees: boolean | null;
  /** Trusts only: whether 12A / 80G registration is in place. */
  trustRegistrations: string[];

  notes: string | null;
  /** When the professional last confirmed these facts. Stale data is the real
   *  accuracy risk, so it is surfaced rather than silently trusted. */
  lastConfirmedAt: string;
}

export interface PracticeProfile {
  /** Regulators the firm actually deals with — used to sort the regulation feed. */
  regulators: string[];
  /** Two-letter state codes the firm files in. */
  states: string[];
  sectors: string[];
  clients: PracticeClient[];
  updatedAt: string;
}

export const EMPTY_PROFILE: PracticeProfile = {
  regulators: [],
  states: [],
  sectors: [],
  clients: [],
  updatedAt: "",
};

export const REGULATOR_OPTIONS = [
  "GST", "Income Tax", "ICAI / Audit", "MCA", "EPFO", "RBI", "SEBI", "FSSAI",
] as const;

export const SECTOR_OPTIONS = [
  "Manufacturing", "Trading", "Services", "Food business", "Pharma",
  "NBFC / Finance", "Trust / NGO", "Real estate", "IT / Software", "Professional services",
] as const;

export const ENTITY_LABELS: Record<EntityType, string> = {
  individual: "Individual / Proprietor",
  firm: "Partnership firm",
  llp: "LLP",
  company: "Company",
  trust: "Trust / Society / Section 8",
  aop: "AOP / BOI",
};

export const TURNOVER_LABELS: Record<TurnoverBand, string> = {
  "under-1.5cr": "Under ₹1.5 Cr",
  "1.5-5cr": "₹1.5 – 5 Cr",
  "5-50cr": "₹5 – 50 Cr",
  "above-50cr": "Above ₹50 Cr",
};

/** GST state codes. The first two digits of a GSTIN identify the State/UT. */
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
};

/** Two-letter codes used by the QRMP due-date rule in the calculators. */
export const STATE_SHORT_CODES: Record<string, string> = {
  "Jammu & Kashmir": "JK", "Himachal Pradesh": "HP", "Punjab": "PB", "Chandigarh": "CH",
  "Uttarakhand": "UK", "Haryana": "HR", "Delhi": "DL", "Rajasthan": "RJ",
  "Uttar Pradesh": "UP", "Bihar": "BR", "Sikkim": "SK", "Arunachal Pradesh": "AR",
  "Nagaland": "NL", "Manipur": "MN", "Mizoram": "MZ", "Tripura": "TR",
  "Meghalaya": "ML", "Assam": "AS", "West Bengal": "WB", "Jharkhand": "JH",
  "Odisha": "OD", "Chhattisgarh": "CG", "Madhya Pradesh": "MP", "Gujarat": "GJ",
  "Dadra & Nagar Haveli and Daman & Diu": "DN", "Maharashtra": "MH", "Karnataka": "KA",
  "Goa": "GA", "Lakshadweep": "LD", "Kerala": "KL", "Tamil Nadu": "TN",
  "Puducherry": "PY", "Andaman & Nicobar Islands": "AN", "Telangana": "TS",
  "Andhra Pradesh": "AP", "Ladakh": "LA", "Other Territory": "OT",
};

/** State implied by a GSTIN's leading state code, or null when it cannot be read. */
export function stateFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin) return null;
  const code = gstin.trim().slice(0, 2);
  return GST_STATE_CODES[code] ?? null;
}

export function shortCodeForState(state: string | null): string | null {
  return state ? STATE_SHORT_CODES[state] ?? null : null;
}

/** Days since these client facts were last confirmed, for staleness prompts. */
export function daysSinceConfirmed(client: PracticeClient, today = new Date()): number | null {
  if (!client.lastConfirmedAt) return null;
  const then = new Date(client.lastConfirmedAt);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((today.getTime() - then.getTime()) / 86_400_000);
}
