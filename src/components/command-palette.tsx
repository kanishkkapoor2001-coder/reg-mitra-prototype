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
import { clients } from "@/lib/demo-data";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Command {
  label: string;
  detail: string;
  href: string;
  group: "Go to" | "Clients";
  icon: "today" | "clients" | "assistant" | "briefings" | "calendar" | "regulations" | "settings";
}

const baseCommands: readonly Command[] = [
  { label: "Today", detail: "Your ranked work queue", href: "/", group: "Go to", icon: "today" },
  { label: "Clients", detail: "Open the client portfolio", href: "/clients", group: "Go to", icon: "clients" },
  { label: "Assistant", detail: "Research and prepare work", href: "/assistant", group: "Go to", icon: "assistant" },
  { label: "Briefings", detail: "Client-ready drafts and reviews", href: "/briefings", group: "Go to", icon: "briefings" },
  { label: "Calendar", detail: "Deadlines and obligations", href: "/calendar", group: "Go to", icon: "calendar" },
  { label: "Regulations", detail: "Source-aware regulatory updates", href: "/regulations", group: "Go to", icon: "regulations" },
  { label: "Settings", detail: "Sources and review policy", href: "/settings", group: "Go to", icon: "settings" },
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

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const commands = useMemo<Command[]>(() => [
    ...baseCommands,
    ...clients.map((client) => ({
      label: client.shortName,
      detail: `${client.sector} · ${client.location}`,
      href: `/clients/${client.id}`,
      group: "Clients" as const,
      icon: "clients" as const,
    })),
  ], []);

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
            aria-label="Search pages and clients"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) navigate(results[0].href);
            }}
            placeholder="Where do you want to go?"
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
              <button className="command-result" key={command.href} onClick={() => navigate(command.href)} type="button">
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
              <small>Try a client name or workspace area.</small>
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
