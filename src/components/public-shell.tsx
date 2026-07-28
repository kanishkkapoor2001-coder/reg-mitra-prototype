import Link from "next/link";
import type { ReactNode } from "react";

export function PublicShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link className="public-brand" href="/" aria-label="Reg Mitra home">
          <span>R/M</span>
          <strong>Reg Mitra</strong>
        </Link>
        <nav aria-label="Public navigation">
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        <Link className="header-demo-link" href="/login">Open demo <span>↗</span></Link>
      </header>
      {children}
      <footer className="public-footer">
        <Link className="public-brand" href="/"><span>R/M</span><strong>Reg Mitra</strong></Link>
        <p>Calm regulatory intelligence for Indian compliance teams.</p>
        <nav>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        <small>© 2026 Reg Mitra · Demo product</small>
      </footer>
    </div>
  );
}
