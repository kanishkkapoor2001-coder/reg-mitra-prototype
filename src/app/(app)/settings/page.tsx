import { cookies } from "next/headers";
import { ConnectorControlCenter } from "@/components/connector-control-center";
import { PageHeading } from "@/components/page-heading";
import { TrustBadge } from "@/components/trust-badge";
import { getCorpusHealth } from "@/lib/rag/corpus";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export default async function SettingsPage() {
  const corpus = getCorpusHealth();
  const isDemo = (await cookies()).get("reg_mitra_session")?.value === "demo";
  const productMode = !isDemo && Boolean(getSupabasePublicConfig());

  return (
    <>
      <PageHeading eyebrow="Workspace policy" title="Settings" description="Manage your firm, selected sources, reviewer roles, and workspace policy." />
      <ConnectorControlCenter productMode={productMode} />
      <section style={{ marginTop: 26 }}>
        <div className="page-heading" style={{ marginBottom: 14 }}>
          <div>
            <p className="eyebrow">Source register</p>
            <h2>Official sources and review policy</h2>
            <p className="page-subtitle">Source links, indexed text, and reviewer approval remain separate states.</p>
          </div>
        </div>
        <div className="source-register">
          <div className="corpus-health">
            <div>
              <p className="eyebrow">Source library</p>
              <h3>Indexed regulatory sources</h3>
              <p>
                Reg Mitra searches indexed official documents and source summaries using both
                exact terms and related meaning.
              </p>
            </div>
            <dl>
              <div><dt>Official sources</dt><dd>{corpus.sourceCount}</dd></div>
              <div><dt>Searchable sections</dt><dd>{corpus.chunkCount}</dd></div>
              <div><dt>Meaning-indexed sections</dt><dd>{corpus.embeddedChunkCount}</dd></div>
              <div><dt>Full text</dt><dd>{corpus.fullTextSourceCount}</dd></div>
            </dl>
            <div className="corpus-authorities" aria-label="Authorities in corpus">
              {corpus.authorities.map((authority) => <span key={authority}>{authority}</span>)}
            </div>
          </div>
          <article className="source-row">
            <div><strong>Government portals</strong><small>GSTN, MCA, Income Tax, FSSAI, RBI</small></div>
            <p className="source-policy">No portal credentials or data connections have been configured.</p>
            <TrustBadge kind="evidence" state="not-connected" />
          </article>
          <article className="source-row">
            <div><strong>Regulatory documents</strong><small>Circulars, guidance, manuals, announcements, and official indexes</small></div>
            <p className="source-policy">
              {corpus.fullTextSourceCount} full-text official publications and {corpus.summaryOnlySourceCount} source summaries
              are indexed. Every generated answer still requires applicability review.
            </p>
            <TrustBadge kind="evidence" state="connected" />
          </article>
          <article className="source-row">
            <div><strong>Professional review</strong><small>Named reviewer and version-level approval</small></div>
            <p className="source-policy">Approval is required before sending advice, communicating a position, or taking a filing action.</p>
            <TrustBadge kind="review" state="not-reviewed" />
          </article>
        </div>
      </section>
    </>
  );
}
