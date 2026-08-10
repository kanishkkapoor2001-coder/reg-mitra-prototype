// Effective-dated statutory due-date rules, and the notified extensions that
// override them.
//
// The calendar previously held six bare day numbers with no sense of time. It
// would render "GSTR-3B · 20th" for any month between 2024 and 2035, as though
// today's position had always applied and always would. Two consequences, both
// serious for a filing calendar:
//
//  1. No history. A period before a rule took effect got today's date.
//  2. No extensions. Government extensions by notification are the single
//     highest-frequency source of real-world date error in Indian compliance,
//     and they were not modelled at all — if CBIC extended GSTR-3B, the
//     calendar still showed the 20th, styled exactly like a verified date.
//
// The honest position on history: we have verified the CURRENT position, not
// the full amendment history of each provision. So coverage is declared
// explicitly and periods outside it return nothing rather than a guess.

export type ObligationId =
  | "tds-deposit"
  | "tds-statement"
  | "advance-tax"
  | "gstr1"
  | "gstr3b"
  | "epf";

/**
 * The window this rule set is asserted to describe.
 *
 * Anything earlier is not "the 20th" — it is unverified, and the calendar says
 * so instead of rendering a date. Extend this backwards only when the earlier
 * position has actually been checked against the notifications in force then.
 */
export const COVERAGE_FROM = "2025-04-01";

/**
 * How far ahead a due date may be projected.
 *
 * A date beyond this is a forecast of a rule that has not been enacted for that
 * period. Two financial years is already generous.
 */
export const COVERAGE_TO = "2027-03-31";

export interface ObligationRule {
  id: ObligationId;
  /** Day of the month the obligation falls due, unless overridden below. */
  dayOfMonth: number;
  /** Month-specific overrides, e.g. TDS for March is due 30 April. */
  dayByMonthIndex?: Partial<Record<number, number>>;
  /** The provision that fixes this date. */
  statutoryBasis: string;
  /** From when this encoding is asserted to hold. */
  effectiveFrom: string;
  /** When it ceased, if it has. */
  effectiveTo?: string;
}

/**
 * Statutory basis is the provision, not a notification number we cannot verify.
 * Where a date is set by notification under a rule, that is said plainly.
 */
export const OBLIGATION_RULES: Record<ObligationId, ObligationRule> = {
  "tds-deposit": {
    id: "tds-deposit",
    dayOfMonth: 7,
    // Tax deducted in March is payable by 30 April, not 7 April.
    dayByMonthIndex: { 3: 30 },
    statutoryBasis: "Rule 30, Income-tax Rules, 1962 — time and mode of payment of tax deducted",
    effectiveFrom: COVERAGE_FROM,
  },
  "tds-statement": {
    id: "tds-statement",
    dayOfMonth: 31,
    statutoryBasis: "Rule 31A, Income-tax Rules, 1962 — quarterly statement of deduction of tax",
    effectiveFrom: COVERAGE_FROM,
  },
  "advance-tax": {
    id: "advance-tax",
    dayOfMonth: 15,
    statutoryBasis: "Section 211, Income-tax Act, 1961 — instalments of advance tax",
    effectiveFrom: COVERAGE_FROM,
  },
  gstr1: {
    id: "gstr1",
    dayOfMonth: 11,
    statutoryBasis:
      "Section 37, CGST Act, 2017 read with Rule 59, CGST Rules, 2017 and the notification fixing the monthly due date",
    effectiveFrom: COVERAGE_FROM,
  },
  gstr3b: {
    id: "gstr3b",
    dayOfMonth: 20,
    statutoryBasis:
      "Section 39, CGST Act, 2017 read with Rule 61, CGST Rules, 2017 and the notification fixing the monthly due date",
    effectiveFrom: COVERAGE_FROM,
  },
  epf: {
    id: "epf",
    dayOfMonth: 15,
    statutoryBasis: "Paragraph 38, Employees’ Provident Funds Scheme, 1952 — mode of payment of contributions",
    effectiveFrom: COVERAGE_FROM,
  },
};

/**
 * A due date moved by government notification.
 *
 * DELIBERATELY EMPTY until an operator records a real one. An invented
 * extension is exactly the fabricated regulatory claim this product exists to
 * prevent, and a wrong extension is worse than none: it would move a date the
 * user then relies on.
 *
 * The mechanism is what matters here — when an extension IS recorded, the
 * calendar shifts the date, names the notification, and shows the original.
 * Until then the calendar says plainly that it does not track extensions and
 * the portal must be checked.
 */
export interface NotifiedExtension {
  obligationId: ObligationId;
  /** Tax period the extension covers, as YYYY-MM. */
  period: string;
  /** The extended due date, ISO. */
  extendedTo: string;
  /** Notification or circular number — required; an unsourced extension is not usable. */
  notification: string;
  sourceUrl: string;
  /** Set when the extension is limited, e.g. to certain States or taxpayer classes. */
  limitedTo?: string;
}

export const NOTIFIED_EXTENSIONS: readonly NotifiedExtension[] = [];

export function isWithinCoverage(isoDate: string): boolean {
  return isoDate >= COVERAGE_FROM && isoDate <= COVERAGE_TO;
}

export function ruleIsInForce(rule: ObligationRule, isoDate: string): boolean {
  if (isoDate < rule.effectiveFrom) return false;
  return !rule.effectiveTo || isoDate <= rule.effectiveTo;
}

export function dueDayFor(rule: ObligationRule, monthIndex: number): number {
  return rule.dayByMonthIndex?.[monthIndex] ?? rule.dayOfMonth;
}

/** The extension covering this obligation and period, if one has been recorded. */
export function findExtension(
  obligationId: ObligationId,
  period: string,
  extensions: readonly NotifiedExtension[] = NOTIFIED_EXTENSIONS,
): NotifiedExtension | null {
  return extensions.find(
    (extension) => extension.obligationId === obligationId && extension.period === period,
  ) ?? null;
}
