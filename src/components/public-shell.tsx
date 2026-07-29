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
          <Link href="/demo">Demo</Link>
        </nav>
        <Link className="header-demo-link" href="/start">Start 7-day trial <span>↗</span></Link>
      </header>
      {children}
      <footer className="public-footer">
        <Link className="public-brand" href="/"><span>R/M</span><strong>Reg Mitra</strong></Link>
        <p>Regulatory changes mapped to client impact and next actions—for Indian CA firms.</p>
        <nav>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/demo">Demo</Link>
        </nav>
        <small>© 2026 Reg Mitra · Regulatory intelligence workspace</small>
      </footer>
    </div>
  );
}
