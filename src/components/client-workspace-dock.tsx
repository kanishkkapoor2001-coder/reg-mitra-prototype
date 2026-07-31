"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { closeClientTab, useClientTabs } from "@/lib/client-tabs-store";

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ClientWorkspaceDock() {
  const pathname = usePathname();
  const tabs = useClientTabs();
  if (!tabs.length) return null;

  return (
    <aside className="client-workspace-dock" aria-label="Open client tabs">
      <div className="client-dock-label">
        <span>Clients</span>
        <strong>{tabs.length}</strong>
      </div>
      <div className="client-dock-tabs">
        {tabs.map((tab) => {
          const href = `/clients/${encodeURIComponent(tab.id)}`;
          const active = pathname === href;
          return (
            <div className={`client-dock-tab ${active ? "active" : ""}`} key={tab.id}>
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={`Open ${tab.name} client workspace`}
                href={href}
              >
                <span>{initials(tab.name) || "CL"}</span>
                <span className="client-dock-copy">
                  <strong>{tab.name}</strong>
                  <small>{active ? "Open now" : tab.subtitle || "Client workspace"}</small>
                </span>
              </Link>
              <button
                aria-label={`Close ${tab.name} client tab`}
                onClick={() => closeClientTab(tab.id)}
                title="Close client tab"
                type="button"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
