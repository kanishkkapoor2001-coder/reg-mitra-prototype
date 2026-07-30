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

const publicPaths = ["/", "/about", "/pricing", "/faq", "/demo", "/login", "/founder", "/start", "/onboarding"];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase() || "RM";
}

export function AppShell({
  children,
  sessionMode,
  workspaceName = null,
}: Readonly<{ children: ReactNode; sessionMode: "demo" | "product" | null; workspaceName?: string | null }>) {
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

  const firmName = sessionMode === "demo"
    ? "Mehta Shah & Associates"
    : sessionMode === "product"
      ? workspaceName ?? "Your firm"
      : "Reg Mitra";
  const firmSubtitle = sessionMode === "demo"
    ? "Sample workspace"
    : sessionMode === "product"
      ? "Firm workspace"
      : "Open workspace";
  const firmAvatar = sessionMode === "demo"
    ? "MS"
    : sessionMode === "product" && workspaceName
      ? initialsFor(workspaceName)
      : "RM";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/today" aria-label="Reg Mitra workspace home">
          <span className="brand-mark"><CheckCircleIcon /></span>
          <span>
            <strong>Reg Mitra</strong>
            <small>Regulatory research</small>
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
                </Link>
              </div>
            );
          })}
        </nav>

        <details className="more-menu">
          <summary aria-label="More workspace options"><MoreIcon /><span>More</span></summary>
          <div className="more-menu-panel">
            <Link href="/briefings"><FileIcon /><span><strong>Briefings</strong><small>Internal drafts and review</small></span></Link>
            <Link href="/regulations"><RegulationsIcon /><span><strong>Regulations</strong><small>Official sources and updates</small></span></Link>
            <Link href="/settings"><SettingsIcon /><span><strong>Settings</strong><small>Sources, team, and review policy</small></span></Link>
            <button className="appearance-button" onClick={toggleTheme} type="button">
              <AppearanceIcon /><span><strong>Appearance</strong><small>Use {theme === "light" ? "dark" : "light"} mode</small></span>
            </button>
          </div>
        </details>

        <div className="firm-card">
          <span className="firm-avatar">{firmAvatar}</span>
          <span>
            <strong>{firmName}</strong>
            <small>{firmSubtitle}</small>
          </span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="global-search" onClick={() => setCommandOpen(true)} type="button">
            <SearchIcon />
            <span>Search clients, sources, and drafts</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-actions">
            <Link
              className={`topbar-calendar-link ${isActive(pathname, "/calendar") ? "active" : ""}`}
              href="/calendar"
              aria-current={isActive(pathname, "/calendar") ? "page" : undefined}
              aria-label="Open compliance calendar"
            >
              <CalendarIcon />
              <span>Calendar</span>
            </Link>
            <span className="user-avatar" aria-label={sessionMode === "demo" ? "Mehta Shah, Partner" : firmName}>
              {firmAvatar}
            </span>
            {sessionMode ? (
              <form action="/api/auth/logout" method="post">
                <button className="button topbar-auth" type="submit">
                  {sessionMode === "demo" ? "Leave demo" : "Sign out"}
                </button>
              </form>
            ) : (
              <Link className="button topbar-auth" href="/login">Sign in</Link>
            )}
          </div>
        </header>
        {sessionMode === "demo" ? (
          <div className="template-demo-banner" role="note">
            <strong>Sample workspace</strong>
            <span>Sample clients and regulatory data · no live connections or external actions</span>
          </div>
        ) : null}
        <main className="main-content">{children}</main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
