"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import {
  AppearanceIcon,
  CalendarIcon,
  CheckCircleIcon,
  CalculatorIcon,
  ClientsIcon,
  FileIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  MoreIcon,
  RegulationsIcon,
  SearchIcon,
  SettingsIcon,
  SyncIcon,
  SparklesIcon,
  TodayIcon,
} from "@/components/icons";
import { navigation } from "@/lib/navigation";

const publicPaths = ["/", "/about", "/pricing", "/faq", "/features", "/login", "/founder", "/start", "/onboarding"];

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
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [fullscreen, setFullscreen] = useState(false);
  // Fullscreen is a browser capability, not app state: render the control only
  // where the API exists (it does not on iPhone Safari), and track the actual
  // fullscreen element so Esc and the button stay in sync.
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability probe; document does not exist during SSR
    setFullscreenAvailable(Boolean(document.fullscreenEnabled));
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  }

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
                {/* Fetched on hover rather than on click. These pages are
                    server-rendered against the database, so the work starts
                    while the cursor is still travelling and the click renders
                    from memory. Hover, not viewport: prefetching all of them on
                    every page load would run their queries whether or not
                    anyone goes there. */}
                <Link
                  className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  onMouseEnter={() => router.prefetch(item.href)}
                  onFocus={() => router.prefetch(item.href)}
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
            <Link href="/calculators"><CalculatorIcon /><span><strong>Calculators</strong><small>Interest, late fee and due dates</small></span></Link>
            <Link href="/reconcile"><SyncIcon /><span><strong>Reconcile 2B</strong><small>Match supplier filings to the books</small></span></Link>
            <Link href="/practice"><ClientsIcon /><span><strong>Your practice</strong><small>Tune answers to your clients</small></span></Link>
            {/* Briefings is sample-only and duplicates Assistant · Prepare, so it
                stays out of a firm's navigation until it runs on real drafts. */}
            {sessionMode === "product" ? null : (
              <Link href="/briefings"><FileIcon /><span><strong>Briefings</strong><small>Internal drafts and review</small></span></Link>
            )}
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
            {fullscreenAvailable ? (
              <button
                aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
                aria-pressed={fullscreen}
                className="topbar-fullscreen"
                onClick={toggleFullscreen}
                title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
                type="button"
              >
                {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </button>
            ) : null}
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
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} sessionMode={sessionMode} />
    </div>
  );
}
