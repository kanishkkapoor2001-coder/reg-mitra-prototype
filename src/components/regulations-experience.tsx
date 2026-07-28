"use client";

import { useMemo, useState } from "react";
import { EvidencePanel } from "@/components/evidence-panel";
import { SearchIcon } from "@/components/icons";
import { WorkspaceTrustSummary } from "@/components/workspace-trust-summary";
import { regulations } from "@/lib/demo-data";

export function RegulationsExperience() {
  const [query, setQuery] = useState("");
  const [authority, setAuthority] = useState("all");
  const authorities = [...new Set(regulations.map((item) => item.authority))];

  const visibleRegulations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return regulations.filter((regulation) => {
      const matchesAuthority = authority === "all" || regulation.authority === authority;
      const matchesQuery = !normalized
        || `${regulation.title} ${regulation.authority}`.toLowerCase().includes(normalized);
      return matchesAuthority && matchesQuery;
    });
  }, [authority, query]);

  return (
    <>
      <header className="page-heading">
        <div>
          <p className="eyebrow">Regulatory intelligence</p>
          <h1>What changed?</h1>
          <p className="page-subtitle">Review illustrative changes alongside their evidence and approval state.</p>
        </div>
      </header>
      <WorkspaceTrustSummary />
      <div className="portfolio-controls">
        <label className="search-field">
          <SearchIcon />
          <span className="sr-only">Search regulatory items</span>
          <input
            aria-label="Search regulatory items"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search changes"
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
        <span className="result-count">{visibleRegulations.length} changes</span>
      </div>

      {visibleRegulations.length ? (
        <section className="regulation-list" aria-label="Regulatory items">
          {visibleRegulations.map((regulation) => (
            <article className="regulation-card" key={regulation.id}>
              <div className="regulation-card-head">
                <div>
                  <p className="eyebrow">{regulation.authority}</p>
                  <h2>{regulation.title}</h2>
                  <span className="regulation-meta">
                    Claimed publication: {regulation.published} · Claimed effective date: {regulation.effective} · {regulation.impact}
                  </span>
                </div>
              </div>
              <EvidencePanel evidence={regulation.evidence} />
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state portfolio-empty">
          <SearchIcon />
          <h2>No changes match</h2>
          <p>Try another term or authority.</p>
          <button className="button" onClick={() => { setQuery(""); setAuthority("all"); }} type="button">
            Clear filters
          </button>
        </section>
      )}
    </>
  );
}
