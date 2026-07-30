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

const publicPaths = ["/", "/about", "/pricing", "/faq", "/login", "/start", "/demo", "/founder", "/onboarding"];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  sessionMode,
}: Readonly<{ children: ReactNode; sessionMode: "demo" | "product" | null }>) {
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
                </Link>
              </div>
            );
          })}
        </nav>

        <details className="more-menu">
          <summary aria-label="More workspace options"><MoreIcon /><span>More</span></summary>
          <div className="more-menu-panel">
            <Link href="/briefings"><FileIcon /><span><strong>Briefings</strong><small>Drafts awaiting review</small></span></Link>
            <Link href="/regulations"><RegulationsIcon /><span><strong>Regulations</strong><small>Updates and sources</small></span></Link>
            <Link href="/settings"><SettingsIcon /><span><strong>Settings</strong><small>Sources and policy</small></span></Link>
            <Link href="/billing"><FileIcon /><span><strong>Billing</strong><small>Trial and subscription</small></span></Link>
            <button className="appearance-button" onClick={toggleTheme} type="button">
              <AppearanceIcon /><span><strong>Appearance</strong><small>Use {theme === "light" ? "dark" : "light"} mode</small></span>
            </button>
          </div>
        </details>

        <div className="firm-card">
          <span className="firm-avatar">{sessionMode === "demo" ? "MS" : "RM"}</span>
          <span>
            <strong>{sessionMode === "demo" ? "Mehta Shah & Associates" : "Your firm"}</strong>
            <small>{sessionMode === "demo" ? "Sample workspace" : "Firm workspace"}</small>
          </span>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="sidebar-signout" type="submit">{sessionMode === "demo" ? "Leave demo" : "Sign out"}</button>
        </form>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="global-search" onClick={() => setCommandOpen(true)} type="button">
            <SearchIcon />
            <span>Search pages and clients</span>
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
            <span className="user-avatar" aria-label={sessionMode === "demo" ? "Mehta Shah, Partner" : "Signed-in user"}>
              {sessionMode === "demo" ? "MS" : "You"}
            </span>
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
