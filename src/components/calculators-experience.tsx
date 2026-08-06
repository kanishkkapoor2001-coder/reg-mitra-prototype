"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircleIcon } from "@/components/icons";
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
} from "@/lib/tools/calculators";

type FieldKind = "number" | "date" | "select" | "checkbox";

interface Field {
  name: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
  optional?: boolean;
}

interface CalculatorSpec {
  id: string;
  title: string;
  blurb: string;
  basis: string;
  fields: Field[];
  run: (values: Record<string, string>) => CalculationResult;
}

const num = (values: Record<string, string>, key: string) => Number(values[key] ?? "");
const opt = (values: Record<string, string>, key: string) =>
  values[key] === "" || values[key] === undefined ? undefined : values[key];
const bool = (values: Record<string, string>, key: string) => values[key] === "true";

const CALCULATORS: CalculatorSpec[] = [
  {
    id: "234a",
    title: "Interest for late ITR filing",
    blurb: "1% per month, or part of a month, on unpaid tax from the due date to the date of filing.",
    basis: "Section 234A, Income-tax Act",
    fields: [
      { name: "unpaidTax", label: "Unpaid tax (₹)", kind: "number", hint: "after TDS/TCS, advance tax and reliefs" },
      { name: "dueDate", label: "Due date", kind: "date" },
      { name: "filingDate", label: "Date of filing", kind: "date" },
    ],
    run: (v) => interest234A({ unpaidTax: num(v, "unpaidTax"), dueDate: v.dueDate ?? "", filingDate: v.filingDate ?? "" }),
  },
  {
    id: "234b",
    title: "Interest for advance-tax default",
    blurb: "Applies when advance tax paid is under 90% of assessed tax.",
    basis: "Section 234B, Income-tax Act",
    fields: [
      { name: "assessedTax", label: "Assessed tax (₹)", kind: "number" },
      { name: "advanceTaxPaid", label: "Advance tax paid (₹)", kind: "number" },
      { name: "assessmentDate", label: "Date of assessment", kind: "date" },
      { name: "financialYearEnd", label: "Financial year ended (31 March)", kind: "date" },
    ],
    run: (v) => interest234B({
      assessedTax: num(v, "assessedTax"),
      advanceTaxPaid: num(v, "advanceTaxPaid"),
      assessmentDate: v.assessmentDate ?? "",
      financialYearEnd: v.financialYearEnd ?? "",
    }),
  },
  {
    id: "234c",
    title: "Interest for deferred advance tax",
    blurb: "Checks each instalment against the 15% / 45% / 75% / 100% benchmarks.",
    basis: "Section 234C, Income-tax Act",
    fields: [
      { name: "totalTaxLiability", label: "Total tax liability (₹)", kind: "number" },
      { name: "paidByJune15", label: "Paid by 15 Jun (₹)", kind: "number", hint: "cumulative", optional: true },
      { name: "paidBySeptember15", label: "Paid by 15 Sep (₹)", kind: "number", hint: "cumulative", optional: true },
      { name: "paidByDecember15", label: "Paid by 15 Dec (₹)", kind: "number", hint: "cumulative", optional: true },
      { name: "paidByMarch15", label: "Paid by 15 Mar (₹)", kind: "number", hint: "cumulative", optional: true },
    ],
    run: (v) => interest234C({
      totalTaxLiability: num(v, "totalTaxLiability"),
      paidByJune15: v.paidByJune15 ? num(v, "paidByJune15") : 0,
      paidBySeptember15: v.paidBySeptember15 ? num(v, "paidBySeptember15") : 0,
      paidByDecember15: v.paidByDecember15 ? num(v, "paidByDecember15") : 0,
      paidByMarch15: v.paidByMarch15 ? num(v, "paidByMarch15") : 0,
    }),
  },
  {
    id: "234f",
    title: "Late filing fee",
    blurb: "₹1,000 where total income is up to ₹5,00,000, otherwise ₹5,000.",
    basis: "Section 234F, Income-tax Act",
    fields: [
      { name: "totalIncome", label: "Total income (₹)", kind: "number" },
      { name: "filedAfterDueDate", label: "Filed after the due date", kind: "checkbox" },
      { name: "liableToFile", label: "Liable to furnish a return", kind: "checkbox" },
    ],
    run: (v) => lateFilingFee234F({
      totalIncome: num(v, "totalIncome"),
      filedAfterDueDate: bool(v, "filedAfterDueDate"),
      liableToFile: v.liableToFile === undefined ? true : bool(v, "liableToFile"),
    }),
  },
  {
    id: "tds",
    title: "TDS default interest",
    blurb: "1% per month for failure to deduct; 1.5% per month for failure to deposit after deduction.",
    basis: "Section 201(1A), Income-tax Act",
    fields: [
      { name: "amount", label: "Amount of tax (₹)", kind: "number" },
      {
        name: "defaultType", label: "Type of default", kind: "select",
        options: [
          { value: "failure-to-deduct", label: "Failure to deduct (1%)" },
          { value: "failure-to-deposit", label: "Deducted but deposited late (1.5%)" },
        ],
      },
      { name: "fromDate", label: "From", kind: "date" },
      { name: "toDate", label: "To", kind: "date" },
    ],
    run: (v) => tdsDefaultInterest({
      amount: num(v, "amount"),
      defaultType: (v.defaultType ?? "failure-to-deduct") as "failure-to-deduct" | "failure-to-deposit",
      fromDate: v.fromDate ?? "",
      toDate: v.toDate ?? "",
    }),
  },
  {
    id: "gst-interest",
    title: "GST interest on delayed payment",
    blurb: "18% per annum on a daily basis; 24% for undue or excess input tax credit.",
    basis: "Section 50, CGST Act, 2017",
    fields: [
      { name: "taxAmount", label: "Tax paid late (₹)", kind: "number" },
      { name: "fromDate", label: "From", kind: "date", hint: "day after the due date" },
      { name: "toDate", label: "Date of payment", kind: "date" },
      { name: "undueItcClaim", label: "Undue or excess ITC (24%)", kind: "checkbox" },
    ],
    run: (v) => gstInterestSection50({
      taxAmount: num(v, "taxAmount"),
      fromDate: v.fromDate ?? "",
      toDate: v.toDate ?? "",
      undueItcClaim: bool(v, "undueItcClaim"),
    }),
  },
  {
    id: "gst-late-fee",
    title: "GST late fee",
    blurb: "Computed per Act and doubled for CGST + SGST. Uses the statutory rate unless you supply the notified one.",
    basis: "Section 47, CGST Act, 2017",
    fields: [
      { name: "daysDelayed", label: "Days delayed", kind: "number" },
      { name: "nilReturn", label: "Nil return (recorded, but the reduced fee comes from a notification — supply the rate below)", kind: "checkbox" },
      { name: "perActDailyFee", label: "Notified daily fee per Act (₹)", kind: "number", hint: "leave blank for the statutory ₹100", optional: true },
      { name: "perActCap", label: "Notified cap per Act (₹)", kind: "number", optional: true },
    ],
    run: (v) => gstLateFeeSection47({
      daysDelayed: num(v, "daysDelayed"),
      nilReturn: bool(v, "nilReturn"),
      perActDailyFee: v.perActDailyFee ? num(v, "perActDailyFee") : undefined,
      perActCap: v.perActCap ? num(v, "perActCap") : undefined,
    }),
  },
  {
    id: "gst-due-date",
    title: "GST return due date",
    blurb: "GSTR-1 and GSTR-3B, monthly or QRMP — including the 22nd/24th State split.",
    basis: "Notified GST return due dates",
    fields: [
      {
        name: "returnType", label: "Return", kind: "select",
        options: [{ value: "GSTR-3B", label: "GSTR-3B" }, { value: "GSTR-1", label: "GSTR-1" }],
      },
      { name: "periodEnd", label: "Period ends", kind: "date", hint: "last day of the tax period" },
      {
        name: "filingFrequency", label: "Frequency", kind: "select",
        options: [{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly (QRMP)" }],
      },
      { name: "stateCode", label: "State code", kind: "text" as FieldKind, hint: "two letters, e.g. MH — needed for QRMP", optional: true },
    ],
    run: (v) => gstReturnDueDate({
      returnType: (v.returnType ?? "GSTR-3B") as "GSTR-1" | "GSTR-3B",
      periodEnd: v.periodEnd ?? "",
      filingFrequency: opt(v, "filingFrequency") as "monthly" | "quarterly" | undefined,
      stateCode: opt(v, "stateCode"),
    }),
  },
  {
    id: "advance-tax",
    title: "Advance tax schedule",
    blurb: "The four instalment dates and cumulative percentages for a financial year.",
    basis: "Advance-tax instalment benchmarks",
    fields: [
      { name: "financialYearStartYear", label: "FY starting year", kind: "number", hint: "e.g. 2026 for FY 2026-27" },
    ],
    run: (v) => advanceTaxSchedule({ financialYearStartYear: num(v, "financialYearStartYear") }),
  },
];

function CalculatorCard({ spec }: Readonly<{ spec: CalculatorSpec }>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState("");

  function compute() {
    try {
      setResult(spec.run(values));
      setError("");
    } catch (computeError) {
      setResult(null);
      setError(computeError instanceof CalculatorInputError
        ? computeError.message
        : "Check the values entered and try again.");
    }
  }

  return (
    <article className="calc-card" id={spec.id}>
      <div className="calc-head">
        <h2>{spec.title}</h2>
        <p>{spec.blurb}</p>
        <span className="calc-basis">{spec.basis}</span>
      </div>

      <div className="calc-fields">
        {spec.fields.map((field) => (
          <label className={`calc-field ${field.kind === "checkbox" ? "calc-field-check" : ""}`} key={field.name}>
            {field.kind === "checkbox" ? (
              <>
                <input
                  checked={values[field.name] === "true"}
                  onChange={(event) => setValues({ ...values, [field.name]: String(event.target.checked) })}
                  type="checkbox"
                />
                <span>{field.label}</span>
              </>
            ) : (
              <>
                <span>
                  {field.label}
                  {field.optional ? <em> optional</em> : null}
                  {field.hint ? <small>{field.hint}</small> : null}
                </span>
                {field.kind === "select" ? (
                  <select
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    value={values[field.name] ?? field.options?.[0]?.value ?? ""}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    inputMode={field.kind === "number" ? "decimal" : undefined}
                    onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                    type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"}
                    value={values[field.name] ?? ""}
                  />
                )}
              </>
            )}
          </label>
        ))}
      </div>

      <button className="button primary calc-run" onClick={compute} type="button">Compute</button>

      {error ? <p className="calc-error" role="alert">{error}</p> : null}

      {result ? (
        <div className="calc-result" role="status">
          <p className="calc-headline">{result.headline}</p>
          <dl className="calc-working">
            {result.steps.map((step, index) => (
              <div key={index}>
                <dt>{step.label}</dt>
                <dd>{step.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="calc-statutory">{result.statutoryBasis}</p>
          <ul className="calc-caveats">
            {result.caveats.map((caveat, index) => <li key={index}>{caveat}</li>)}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function CalculatorsExperience() {
  return (
    <div className="calc-page">
      <header className="calc-hero">
        <div>
          <p className="eyebrow">Compliance calculators</p>
          <h1>Interest, fees and due dates — computed, not estimated</h1>
          <p>
            Every figure here is produced by code and shows its full working, so you can check
            each step rather than trust a number. Nothing is sent anywhere; this runs in your browser.
          </p>
        </div>
        <div className="calc-assurance">
          <CheckCircleIcon />
          <span>
            <strong>No language model involved</strong>
            <small>
              These are exact computations, not generated text. The assistant uses these same
              functions when a question needs a figure.
            </small>
          </span>
        </div>
      </header>

      <nav aria-label="Jump to a calculator" className="calc-jump">
        {CALCULATORS.map((spec) => (
          <a href={`#${spec.id}`} key={spec.id}>{spec.title}</a>
        ))}
      </nav>

      <div className="calc-grid">
        {CALCULATORS.map((spec) => <CalculatorCard key={spec.id} spec={spec} />)}
      </div>

      <p className="calc-footnote">
        Results depend on the facts you enter and on the notification in force for the period.
        Confirm applicability before relying on any figure. <Link href="/assistant">Ask the assistant</Link> if
        you need the underlying rule with its source.
      </p>
    </div>
  );
}
