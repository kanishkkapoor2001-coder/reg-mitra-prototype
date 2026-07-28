"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { navigation } from "@/lib/navigation";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Reg Mitra home">
          <span className="brand-mark" aria-hidden="true">✓</span>
          <span>
            <strong>Reg Mitra</strong>
            <small>Regulatory intelligence</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item, index) => (
            <div className="nav-group" key={item.href}>
              {item.section ? <p className="nav-section">{item.section}</p> : null}
              <Link
                className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </Link>
              {index === 4 ? <span className="nav-spacer" /> : null}
            </div>
          ))}
        </nav>

        <div className="firm-card">
          <span className="firm-avatar">MS</span>
          <span>
            <strong>Mehta Shah & Associates</strong>
            <small>Demo workspace · 6 clients</small>
          </span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <label className="global-search">
            <span aria-hidden="true">⌕</span>
            <input aria-label="Search workspace" placeholder="Search clients, regulations, filings…" />
            <kbd>⌘ K</kbd>
          </label>
          <div className="topbar-actions">
            <span className="demo-pill"><i /> Demo data</span>
            <button className="icon-button" type="button" aria-label="Notifications">○</button>
            <span className="user-avatar" aria-label="Mehta Shah, Partner">MS</span>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
