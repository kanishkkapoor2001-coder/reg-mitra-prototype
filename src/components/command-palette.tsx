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

  // What a result is worth, before the query is considered.
  //
  // The corpus contributes forty static circulars and a firm contributes a
  // handful of clients, so an unweighted list is reference material with the
  // firm's own work buried underneath it. Rank by what someone opening ⌘K is
  // plausibly reaching for: their clients, then the things they can do, then
  // where they can go, and only then the library.
  const GROUP_WEIGHT: Record<Command["group"], number> = {
    Clients: 40,
    Actions: 30,
    Pages: 20,
    Sample: 15,
    Sources: 0,
  };
  const GROUP_ORDER: Command["group"][] = ["Actions", "Clients", "Sample", "Pages", "Sources"];

  /** 0 means no match. Prefix and word-start beat a substring buried mid-title. */
  function score(command: Command, needle: string): number {
    const label = command.label.toLowerCase();
    const detail = command.detail.toLowerCase();
    let hit = 0;
    if (label === needle) hit = 100;
    else if (label.startsWith(needle)) hit = 80;
    else if (label.split(/[\s·,()/-]+/).some((word) => word.startsWith(needle))) hit = 60;
    else if (label.includes(needle)) hit = 40;
    else if (detail.includes(needle)) hit = 15;
    if (!hit) return 0;
    return hit + GROUP_WEIGHT[command.group];
  }

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    // An empty palette suggests rather than enumerates. Forty circulars in
    // publication order answer no question anyone has on opening it; a few of
    // your own clients and the things you can do from here answer most of them.
    // The library is one keystroke away — it just is not the opening screen.
    if (!normalized) {
      const suggested = commands.filter((command) => command.group !== "Sources");
      const clients = suggested.filter((command) => command.group === "Clients").slice(0, 5);
      const rest = suggested.filter((command) => command.group !== "Clients");
      return [...clients, ...rest];
    }

    return commands
      .map((command) => ({ command, rank: score(command, normalized) }))
      .filter((entry) => entry.rank > 0)
      .sort((a, b) => {
        if (b.rank !== a.rank) return b.rank - a.rank;
        const groupGap = GROUP_ORDER.indexOf(a.command.group) - GROUP_ORDER.indexOf(b.command.group);
        return groupGap !== 0 ? groupGap : a.command.label.localeCompare(b.command.label);
      })
      .slice(0, 40)
      .map((entry) => entry.command);
    // GROUP_WEIGHT and GROUP_ORDER are module-stable literals; commands and
    // query are the only inputs that change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
