import {
  OBLIGATION_RULES,
  dueDayFor,
  findExtension,
  isWithinCoverage,
  ruleIsInForce,
  type ObligationId,
} from "./compliance-rules.ts";

export type ComplianceCategory = "GST" | "Direct tax" | "Payroll" | "Regulatory update";
export type CalendarMode = "demo" | "product";
export type CalendarSourceState = "checked" | "review";

export interface ComplianceEvent {
  id: string;
  title: string;
  shortTitle: string;
  date: string;
  category: ComplianceCategory;
  authority: string;
  applicability: string;
  description: string;
  sourceLabel: string;
  sourceUrl: string;
  lastVerified: string;
  kind: "obligation" | "regulatory-update";
  sourceState: CalendarSourceState;
  /** The provision that fixes this date. */
  statutoryBasis?: string;
  /**
   * Set when a notified extension moved this date. Carries the original date
   * and the notification, so the change is auditable rather than silent.
   */
  extension?: {
    originalDate: string;
    notification: string;
    sourceUrl: string;
    limitedTo?: string;
  };
}

export interface CalendarSnapshot {
  mode: "live";
  year: number;
  monthIndex: number;
  checkedAt: string;
  nextRefreshAt: string;
  sourceCount: number;
  sourcesReachable: number;
  health: "healthy" | "review";
  warnings: string[];
  events: ComplianceEvent[];
}

const sources = {
  tdsDeposit: {
    label: "Income Tax Department · Tax payment FAQ",
    url: "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tax-payments-faq?mobile-app=1",
  },
  tdsStatement: {
    label: "Income Tax Department · Form 140",
    url: "https://www.incometax.gov.in/iec/foportal/newformpage/forms/form140-um",
  },
  advanceTax: {
    label: "Income Tax Department · ITR-1 guidance",
    url: "https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/file-itr-1-sahaj-online",
  },
  gstr1: {
    label: "GST Portal · GSTR-1 manual",
    url: "https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm",
  },
  gstr3b: {
    label: "GST Portal · New taxpayer welcome kit",
    url: "https://tutorial.gst.gov.in/downloads/news/welcome_kit_for_new_taxpyers.pdf",
  },
  epf: {
    label: "EPFO · Employer FAQ",
    url: "https://www.epfindia.gov.in/site_en/FAQ.php",
  },
} as const;

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function priorMonthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(year, monthIndex - 1, 1));
}

/**
 * Resolves an obligation date: the statutory day, then any notified extension.
 *
 * Returns null when the rule was not in force for that period — the calendar
 * shows nothing rather than projecting today's position backwards.
 */
function resolveDue(
  obligationId: ObligationId,
  year: number,
  monthIndex: number,
  dayOverride?: number,
): {
  date: string;
  statutoryBasis: string;
  extension?: ComplianceEvent["extension"];
} | null {
  const rule = OBLIGATION_RULES[obligationId];
  const day = dayOverride ?? dueDayFor(rule, monthIndex);
  const statutoryDate = isoDate(year, monthIndex, day);

  if (!ruleIsInForce(rule, statutoryDate) || !isWithinCoverage(statutoryDate)) return null;

  // The tax period is the month the obligation relates to, i.e. the prior one.
  const periodDate = new Date(Date.UTC(year, monthIndex - 1, 1));
  const period = `${periodDate.getUTCFullYear()}-${String(periodDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const extension = findExtension(obligationId, period);

  if (!extension) return { date: statutoryDate, statutoryBasis: rule.statutoryBasis };

  return {
    date: extension.extendedTo,
    statutoryBasis: rule.statutoryBasis,
    extension: {
      originalDate: statutoryDate,
      notification: extension.notification,
      sourceUrl: extension.sourceUrl,
      limitedTo: extension.limitedTo,
    },
  };
}

export function getComplianceEvents(
  year: number,
  monthIndex: number,
  options: {
    lastVerified?: string;
    sourceState?: CalendarSourceState;
  } = {},
): ComplianceEvent[] {
  const events: ComplianceEvent[] = [];
  const tdsPeriod = priorMonthLabel(year, monthIndex);
  const lastVerified = options.lastVerified ?? "Sample data · 28 July 2026";
  const sourceState = options.sourceState ?? "review";

  const tdsDue = resolveDue("tds-deposit", year, monthIndex);
  if (tdsDue) events.push({
    id: `tds-deposit-${year}-${monthIndex}`,
    title: `TDS/TCS deposit for ${tdsPeriod}`,
    shortTitle: "TDS deposit",
    date: tdsDue.date,
    statutoryBasis: tdsDue.statutoryBasis,
    extension: tdsDue.extension,
    category: "Direct tax",
    authority: "Income Tax Department",
    applicability: "Deductors or collectors with tax deducted/collected in the prior month. Government and special cases can differ.",
    description: monthIndex === 3
      ? "The general due date for tax deducted in March is 30 April."
      : "The general due date is seven days from the end of the month in which tax was deducted or collected.",
    sourceLabel: sources.tdsDeposit.label,
    sourceUrl: sources.tdsDeposit.url,
    lastVerified,
    kind: "obligation",
    sourceState,
  });

  const gstr1Due = resolveDue("gstr1", year, monthIndex);
  if (gstr1Due) events.push({
    id: `gstr1-${year}-${monthIndex}`,
    title: `GSTR-1 monthly return for ${tdsPeriod}`,
    shortTitle: "GSTR-1",
    date: gstr1Due.date,
    statutoryBasis: gstr1Due.statutoryBasis,
    extension: gstr1Due.extension,
    category: "GST",
    authority: "Goods and Services Tax Network",
    applicability: "Registered taxpayers filing GSTR-1 monthly. QRMP filers generally use the quarterly timetable instead.",
    description: "The standard monthly due date is the 11th day of the succeeding month, subject to notifications or extensions.",
    sourceLabel: sources.gstr1.label,
    sourceUrl: sources.gstr1.url,
    lastVerified,
    kind: "obligation",
    sourceState,
  });

  const epfDue = resolveDue("epf", year, monthIndex);
  if (epfDue) events.push({
    id: `epf-${year}-${monthIndex}`,
    title: `EPF contribution for ${tdsPeriod}`,
    shortTitle: "EPF",
    date: epfDue.date,
    statutoryBasis: epfDue.statutoryBasis,
    extension: epfDue.extension,
    category: "Payroll",
    authority: "Employees’ Provident Fund Organisation",
    applicability: "Employers covered by the EPF scheme with contributions due for the prior wage month.",
    description: "Employers generally pay contributions within 15 days of the close of each month.",
    sourceLabel: sources.epf.label,
    sourceUrl: sources.epf.url,
    lastVerified,
    kind: "obligation",
    sourceState,
  });

  const gstr3bDue = resolveDue("gstr3b", year, monthIndex);
  if (gstr3bDue) events.push({
    id: `gstr3b-${year}-${monthIndex}`,
    title: `GSTR-3B monthly return for ${tdsPeriod}`,
    shortTitle: "GSTR-3B",
    date: gstr3bDue.date,
    statutoryBasis: gstr3bDue.statutoryBasis,
    extension: gstr3bDue.extension,
    category: "GST",
    authority: "Goods and Services Tax Network",
    applicability: "Normal taxpayers on the monthly filing cycle. QRMP filers generally follow 22nd/24th state-based quarterly dates.",
    description: "The standard monthly due date is the 20th day of the succeeding month, subject to notifications or extensions.",
    sourceLabel: sources.gstr3b.label,
    sourceUrl: sources.gstr3b.url,
    lastVerified,
    kind: "obligation",
    sourceState,
  });

  const statementDeadlines: Record<number, { day: number; quarter: string }> = {
    0: { day: 31, quarter: "Q3" },
    4: { day: 31, quarter: "Q4" },
    6: { day: 31, quarter: "Q1" },
    9: { day: 31, quarter: "Q2" },
  };
  const statement = statementDeadlines[monthIndex];
  const statementDue = statement ? resolveDue("tds-statement", year, monthIndex, statement.day) : null;
  if (statement && statementDue) {
    events.push({
      id: `tds-statement-${year}-${monthIndex}`,
      title: `${statement.quarter} quarterly TDS statement`,
      shortTitle: "TDS statement",
      date: statementDue.date,
      statutoryBasis: statementDue.statutoryBasis,
      extension: statementDue.extension,
      category: "Direct tax",
      authority: "Income Tax Department",
      applicability: "Deductors required to furnish a quarterly TDS statement for the relevant form and quarter.",
      description: "Quarterly TDS statement deadlines are 31 July, 31 October, 31 January, and 31 May for Q1 through Q4 respectively.",
      sourceLabel: sources.tdsStatement.label,
      sourceUrl: sources.tdsStatement.url,
      lastVerified,
      kind: "obligation",
      sourceState,
    });
  }

  const advanceDue = [2, 5, 8, 11].includes(monthIndex)
    ? resolveDue("advance-tax", year, monthIndex)
    : null;
  if (advanceDue) {
    const instalment = monthIndex === 2 ? "fourth" : monthIndex === 5 ? "first" : monthIndex === 8 ? "second" : "third";
    events.push({
      id: `advance-tax-${year}-${monthIndex}`,
      title: `${instalment.charAt(0).toUpperCase()}${instalment.slice(1)} advance-tax instalment`,
      shortTitle: "Advance tax",
      date: advanceDue.date,
      statutoryBasis: advanceDue.statutoryBasis,
      extension: advanceDue.extension,
      category: "Direct tax",
      authority: "Income Tax Department",
      applicability: "Taxpayers liable to pay advance tax. Presumptive taxation and other cases can follow different instalment rules.",
      description: "Standard instalment dates are 15 June, 15 September, 15 December, and 15 March.",
      sourceLabel: sources.advanceTax.label,
      sourceUrl: sources.advanceTax.url,
      lastVerified,
      kind: "obligation",
      sourceState,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function parseLocalDate(value: string): Date {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
