import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Weekly "here is what needs you" email.
//
// Only sent when there is something to decide. A digest that arrives every week
// saying nothing happened trains people to ignore it, which is exactly the
// wrong habit for the one email that tells a firm a filing may be at risk.

const FROM = process.env.DIGEST_EMAIL_FROM?.trim()
  || process.env.SIGNUP_NOTIFY_FROM?.trim()
  || "Reg Mitra <signups@updates.sigil91.com>";

const APP_URL = (process.env.APP_URL?.trim() || "https://regmitra.in").replace(/\/+$/, "");

export type DigestOutcome = {
  workspaces: number;
  sent: number;
  skipped: number;
  errors: string[];
};

type PendingRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  clients: { display_name: string } | { display_name: string }[] | null;
  regulatory_sources:
    | { authority: string; title: string; canonical_url: string }
    | { authority: string; title: string; canonical_url: string }[]
    | null;
};

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildEmail(
  grouped: Map<string, { authority: string; title: string; url: string; clients: string[] }>,
  needFacts: number,
): { subject: string; text: string; html: string } {
  const changes = [...grouped.values()];
  const clientCount = new Set(changes.flatMap((c) => c.clients)).size;

  const subject = changes.length === 1
    ? `1 regulatory change affects ${clientCount} of your clients`
    : `${changes.length} regulatory changes affect ${clientCount} of your clients`;

  const textLines = [
    subject,
    "",
    "Each of these matched a client because of facts you confirmed. Nothing is",
    "recorded as applying until you approve it.",
    "",
  ];
  for (const change of changes) {
    textLines.push(`${change.authority} — ${change.title}`);
    textLines.push(`  Clients: ${change.clients.join(", ")}`);
    textLines.push(`  Source: ${change.url}`);
    textLines.push("");
  }
  if (needFacts > 0) {
    textLines.push(`${needFacts} further checks are undecided because a client profile is incomplete.`);
    textLines.push("");
  }
  textLines.push(`Review them: ${APP_URL}/today`);

  const rows = changes.map((change) => `
    <tr><td style="padding:14px 0;border-bottom:1px solid #e3e5e2">
      <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1d8d56">${escapeHtml(change.authority)}</div>
      <div style="margin:5px 0 6px;font-size:15px;font-weight:600;color:#1a201d">${escapeHtml(change.title)}</div>
      <div style="font-size:13px;color:#4a544e">Clients: ${escapeHtml(change.clients.join(", "))}</div>
      <a href="${escapeHtml(change.url)}" style="font-size:12.5px;color:#1d8d56">Official source</a>
    </td></tr>`).join("");

  const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f5f5f3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a201d">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e3e5e2;border-radius:14px">
<tr><td style="padding:30px">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#1d8d56">Reg Mitra</p>
<h1 style="margin:0 0 12px;font-size:20px;font-weight:600;line-height:1.35">${escapeHtml(subject)}</h1>
<p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4a544e">Each matched a client because of facts you confirmed. Nothing is recorded as applying until you approve it.</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
${needFacts > 0 ? `<p style="margin:18px 0 0;font-size:13px;color:#6b756f">${needFacts} further checks are undecided because a client profile is incomplete.</p>` : ""}
<a href="${APP_URL}/today" style="display:inline-block;margin-top:22px;padding:12px 20px;border-radius:9px;background:#12261c;color:#fff;font-size:14px;font-weight:600;text-decoration:none">Review these</a>
</td></tr></table></body></html>`;

  return { subject, text: textLines.join("\n"), html };
}

/** Emails every workspace that has decisions waiting. */
export async function sendPendingDigests(): Promise<DigestOutcome> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const outcome: DigestOutcome = { workspaces: 0, sent: 0, skipped: 0, errors: [] };
  if (!apiKey) {
    outcome.errors.push("RESEND_API_KEY is not configured");
    return outcome;
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("client_regulatory_impacts")
    .select("id, workspace_id, client_id, clients!client_regulatory_impacts_client_id_fkey(display_name), regulatory_sources(authority, title, canonical_url)")
    .eq("decision", "direct_relevance")
    .eq("review_state", "not_reviewed");

  if (error) {
    outcome.errors.push(error.message);
    return outcome;
  }

  const byWorkspace = new Map<string, PendingRow[]>();
  for (const row of (data ?? []) as PendingRow[]) {
    const list = byWorkspace.get(row.workspace_id) ?? [];
    list.push(row);
    byWorkspace.set(row.workspace_id, list);
  }
  outcome.workspaces = byWorkspace.size;

  const { data: undecided } = await admin
    .from("client_regulatory_impacts")
    .select("workspace_id")
    .eq("decision", "more_information_needed");
  const needFactsBy = new Map<string, number>();
  for (const row of (undecided ?? []) as Array<{ workspace_id: string }>) {
    needFactsBy.set(row.workspace_id, (needFactsBy.get(row.workspace_id) ?? 0) + 1);
  }

  for (const [workspaceId, rows] of byWorkspace) {
    // Recipients are the workspace's own members, resolved through auth rather
    // than any address stored alongside client data.
    const { data: members } = await admin
      .from("workspace_memberships")
      .select("user_id")
      .eq("workspace_id", workspaceId);

    const recipients: string[] = [];
    for (const member of (members ?? []) as Array<{ user_id: string }>) {
      const { data: user } = await admin.auth.admin.getUserById(member.user_id);
      if (user?.user?.email) recipients.push(user.user.email);
    }

    if (!recipients.length) {
      outcome.skipped += 1;
      continue;
    }

    const grouped = new Map<string, { authority: string; title: string; url: string; clients: string[] }>();
    for (const row of rows) {
      const source = one(row.regulatory_sources);
      const client = one(row.clients);
      if (!source) continue;
      const existing = grouped.get(source.canonical_url);
      if (existing) existing.clients.push(client?.display_name ?? "A client");
      else {
        grouped.set(source.canonical_url, {
          authority: source.authority,
          title: source.title,
          url: source.canonical_url,
          clients: [client?.display_name ?? "A client"],
        });
      }
    }

    if (!grouped.size) {
      outcome.skipped += 1;
      continue;
    }

    const email = buildEmail(grouped, needFactsBy.get(workspaceId) ?? 0);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: recipients, ...email }),
      });
      if (response.ok) outcome.sent += 1;
      else outcome.errors.push(`${workspaceId}: ${response.status} ${await response.text()}`);
    } catch (sendError) {
      outcome.errors.push(`${workspaceId}: ${(sendError as Error).message}`);
    }
  }

  return outcome;
}
