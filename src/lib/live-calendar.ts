import "server-only";

import { unstable_cache } from "next/cache";
import sourceRegistryJson from "../../data/regulatory/source-registry.json";
import {
  getComplianceEvents,
  type CalendarSnapshot,
  type CalendarSourceState,
  type ComplianceCategory,
  type ComplianceEvent,
} from "@/lib/compliance-calendar";

export const CALENDAR_SOURCE_CACHE_TAG = "calendar-source-health";

interface RegistrySource {
  id: string;
  authority: string;
  documentType: string;
  documentNumber?: string;
  title: string;
  publishedAt?: string;
  effectiveFrom?: string;
  status: "active" | "historical" | "index";
  applicability: string;
  canonicalUrl: string;
  seedText: string;
}

interface MonitoredSource {
  id: string;
  authority: string;
  label: string;
  url: string;
}

interface SourceCheck extends MonitoredSource {
  state: "available" | "protected" | "review";
  httpStatus: number | null;
}

interface SourceHealthSnapshot {
  checkedAt: string;
  checks: SourceCheck[];
}

const sourceRegistry = sourceRegistryJson as {
  sources: RegistrySource[];
};

const monitoredSources: readonly MonitoredSource[] = [
  {
    id: "cbic-gst",
    authority: "CBIC",
    label: "Central GST circulars",
    url: "https://cbic-gst.gov.in/circulars-cgst.html",
  },
  {
    id: "gstn-returns",
    authority: "GSTN",
    label: "GST return guidance",
    url: "https://www.gst.gov.in/help/returns",
  },
  {
    id: "income-tax",
    authority: "Income Tax Department",
    label: "Tax payment and TDS guidance",
    url: "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tax-payments-faq",
  },
  {
    id: "epfo",
    authority: "EPFO",
    label: "Employer contribution guidance",
    url: "https://www.epfindia.gov.in/site_en/FAQ.php",
  },
  {
    id: "fssai",
    authority: "FSSAI",
    label: "Advisories and orders",
    url: "https://fssai.gov.in/advisories.php",
  },
  {
    id: "sebi",
    authority: "SEBI",
    label: "Active circulars",
    url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=7",
  },
] as const;

function formatCheckedAt(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function nextRefreshAfter(value: Date): Date {
  const next = new Date(value);
  next.setUTCHours(0, 30, 0, 0);
  if (next <= value) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

async function probeSource(source: MonitoredSource): Promise<SourceCheck> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(source.url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "text/html,application/pdf;q=0.9,*/*;q=0.8",
        "User-Agent": "RegMitra-Calendar-Source-Check/1.0",
      },
      signal: controller.signal,
    });
    const state = response.ok
      ? "available"
      : response.status === 401 || response.status === 403 || response.status === 405
        ? "protected"
        : "review";

    return { ...source, state, httpStatus: response.status };
  } catch {
    return { ...source, state: "review", httpStatus: null };
  } finally {
    clearTimeout(timeout);
  }
}

const getSourceHealth = unstable_cache(
  async (): Promise<SourceHealthSnapshot> => ({
    checkedAt: new Date().toISOString(),
    checks: await Promise.all(monitoredSources.map(probeSource)),
  }),
  ["reg-mitra-calendar-source-health-v1"],
  {
    revalidate: 60 * 60 * 24,
    tags: [CALENDAR_SOURCE_CACHE_TAG],
  },
);

function categoryForAuthority(authority: string): ComplianceCategory {
  if (authority === "CBIC" || authority === "GSTN") return "GST";
  if (authority === "CBDT" || authority === "Income Tax Department") return "Direct tax";
  if (authority === "EPFO") return "Payroll";
  return "Regulatory update";
}

function sourceStateForAuthority(
  authority: string,
  checks: SourceCheck[],
): CalendarSourceState {
  const monitoredAuthority = authority === "CBDT"
    ? "Income Tax Department"
    : authority === "Goods and Services Tax Network"
      ? "GSTN"
      : authority === "Employees’ Provident Fund Organisation"
        ? "EPFO"
        : authority;
  const related = checks.find((check) => check.authority === monitoredAuthority);
  return related && related.state !== "review" ? "checked" : "review";
}

function getRegulatoryEffectiveDates(
  year: number,
  monthIndex: number,
  checkedAt: string,
  checks: SourceCheck[],
): ComplianceEvent[] {
  return sourceRegistry.sources
    .filter((source) => {
      if (source.status !== "active" || !source.effectiveFrom) return false;
      const [effectiveYear, effectiveMonth] = source.effectiveFrom.split("-").map(Number);
      return effectiveYear === year && effectiveMonth === monthIndex + 1;
    })
    .map((source) => ({
      id: `regulatory-${source.id}`,
      title: source.title,
      shortTitle: source.documentNumber ?? `${source.authority} update`,
      date: source.effectiveFrom as string,
      category: categoryForAuthority(source.authority),
      authority: source.authority,
      applicability: source.applicability,
      description: source.seedText,
      sourceLabel: `${source.authority} · ${source.documentNumber ?? source.documentType}`,
      sourceUrl: source.canonicalUrl,
      lastVerified: formatCheckedAt(checkedAt),
      kind: "regulatory-update" as const,
      sourceState: sourceStateForAuthority(source.authority, checks),
    }));
}

export async function getLiveCalendarSnapshot(
  year: number,
  monthIndex: number,
): Promise<CalendarSnapshot> {
  const sourceHealth = await getSourceHealth();
  const checkedAtLabel = formatCheckedAt(sourceHealth.checkedAt);
  const reachable = sourceHealth.checks.filter((check) => check.state !== "review").length;
  const warnings = sourceHealth.checks
    .filter((check) => check.state === "review")
    .map((check) => `${check.authority} needs a manual source check.`);
  const recurringEvents = getComplianceEvents(year, monthIndex, {
    lastVerified: checkedAtLabel,
    sourceState: "checked",
  }).map((event) => ({
    ...event,
    sourceState: sourceStateForAuthority(event.authority, sourceHealth.checks),
  }));
  const regulatoryEvents = getRegulatoryEffectiveDates(
    year,
    monthIndex,
    sourceHealth.checkedAt,
    sourceHealth.checks,
  );

  return {
    mode: "live",
    year,
    monthIndex,
    checkedAt: sourceHealth.checkedAt,
    nextRefreshAt: nextRefreshAfter(new Date(sourceHealth.checkedAt)).toISOString(),
    sourceCount: sourceHealth.checks.length,
    sourcesReachable: reachable,
    health: warnings.length ? "review" : "healthy",
    warnings,
    events: [...recurringEvents, ...regulatoryEvents]
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)),
  };
}
