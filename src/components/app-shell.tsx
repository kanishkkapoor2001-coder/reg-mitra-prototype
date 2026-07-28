"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import {
  AppearanceIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClientsIcon,
  FileIcon,
  MoreIcon,
  RegulationsIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  TodayIcon,
} from "@/components/icons";
import { navigation } from "@/lib/navigation";

const publicPaths = ["/", "/about", "/pricing", "/faq", "/login"];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  const primaryIcons = {
    today: TodayIcon,
    clients: ClientsIcon,
    assistant: SparklesIcon,
  } as const;

  if (publicPaths.includes(pathname)) {
    return children;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/today" aria-label="Reg Mitra workspace home">
          <span className="brand-mark"><CheckCircleIcon /></span>
          <span>
            <strong>Reg Mitra</strong>
            <small>Regulatory intelligence</small>
          </span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = primaryIcons[item.icon];
            return (
              <div className="nav-group" key={item.href}>
                <Link
                  className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                >
                  <span className="nav-icon"><Icon /></span>
                  <span>{item.label}</span>
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                </Link>
              </div>
            );
          })}
        </nav>

        <details className="more-menu">
          <summary><MoreIcon /><span>More</span></summary>
          <div className="more-menu-panel">
            <Link href="/briefings"><FileIcon /><span><strong>Briefings</strong><small>Drafts and reviews</small></span></Link>
            <Link href="/calendar"><CalendarIcon /><span><strong>Calendar</strong><small>Deadlines and obligations</small></span></Link>
            <Link href="/regulations"><RegulationsIcon /><span><strong>Regulations</strong><small>Updates and sources</small></span></Link>
            <Link href="/settings"><SettingsIcon /><span><strong>Settings</strong><small>Sources and policy</small></span></Link>
            <button className="appearance-button" onClick={toggleTheme} type="button">
              <AppearanceIcon /><span><strong>Appearance</strong><small>Use {theme === "light" ? "dark" : "light"} mode</small></span>
            </button>
          </div>
        </details>

        <div className="firm-card">
          <span className="firm-avatar">MS</span>
          <span>
            <strong>Mehta Shah & Associates</strong>
            <small>Demo workspace · 6 clients</small>
          </span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="sidebar-signout" type="submit">Leave demo</button>
        </form>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="global-search" onClick={() => setCommandOpen(true)} type="button">
            <SearchIcon />
            <span>Search or jump anywhere</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-actions">
            <span className="demo-pill"><i /> Demo data</span>
            <span className="user-avatar" aria-label="Mehta Shah, Partner">MS</span>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
