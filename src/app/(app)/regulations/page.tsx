import { cookies } from "next/headers";
import { RegulationsExperience, type RegulationItem } from "@/components/regulations-experience";
import { regulations as sampleRegulations } from "@/lib/demo-data";
import { regulatoryCorpus } from "@/lib/rag/corpus";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getCurrentWorkspace } from "@/lib/workspace";

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

const statusLabels: Record<string, string> = {
  active: "In force",
  historical: "Historical",
  superseded: "Superseded",
  index: "Index page",
};

// The corpus is the same official text the assistant cites. Mapping happens on
// the server so the 5 MB module never reaches the client bundle.
function corpusItems(): RegulationItem[] {
  return regulatoryCorpus.sources
    .filter((source) => source.status !== "index")
    .map((source) => {
      const fullText = source.ingestionState === "full-text";
      return {
        id: source.id,
        title: source.title,
        authority: source.authority,
        published: formatDate(source.publishedAt),
        effective: formatDate(source.effectiveFrom),
        sortKey: source.publishedAt ?? source.checkedAt ?? "",
        reference: source.documentNumber ?? source.documentType,
        status: statusLabels[source.status] ?? source.status,
        superseded: Boolean(source.supersededBy),
        topics: source.topics.slice(0, 6),
        evidence: {
          state: fullText ? ("verified" as const) : ("unverified" as const),
          source: {
            publisher: source.publisher,
            title: source.title,
            url: source.canonicalUrl,
            publishedAt: formatDate(source.publishedAt),
            checkedAt: formatDate(source.checkedAt),
          },
          applicability: source.applicability,
          reviewState: "not-reviewed" as const,
          reviewedBy: null,
          caveat: source.supersededBy
            ? `Superseded by ${source.supersededBy.title}. Do not rely on this version without checking the superseding document.`
            : fullText
              ? "Official text indexed from the canonical URL. Confirm the version in force and any later amendment before advising."
              : "Curated summary only — the full official text is not indexed. Open the official source before relying on it.",
        },
      };
    })
    .sort((left, right) => right.sortKey.localeCompare(left.sortKey));
}

export default async function RegulationsPage() {
  const isDemo = (await cookies()).get("reg_mitra_session")?.value === "demo";
  const workspace = isDemo || !getSupabasePublicConfig() ? null : await getCurrentWorkspace();

  if (!workspace) {
    return (
      <RegulationsExperience
        mode="sample"
        items={sampleRegulations.map((regulation) => ({
          id: regulation.id,
          title: regulation.title,
          authority: regulation.authority,
          published: regulation.published,
          effective: regulation.effective,
          sortKey: regulation.published,
          reference: regulation.impact,
          status: "Sample",
          superseded: false,
          topics: [],
          evidence: regulation.evidence,
        }))}
      />
    );
  }

  return <RegulationsExperience mode="product" items={corpusItems()} />;
}
