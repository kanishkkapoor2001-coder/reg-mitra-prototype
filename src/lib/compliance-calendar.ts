export type ComplianceCategory = "GST" | "Direct tax" | "Payroll";

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
    url: "https://www.epfindia.gov.in/site_en/FAQ.php/FAQ.php",
  },
} as const;

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function priorMonthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(year, monthIndex - 1, 1));
}

export function getComplianceEvents(year: number, monthIndex: number): ComplianceEvent[] {
  const events: ComplianceEvent[] = [];
  const tdsDay = monthIndex === 3 ? 30 : 7;
  const tdsPeriod = priorMonthLabel(year, monthIndex);

  events.push({
    id: `tds-deposit-${year}-${monthIndex}`,
    title: `TDS/TCS deposit for ${tdsPeriod}`,
    shortTitle: "TDS deposit",
    date: isoDate(year, monthIndex, tdsDay),
    category: "Direct tax",
    authority: "Income Tax Department",
    applicability: "Deductors or collectors with tax deducted/collected in the prior month. Government and special cases can differ.",
    description: monthIndex === 3
      ? "The general due date for tax deducted in March is 30 April."
      : "The general due date is seven days from the end of the month in which tax was deducted or collected.",
    sourceLabel: sources.tdsDeposit.label,
    sourceUrl: sources.tdsDeposit.url,
    lastVerified: "28 July 2026",
  });

  events.push({
    id: `gstr1-${year}-${monthIndex}`,
    title: `GSTR-1 monthly return for ${tdsPeriod}`,
    shortTitle: "GSTR-1",
    date: isoDate(year, monthIndex, 11),
    category: "GST",
    authority: "Goods and Services Tax Network",
    applicability: "Registered taxpayers filing GSTR-1 monthly. QRMP filers generally use the quarterly timetable instead.",
    description: "The standard monthly due date is the 11th day of the succeeding month, subject to notifications or extensions.",
    sourceLabel: sources.gstr1.label,
    sourceUrl: sources.gstr1.url,
    lastVerified: "28 July 2026",
  });

  events.push({
    id: `epf-${year}-${monthIndex}`,
    title: `EPF contribution for ${tdsPeriod}`,
    shortTitle: "EPF",
    date: isoDate(year, monthIndex, 15),
    category: "Payroll",
    authority: "Employees’ Provident Fund Organisation",
    applicability: "Employers covered by the EPF scheme with contributions due for the prior wage month.",
    description: "Employers generally pay contributions within 15 days of the close of each month.",
    sourceLabel: sources.epf.label,
    sourceUrl: sources.epf.url,
    lastVerified: "28 July 2026",
  });

  events.push({
    id: `gstr3b-${year}-${monthIndex}`,
    title: `GSTR-3B monthly return for ${tdsPeriod}`,
    shortTitle: "GSTR-3B",
    date: isoDate(year, monthIndex, 20),
    category: "GST",
    authority: "Goods and Services Tax Network",
    applicability: "Normal taxpayers on the monthly filing cycle. QRMP filers generally follow 22nd/24th state-based quarterly dates.",
    description: "The standard monthly due date is the 20th day of the succeeding month, subject to notifications or extensions.",
    sourceLabel: sources.gstr3b.label,
    sourceUrl: sources.gstr3b.url,
    lastVerified: "28 July 2026",
  });

  const statementDeadlines: Record<number, { day: number; quarter: string }> = {
    0: { day: 31, quarter: "Q3" },
    4: { day: 31, quarter: "Q4" },
    6: { day: 31, quarter: "Q1" },
    9: { day: 31, quarter: "Q2" },
  };
  const statement = statementDeadlines[monthIndex];
  if (statement) {
    events.push({
      id: `tds-statement-${year}-${monthIndex}`,
      title: `${statement.quarter} quarterly TDS statement`,
      shortTitle: "TDS statement",
      date: isoDate(year, monthIndex, statement.day),
      category: "Direct tax",
      authority: "Income Tax Department",
      applicability: "Deductors required to furnish a quarterly TDS statement for the relevant form and quarter.",
      description: "Quarterly TDS statement deadlines are 31 July, 31 October, 31 January, and 31 May for Q1 through Q4 respectively.",
      sourceLabel: sources.tdsStatement.label,
      sourceUrl: sources.tdsStatement.url,
      lastVerified: "28 July 2026",
    });
  }

  if ([2, 5, 8, 11].includes(monthIndex)) {
    const instalment = monthIndex === 2 ? "fourth" : monthIndex === 5 ? "first" : monthIndex === 8 ? "second" : "third";
    events.push({
      id: `advance-tax-${year}-${monthIndex}`,
      title: `${instalment.charAt(0).toUpperCase()}${instalment.slice(1)} advance-tax instalment`,
      shortTitle: "Advance tax",
      date: isoDate(year, monthIndex, 15),
      category: "Direct tax",
      authority: "Income Tax Department",
      applicability: "Taxpayers liable to pay advance tax. Presumptive taxation and other cases can follow different instalment rules.",
      description: "Standard instalment dates are 15 June, 15 September, 15 December, and 15 March.",
      sourceLabel: sources.advanceTax.label,
      sourceUrl: sources.advanceTax.url,
      lastVerified: "28 July 2026",
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function parseLocalDate(value: string): Date {
  const [year = 1970, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
