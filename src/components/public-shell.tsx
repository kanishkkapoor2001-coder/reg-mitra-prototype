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
          <Link href="/features">Features</Link>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/demo">Live demo</Link>
        </nav>
        <div className="public-header-actions">
          <Link className="header-demo-link" href="/today">Open product <span>↗</span></Link>
        </div>
      </header>
      {children}
      <footer className="public-footer">
        <Link className="public-brand" href="/"><span>R/M</span><strong>Reg Mitra</strong></Link>
        <p>Source-grounded regulatory research and client-impact review for Indian CA firms.</p>
        <nav>
          <Link href="/features">Features</Link>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/demo">Live demo</Link>
          <Link href="/today">Open product</Link>
        </nav>
        <small className="footer-legal">
          © 2026 Reg Mitra
          <span className="footer-contact">
            <a href="mailto:kanishk@5avenures.in">kanishk@5avenures.in</a>
            <a href="https://wa.me/919711017316" target="_blank" rel="noreferrer">+91 97110 17316</a>
          </span>
        </small>
      </footer>
    </div>
  );
}
