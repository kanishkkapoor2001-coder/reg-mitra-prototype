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
          <Link href="/#product">Product</Link>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/demo">Live demo</Link>
        </nav>
        <div className="public-header-actions">
          <Link className="header-signin-link" href="/login">Sign in</Link>
          <Link className="header-demo-link" href="/start">Start today <span>↗</span></Link>
        </div>
      </header>
      {children}
      <footer className="public-footer">
        <Link className="public-brand" href="/"><span>R/M</span><strong>Reg Mitra</strong></Link>
        <p>Source-grounded regulatory research and client-impact review for Indian CA firms.</p>
        <nav>
          <Link href="/#product">Product</Link>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/demo">Live demo</Link>
          <Link href="/login">Sign in</Link>
        </nav>
        <small>© 2026 Reg Mitra · Private pilot</small>
      </footer>
    </div>
  );
}
