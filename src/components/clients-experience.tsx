"use client";

import { useMemo, useState } from "react";
import { ClientCard } from "@/components/client-card";
import { SearchIcon } from "@/components/icons";
import { clients } from "@/lib/demo-data";
import type { RiskLevel } from "@/lib/types";

type RiskFilter = "all" | RiskLevel;

export function ClientsExperience() {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");

  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...clients]
      .filter((client) => risk === "all" || client.risk === risk)
      .filter((client) =>
        !normalized
        || `${client.name} ${client.shortName} ${client.sector} ${client.location}`
          .toLowerCase()
          .includes(normalized),
      )
      .sort((left, right) => right.riskScore - left.riskScore);
  }, [query, risk]);

  function clearFilters() {
    setQuery("");
    setRisk("all");
  }

  return (
    <>
      <header className="portfolio-hero">
        <div>
          <p className="eyebrow">Client portfolio</p>
          <h1>Who needs attention?</h1>
          <p>Clients are ranked by demo risk so the most important review is always visible first.</p>
        </div>
        <div className="portfolio-stat">
          <strong>{clients.filter((client) => client.risk === "high").length}</strong>
          <span>high-risk clients</span>
        </div>
      </header>

      <div className="portfolio-controls">
        <label className="search-field">
          <SearchIcon />
          <span className="sr-only">Search clients</span>
          <input
            aria-label="Search clients"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a client"
            value={query}
          />
        </label>
        <div className="segmented-control" aria-label="Filter clients by risk">
          {(["all", "high", "medium", "low"] as const).map((value) => (
            <button
              aria-pressed={risk === value}
              className={risk === value ? "active" : ""}
              key={value}
              onClick={() => setRisk(value)}
              type="button"
            >
              {value === "all" ? "All" : `${value.charAt(0).toUpperCase()}${value.slice(1)}`}
            </button>
          ))}
        </div>
        <span className="result-count">{visibleClients.length} {visibleClients.length === 1 ? "client" : "clients"}</span>
      </div>

      {visibleClients.length ? (
        <section className="client-grid" aria-label="Client portfolio">
          {visibleClients.map((client) => <ClientCard client={client} key={client.id} />)}
        </section>
      ) : (
        <section className="empty-state portfolio-empty">
          <SearchIcon />
          <h2>No clients match</h2>
          <p>Try a different name or remove the risk filter.</p>
          <button className="button" onClick={clearFilters} type="button">Clear filters</button>
        </section>
      )}

      <p className="demo-footnote">Demo profiles only · Connect a secure client store before adding or editing records.</p>
    </>
  );
}
