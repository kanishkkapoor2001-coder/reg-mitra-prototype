// Tool registry: what the model may ask for, and how it is executed.
//
// The model NEVER computes. It selects a calculator and extracts parameters; the
// deterministic function in calculators.ts produces the number, and that verified
// working is injected into the answer as evidence.

// Relative import: this module is exercised directly by the node test runner and
// by scripts, which do not resolve the "@/" path alias.
import {
  CalculatorInputError,
  advanceTaxSchedule,
  gstInterestSection50,
  gstLateFeeSection47,
  gstReturnDueDate,
  interest234A,
  interest234B,
  interest234C,
  lateFilingFee234F,
  tdsDefaultInterest,
  type CalculationResult,
} from "./calculators.ts";

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const ISO_DATE = { type: "string", description: "Date in YYYY-MM-DD format" };

export const calculatorDeclarations: FunctionDeclaration[] = [
  {
    name: "interest_234A",
    description: "Interest for late filing of an income-tax return (section 234A): 1% per month or part on unpaid tax from the due date to the filing date.",
    parameters: {
      type: "object",
      properties: {
        unpaidTax: { type: "number", description: "Tax payable after TDS/TCS, advance tax and reliefs, in rupees" },
        dueDate: ISO_DATE,
        filingDate: ISO_DATE,
      },
      required: ["unpaidTax", "dueDate", "filingDate"],
    },
  },
  {
    name: "interest_234B",
    description: "Interest for default in payment of advance tax (section 234B): applies when advance tax paid is under 90% of assessed tax.",
    parameters: {
      type: "object",
      properties: {
        assessedTax: { type: "number", description: "Assessed tax in rupees" },
        advanceTaxPaid: { type: "number", description: "Total advance tax paid in rupees" },
        assessmentDate: ISO_DATE,
        financialYearEnd: { ...ISO_DATE, description: "The 31 March that ends the financial year under assessment. Required — interest runs from 1 April of the assessment year and cannot be derived from the assessment date alone." },
      },
      required: ["assessedTax", "advanceTaxPaid", "assessmentDate", "financialYearEnd"],
    },
  },
  {
    name: "interest_234C",
    description: "Interest for deferment of advance tax (section 234C) against the 15%/45%/75%/100% instalment benchmarks.",
    parameters: {
      type: "object",
      properties: {
        totalTaxLiability: { type: "number", description: "Total tax liability for the year in rupees" },
        paidByJune15: { type: "number", description: "Cumulative advance tax paid by 15 June" },
        paidBySeptember15: { type: "number", description: "Cumulative advance tax paid by 15 September" },
        paidByDecember15: { type: "number", description: "Cumulative advance tax paid by 15 December" },
        paidByMarch15: { type: "number", description: "Cumulative advance tax paid by 15 March" },
      },
      required: ["totalTaxLiability"],
    },
  },
  {
    name: "late_filing_fee_234F",
    description: "Fee for late filing of an income-tax return (section 234F): ₹1,000 where total income is up to ₹5,00,000, otherwise ₹5,000.",
    parameters: {
      type: "object",
      properties: {
        totalIncome: { type: "number", description: "Total income in rupees" },
        filedAfterDueDate: { type: "boolean" },
        liableToFile: { type: "boolean", description: "Whether the person is liable to furnish a return at all" },
      },
      required: ["totalIncome", "filedAfterDueDate"],
    },
  },
  {
    name: "tds_default_interest",
    description: "Interest on a TDS default (section 201(1A)): 1% per month for failure to deduct, 1.5% per month for failure to deposit after deduction.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount of tax in rupees" },
        defaultType: { type: "string", enum: ["failure-to-deduct", "failure-to-deposit"] },
        fromDate: ISO_DATE,
        toDate: ISO_DATE,
      },
      required: ["amount", "defaultType", "fromDate", "toDate"],
    },
  },
  {
    name: "gst_interest_section_50",
    description: "Interest on delayed payment of GST (section 50, CGST Act): 18% per annum on a daily basis, 24% for undue or excess input tax credit.",
    parameters: {
      type: "object",
      properties: {
        taxAmount: { type: "number", description: "Tax paid late, in rupees" },
        fromDate: { ...ISO_DATE, description: "Day after the due date" },
        toDate: { ...ISO_DATE, description: "Date of payment" },
        undueItcClaim: { type: "boolean" },
      },
      required: ["taxAmount", "fromDate", "toDate"],
    },
  },
  {
    name: "gst_late_fee_section_47",
    description: "Late fee for a delayed GST return (section 47, CGST Act), computed per Act and doubled for CGST + SGST.",
    parameters: {
      type: "object",
      properties: {
        daysDelayed: { type: "number" },
        nilReturn: { type: "boolean" },
        perActDailyFee: { type: "number", description: "Notified daily fee per Act, if known" },
        perActCap: { type: "number", description: "Notified cap per Act, if known" },
      },
      required: ["daysDelayed"],
    },
  },
  {
    name: "gst_return_due_date",
    description: "Due date for Form GSTR-1 or Form GSTR-3B for a given tax period, monthly or quarterly (QRMP).",
    parameters: {
      type: "object",
      properties: {
        returnType: { type: "string", enum: ["GSTR-1", "GSTR-3B"] },
        periodEnd: { ...ISO_DATE, description: "Last day of the tax period" },
        filingFrequency: { type: "string", enum: ["monthly", "quarterly"] },
        stateCode: { type: "string", description: "Two-letter State/UT code, needed for quarterly GSTR-3B" },
      },
      required: ["returnType", "periodEnd"],
    },
  },
  {
    name: "advance_tax_schedule",
    description: "Advance-tax instalment dates and cumulative percentages for a financial year.",
    parameters: {
      type: "object",
      properties: {
        financialYearStartYear: { type: "number", description: "Starting year, e.g. 2026 for FY 2026-27" },
      },
      required: ["financialYearStartYear"],
    },
  },
];

type Executor = (args: Record<string, unknown>) => CalculationResult;

const executors: Record<string, Executor> = {
  interest_234A: (a) => interest234A(a as Parameters<typeof interest234A>[0]),
  interest_234B: (a) => interest234B(a as Parameters<typeof interest234B>[0]),
  interest_234C: (a) => interest234C(a as Parameters<typeof interest234C>[0]),
  late_filing_fee_234F: (a) => lateFilingFee234F(a as Parameters<typeof lateFilingFee234F>[0]),
  tds_default_interest: (a) => tdsDefaultInterest(a as Parameters<typeof tdsDefaultInterest>[0]),
  gst_interest_section_50: (a) => gstInterestSection50(a as Parameters<typeof gstInterestSection50>[0]),
  gst_late_fee_section_47: (a) => gstLateFeeSection47(a as Parameters<typeof gstLateFeeSection47>[0]),
  gst_return_due_date: (a) => gstReturnDueDate(a as Parameters<typeof gstReturnDueDate>[0]),
  advance_tax_schedule: (a) => advanceTaxSchedule(a as Parameters<typeof advanceTaxSchedule>[0]),
};

export interface ComputationOutcome {
  name: string;
  args: Record<string, unknown>;
  result: CalculationResult | null;
  error: string | null;
}

export function isKnownCalculator(name: string): boolean {
  return Object.hasOwn(executors, name);
}

/**
 * Executes a model-selected calculator. Bad or missing parameters surface as a
 * readable error the assistant can relay ("I need the filing date to compute this")
 * rather than throwing or, worse, inventing a number.
 */
export function runCalculator(name: string, args: Record<string, unknown>): ComputationOutcome {
  const executor = executors[name];
  if (!executor) {
    return { name, args, result: null, error: `Unknown calculator "${name}".` };
  }
  try {
    return { name, args, result: executor(args), error: null };
  } catch (error) {
    return {
      name,
      args,
      result: null,
      error: error instanceof CalculatorInputError
        ? error.message
        : `The computation could not be completed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Renders a computed result as evidence text for the answering model. */
export function formatComputation(outcome: ComputationOutcome): string {
  if (!outcome.result) {
    return `VERIFIED COMPUTATION (${outcome.name}) could not run: ${outcome.error}. `
      + "Ask the professional for the missing facts. Do NOT estimate the figure yourself.";
  }
  const { result } = outcome;
  return [
    `VERIFIED COMPUTATION — ${outcome.name} (computed deterministically in code, not by the model):`,
    result.headline,
    "Working:",
    ...result.steps.map((step) => `  - ${step.label}: ${step.detail}`),
    `Statutory basis: ${result.statutoryBasis}`,
    "Caveats that must be conveyed:",
    ...result.caveats.map((caveat) => `  - ${caveat}`),
    "Present this working and these caveats. Do not recompute or alter the figures.",
  ].join("\n");
}
