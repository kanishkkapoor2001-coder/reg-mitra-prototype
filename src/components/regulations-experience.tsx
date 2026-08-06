"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EvidencePanel } from "@/components/evidence-panel";
import { SearchIcon } from "@/components/icons";
import { WorkspaceTrustSummary } from "@/components/workspace-trust-summary";
import type { EvidenceRecord } from "@/lib/types";

export interface RegulationItem {
  id: string;
  title: string;
  authority: string;
  published: string;
  effective: string;
  /** Raw ISO date used for ordering; never displayed. */
  sortKey: string;
  /** Document number where the authority issues one, else the document type. */
  reference: string;
  status: string;
  superseded: boolean;
  topics: readonly string[];
  evidence: EvidenceRecord;
}

export function RegulationsExperience({
  items,
  mode,
  freshness,
}: Readonly<{
  items: readonly RegulationItem[];
  mode: "product" | "sample";
  /** Corpus age, so a reader knows how current this list is. */
  freshness?: { label: string; warning: string | null; level: string };
}>) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [authority, setAuthority] = useState("all");
  const authorities = useMemo(
    () => [...new Set(items.map((item) => item.authority))].sort(),
    [items],
  );

  const visibleRegulations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((regulation) => {
      const matchesAuthority = authority === "all" || regulation.authority === authority;
      const haystack = `${regulation.title} ${regulation.authority} ${regulation.reference} ${regulation.topics.join(" ")}`;
      const matchesQuery = !normalized || haystack.toLowerCase().includes(normalized);
      return matchesAuthority && matchesQuery;
    });
  }, [authority, items, query]);

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">{mode === "product" ? "Indexed official sources" : "Selected regulatory publications"}</p>
          <h1>Official sources and updates</h1>
          <p className="page-subtitle">
            {mode === "product"
              ? "Every document Reg Mitra can cite. The assistant answers only from what is indexed here."
              : "Sample publications shown so the page is legible before you sign in."}
          </p>
        </div>
      </header>
      {freshness ? (
        <p className={`corpus-freshness is-${freshness.level}`}>
          {freshness.label}
          {freshness.warning ? <span className="corpus-freshness-warning">{freshness.warning}</span> : null}
        </p>
      ) : null}
      <WorkspaceTrustSummary />
      <div className="portfolio-controls">
        <label className="search-field">
          <SearchIcon />
          <span className="sr-only">Search regulatory items</span>
          <input
            aria-label="Search regulatory items"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, authority, document number, or topic"
            value={query}
          />
        </label>
        <select
          aria-label="Filter by authority"
          className="filter-select"
          onChange={(event) => setAuthority(event.target.value)}
          value={authority}
        >
          <option value="all">All authorities</option>
          {authorities.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
        <span className="result-count">
          {visibleRegulations.length} of {items.length} sources
        </span>
      </div>

      {visibleRegulations.length ? (
        <section className="regulation-list" aria-label="Regulatory items">
          {visibleRegulations.map((regulation) => (
            <article className="regulation-card" key={regulation.id}>
              <div className="regulation-card-head">
                <div>
                  <p className="eyebrow">{regulation.authority} · {regulation.reference}</p>
                  <h2>{regulation.title}</h2>
                  <span className="regulation-meta">
                    Published: {regulation.published} · Effective: {regulation.effective} · {regulation.status}
                  </span>
                  {regulation.topics.length ? (
                    <div className="identifier-list">
                      {regulation.topics.map((topic) => (
                        <span className="identifier" key={topic}>{topic}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <EvidencePanel evidence={regulation.evidence} />
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state portfolio-empty">
          <SearchIcon />
          <h2>No sources match</h2>
          <p>Try another publication title, document number, topic, or authority.</p>
          <button className="button" onClick={() => { setQuery(""); setAuthority("all"); }} type="button">
            Clear filters
          </button>
        </section>
      )}
    </>
  );
}
