export type AssistantMode = "ask" | "act";

export interface DemoConversationMessage {
  role: "user" | "assistant";
  mode: AssistantMode;
  content: string;
}

export interface DemoConversation {
  id: string;
  title: string;
  description: string;
  modeLabel: string;
  finalMode: AssistantMode;
  messages: readonly DemoConversationMessage[];
}

export const demoConversations: readonly DemoConversation[] = [
  {
    id: "igst-client-note",
    title: "Circular to client note",
    description: "Map a CBIC update, then prepare a client message.",
    modeLabel: "Answer → Prepare",
    finalMode: "act",
    messages: [
      {
        role: "user",
        mode: "ask",
        content: "A new CBIC update mentions pharma intermediates. Could it affect Sharma Pharma?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
Possibly, but this template cannot confirm applicability without the official CBIC publication, the product classification, and the client’s transaction facts.

WHAT TO VERIFY
1. Open the issuing authority’s current notification or circular.
2. Match the covered goods and effective date to Sharma Pharma’s product and invoice records.
3. Check whether the affected supplies are interstate and whether any transition treatment applies.

NEXT STEPS
Attach the official document, confirm the relevant product classification, and have the tax reviewer approve the position before client communication.

SOURCE STATUS
Illustrative template only. No authoritative document or live client ledger is connected.`,
      },
      {
        role: "user",
        mode: "act",
        content: "Prepare a short WhatsApp note for the CFO explaining what we need from them.",
      },
      {
        role: "assistant",
        mode: "act",
        content: `DRAFT ACTION
Hi — we are reviewing a recent CBIC update that may affect the IGST treatment of certain pharma intermediates. Please share the relevant product classifications and a sample of recent interstate purchase and sales invoices. We will verify the official text and confirm whether any change is required.

REQUIRED EVIDENCE
Official CBIC publication, product classification, affected invoice sample, and reviewer sign-off.

APPROVAL GATE
Edit, copy, or set this aside. Sending requires an authorised professional’s explicit approval.

EXECUTION STATUS
Draft only. No WhatsApp message has been sent.`,
      },
    ],
  },
  {
    id: "msme-review-tasks",
    title: "MSME ageing review",
    description: "Surface disputed dates before creating audit work.",
    modeLabel: "Answer → Prepare",
    finalMode: "act",
    messages: [
      {
        role: "user",
        mode: "ask",
        content: "Which vendor payments may need an MSME ageing review for Gupta Auto?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
The template would compare supplier status, invoice date, acceptance date, books entry, and payment date. It would not calculate a breach where the underlying dates conflict.

WHAT TO VERIFY
1. Confirm each supplier’s MSME status for the relevant period.
2. Reconcile the invoice, acceptance, ledger, and bank dates.
3. Separate confirmed exceptions from records with missing or disputed evidence.

NEXT STEPS
Three sample entries can move to review; one should remain unresolved until its acceptance date is supported.

SOURCE STATUS
Synthetic example data only. No vendor master, ledger, bank record, or statutory source is connected.`,
      },
      {
        role: "user",
        mode: "act",
        content: "Create tasks for the audit junior, but leave the disputed entry out.",
      },
      {
        role: "assistant",
        mode: "act",
        content: `DRAFT ACTION
Prepared three review tasks: validate supplier status, reconcile supporting dates, and document the proposed treatment. The disputed entry is excluded and flagged for partner review.

REQUIRED EVIDENCE
Supplier declaration, invoice, acceptance record, ledger extract, payment proof, and the reviewer’s conclusion.

APPROVAL GATE
Review the assignee, due date, and evidence list before adding anything to the workspace calendar.

EXECUTION STATUS
Preview only. No task or calendar item has been created.`,
      },
    ],
  },
  {
    id: "din-kyc-handoff",
    title: "DIN KYC handoff",
    description: "Prepare the last mile while preserving the MCA approval step.",
    modeLabel: "Answer → Prepare",
    finalMode: "act",
    messages: [
      {
        role: "user",
        mode: "ask",
        content: "Are all directors’ DIN KYC records complete for the sample company?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
The illustrative workspace shows three records ready for review and one incomplete record. This is not a live MCA status check.

WHAT TO VERIFY
Confirm the current MCA record, the director’s contact details, required attachments, signing method, and the applicable filing instructions.

NEXT STEPS
Resolve the incomplete contact detail, prepare the document checklist, and open the MCA workflow only from an authenticated session.

SOURCE STATUS
Template status only. MCA is not connected and no filing record has been verified.`,
      },
      {
        role: "user",
        mode: "act",
        content: "Prepare the incomplete record and take me to the review point.",
      },
      {
        role: "assistant",
        mode: "act",
        content: `DRAFT ACTION
Prepared a review checklist with the missing contact detail, supporting documents, signing requirement, and portal sequence.

REQUIRED EVIDENCE
Current director details, approved attachments, professional certification, and authenticated MCA access.

APPROVAL GATE
In production, Reg Mitra can open the review screen and stop before Submit or OTP. You remain in control of the final step.

EXECUTION STATUS
Not executed. No portal was opened and no form was submitted.`,
      },
    ],
  },
  {
    id: "sector-calendar",
    title: "Beyond GST and TDS",
    description: "Turn a manufacturing profile into a reviewable calendar.",
    modeLabel: "Answer → Prepare",
    finalMode: "act",
    messages: [
      {
        role: "user",
        mode: "ask",
        content: "What should we review for a pharma factory beyond GST and TDS?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
A cross-functional review may need to cover company law, factory and labour requirements, state-specific establishment rules, gratuity, sector licences, and relevant accounting and auditing standards.

WHAT TO VERIFY
Confirm the operating state, premises, headcount, workforce categories, licences, legal form, reporting framework, and which functions the firm has agreed to monitor.

NEXT STEPS
Classify obligations as confirmed, likely, or needs information. Only confirmed items should be placed on the client calendar.

SOURCE STATUS
General scoping guidance only. No act, rule, state notification, licence, or client record has been supplied.`,
      },
      {
        role: "user",
        mode: "act",
        content: "Prepare a monthly calendar using only confirmed items.",
      },
      {
        role: "assistant",
        mode: "act",
        content: `DRAFT ACTION
Prepared a calendar preview containing five confirmed sample obligations. Three uncertain items remain in a separate information-request list.

REQUIRED EVIDENCE
Official due-date source, client applicability facts, current filing status, owner, and reviewer.

APPROVAL GATE
Review dates and owners before publishing the calendar to the firm workspace.

EXECUTION STATUS
Preview only. No calendar entry or reminder has been created.`,
      },
    ],
  },
  {
    id: "fssai-claim",
    title: "FSSAI licence claim",
    description: "Challenge a client claim before advising on renewal.",
    modeLabel: "Answer",
    finalMode: "ask",
    messages: [
      {
        role: "user",
        mode: "ask",
        content: "Royal Spice says its FSSAI licence no longer needs renewal. Can we rely on that?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
Not from the information in this template. The claim must be checked against FSSAI’s current official publication and the exact licence category and transition position.

WHAT TO VERIFY
1. The current FSSAI order, regulation, or advisory.
2. Licence category, issuing authority, validity record, and any transition condition.
3. Whether state or local requirements continue separately.

NEXT STEPS
Keep the existing renewal control in place until the official text and client record are reviewed.

SOURCE STATUS
No authoritative FSSAI source or live licence record is attached.`,
      },
      {
        role: "user",
        mode: "ask",
        content: "What is the safest client response while we verify it?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
Tell the client the claim is under review and that the current control remains unchanged until the official rule and licence record are confirmed.

WHAT TO VERIFY
Ask for the client’s licence copy and the publication they relied on, then compare both with the current FSSAI source.

NEXT STEPS
Record the evidence gap, assign a reviewer, and set a follow-up before the existing internal due date.

SOURCE STATUS
Preparation guidance only; no current-law conclusion has been reached.`,
      },
    ],
  },
  {
    id: "portal-health",
    title: "Portal sync health",
    description: "Separate current, stale, and disconnected evidence.",
    modeLabel: "Answer → Prepare",
    finalMode: "act",
    messages: [
      {
        role: "user",
        mode: "ask",
        content: "Which sample compliance statuses are too stale to rely on?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
The template distinguishes records checked today, stale records, and disconnected sources. A stale or disconnected status should never be presented as current.

WHAT TO VERIFY
Review the source name, last successful check, evidence captured, and whether the portal session is still authenticated.

NEXT STEPS
Refresh stale sources in read-only mode and route disconnected sources through the approved connection flow.

SOURCE STATUS
All sync times and statuses shown in this conversation are synthetic.`,
      },
      {
        role: "user",
        mode: "act",
        content: "Prepare a safe refresh for GST and an Income Tax reconnection.",
      },
      {
        role: "assistant",
        mode: "act",
        content: `DRAFT ACTION
Prepared two separate previews: refresh the authenticated GST tab in read-only mode, and open the approved Income Tax reconnection flow.

REQUIRED EVIDENCE
User-visible logged-in sessions, connection consent, source timestamp, and captured read-only result.

APPROVAL GATE
Start or cancel each connection separately. Never paste a portal password or OTP into chat.

EXECUTION STATUS
Not started. No credentials were requested, stored, or used.`,
      },
    ],
  },
  {
    id: "tds-status",
    title: "TDS filing status",
    description: "Ask for status without pretending the portal is connected.",
    modeLabel: "Answer",
    finalMode: "ask",
    messages: [
      {
        role: "user",
        mode: "ask",
        content: "Has the sample client’s quarterly TDS return been filed?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
Reg Mitra cannot confirm a filing from this template. A live status needs authoritative portal evidence or an accepted acknowledgement.

WHAT TO VERIFY
Check the relevant period, form, filing status, acknowledgement, processing state, and any correction statement.

NEXT STEPS
Use a logged-in, read-only portal check or attach the acknowledgement for professional review.

SOURCE STATUS
No Income Tax portal, filing receipt, or client record is connected.`,
      },
      {
        role: "user",
        mode: "ask",
        content: "What should the dashboard show until that check is complete?",
      },
      {
        role: "assistant",
        mode: "ask",
        content: `CONCLUSION
Show “Not verified” rather than filed or pending, with the last attempted check and the exact evidence still needed.

WHAT TO VERIFY
The reviewer should be able to see who requested the check, which period it covers, and why no conclusion is available.

NEXT STEPS
Keep the item in the review queue and prevent automated client communication until evidence is attached.

SOURCE STATUS
Template workflow only. No filing conclusion has been made.`,
      },
    ],
  },
] as const;

export const promptsByMode: Record<AssistantMode, readonly string[]> = {
  ask: [
    "What needs attention for Sharma Pharma?",
    "Which statuses are too stale to rely on?",
    "What should we verify before advising Royal Spice?",
    "Compare confirmed work across all sample clients",
  ],
  act: [
    "Prepare a client update for professional review",
    "Create a checklist without executing anything",
    "Draft calendar changes for approval",
    "Prepare a safe portal handoff",
  ],
};

export function createTemplateAnswer(prompt: string, mode: AssistantMode): string {
  if (mode === "act") {
    return `DRAFT ACTION
Reg Mitra prepared a reviewable action template for: “${prompt}”

REQUIRED EVIDENCE
Add the relevant official source, client facts, responsible owner, due date, and professional reviewer before relying on this draft.

APPROVAL GATE
Review and edit the proposed action. A production workspace would require explicit approval before any external step.

EXECUTION STATUS
Template only. No filing, portal update, email, WhatsApp message, calendar item, or client contact has occurred.`;
  }

  return `CONCLUSION
This template would separate the question into client facts, the responsible authority, and the evidence required. It will not assert a current legal or filing position from the prompt alone.

WHAT TO VERIFY
1. Identify the current official publication or portal record.
2. Match it to the client’s actual facts, period, location, and transaction context.
3. Record any missing or conflicting evidence for professional review.

NEXT STEPS
Attach the authoritative source, confirm the client facts, and switch to Prepare only when you are ready to prepare a reviewable next step.

SOURCE STATUS
Illustrative template response for: “${prompt}” No live source or client system was queried.`;
}
