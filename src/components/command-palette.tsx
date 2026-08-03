"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarIcon,
  ChevronRightIcon,
  ClientsIcon,
  CloseIcon,
  FileIcon,
  RegulationsIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  TodayIcon,
} from "@/components/icons";
import { clients as sampleClients, regulations as sampleRegulations } from "@/lib/demo-data";
import type { SearchIndexPayload } from "@/app/api/search-index/route";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  sessionMode: "demo" | "product" | null;
}

interface Command {
  label: string;
  detail: string;
  href: string;
  group: "Clients" | "Sources" | "Actions" | "Pages" | "Sample";
  icon: "today" | "clients" | "assistant" | "briefings" | "calendar" | "regulations" | "settings";
}

const baseCommands: readonly Command[] = [
  { label: "Today", detail: "Prioritised review queue", href: "/today", group: "Pages", icon: "today" },
  { label: "Clients", detail: "Recorded facts, possible impact, and open work", href: "/clients", group: "Pages", icon: "clients" },
  { label: "Assistant", detail: "Source-grounded answers and internal drafts", href: "/assistant", group: "Pages", icon: "assistant" },
  { label: "Source-linked calendar", detail: "Recurring obligations and effective dates", href: "/calendar", group: "Pages", icon: "calendar" },
  { label: "Official sources and updates", detail: "Selected indexed regulatory publications", href: "/regulations", group: "Pages", icon: "regulations" },
  { label: "Settings", detail: "Sources, team, and review policy", href: "/settings", group: "Pages", icon: "settings" },
] as const;

const productActions: readonly Command[] = [
  { label: "Add client", detail: "Record a new client and its applicability facts", href: "/clients/new", group: "Actions", icon: "clients" },
  { label: "Add work item", detail: "Create a task in the review queue", href: "/tasks/new", group: "Actions", icon: "today" },
] as const;

const iconMap = {
  today: TodayIcon,
  clients: ClientsIcon,
  assistant: SparklesIcon,
  briefings: FileIcon,
  calendar: CalendarIcon,
  regulations: RegulationsIcon,
  settings: SettingsIcon,
} as const;

export function CommandPalette({ open, onClose, sessionMode }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndexPayload | null>(null);

  const isProduct = sessionMode === "product";

  // A real firm must never see fictional clients or sources here. The index is
  // workspace-scoped and fetched once, the first time the palette is opened.
  useEffect(() => {
    if (!open || !isProduct || index) return;
    let cancelled = false;
    void fetch("/api/search-index")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: SearchIndexPayload | null) => {
        if (!cancelled && payload) setIndex(payload);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [index, isProduct, open]);

  const commands = useMemo<Command[]>(() => {
    if (isProduct) {
      return [
        ...(index?.clients ?? []).map((client) => ({
          label: client.name,
          detail: client.detail,
          href: `/clients/${client.id}`,
          group: "Clients" as const,
          icon: "clients" as const,
        })),
        ...(index?.sources ?? []).map((source) => ({
          label: source.title,
          detail: source.detail,
          href: `/regulations?q=${encodeURIComponent(source.title)}`,
          group: "Sources" as const,
          icon: "regulations" as const,
        })),
        ...productActions,
        ...baseCommands,
      ];
    }

    // Signed-out and sample workspaces: the demo records stay, but they are
    // grouped as "Sample" so they can never be mistaken for firm data.
    return [
      ...sampleClients.map((client) => ({
        label: client.shortName,
        detail: `${client.sector} · ${client.location}`,
        href: `/clients/${client.id}`,
        group: "Sample" as const,
        icon: "clients" as const,
      })),
      ...sampleRegulations.map((regulation) => ({
        label: regulation.title,
        detail: `${regulation.authority} · ${regulation.published}`,
        href: `/regulations?q=${encodeURIComponent(regulation.title)}`,
        group: "Sample" as const,
        icon: "regulations" as const,
      })),
      ...baseCommands,
    ];
  }, [index, isProduct]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter((command) =>
      `${command.label} ${command.detail}`.toLowerCase().includes(normalized),
    );
  }, [commands, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) return null;

  function navigate(href: string) {
    router.push(href);
    setQuery("");
    onClose();
  }

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label="Search and navigate"
        aria-modal="true"
        className="command-palette"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-search">
          <SearchIcon />
          <input
            aria-label="Search clients, official sources, actions, and pages"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) navigate(results[0].href);
            }}
            placeholder="Search clients, official sources, and actions"
            ref={inputRef}
            value={query}
          />
          <button aria-label="Close search" className="command-close" onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </div>
        <div className="command-results">
          {results.length ? results.map((command) => {
            const Icon = iconMap[command.icon];
            return (
              <button className="command-result" key={`${command.group}:${command.label}:${command.href}`} onClick={() => navigate(command.href)} type="button">
                <span className="command-result-icon"><Icon /></span>
                <span>
                  <strong>{command.label}</strong>
                  <small>{command.detail}</small>
                </span>
                <span className="command-group">{command.group}</span>
                <ChevronRightIcon />
              </button>
            );
          }) : (
            <div className="command-empty">
              <SearchIcon />
              <strong>No match for “{query}”</strong>
              <small>Try a client, authority, source title, or page.</small>
            </div>
          )}
        </div>
        <footer className="command-footer">
          <span><kbd>↵</kbd> Open first result</span>
          <span><kbd>esc</kbd> Close</span>
        </footer>
      </section>
    </div>
  );
}
