import Link from "next/link";
import type { ReactNode } from "react";

/**
 * @param authPage Drops the "Open product" call to action.
 *
 * That link points at /login, so on the sign-in, sign-up, founder and pending
 * pages it sends you to the page you are already on — and it competes with the
 * one thing those pages exist to do. Marketing pages keep it.
 */
export function PublicShell({
  authPage = false,
  children,
}: Readonly<{ authPage?: boolean; children: ReactNode }>) {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link className="public-brand" href="/" aria-label="Reg Mitra home">
          <span>R/M</span>
          <strong>Reg Mitra</strong>
        </Link>
        <nav aria-label="Public navigation">
          <Link href="/features">Features</Link>
          <Link href="/newsletter">Newsletter</Link>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
        {authPage ? null : (
          <div className="public-header-actions">
            <Link className="header-demo-link" href="/login">
              Open product
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M3.75 8.25 8.25 3.75M4.9 3.75h3.35V7.1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        )}
      </header>
      {children}
      <footer className="public-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <Link className="public-brand" href="/"><span>R/M</span><strong>Reg Mitra</strong></Link>
            <p>Source-grounded regulatory research and client-impact review for Indian CA firms.</p>
            <div className="footer-contact">
              <a href="mailto:kanishk@5avenures.in">kanishk@5avenures.in</a>
              <a href="https://wa.me/919711017316" target="_blank" rel="noreferrer">+91 97110 17316</a>
            </div>
          </div>
          <nav className="footer-nav" aria-label="Footer">
            <Link href="/features">Features</Link>
            <Link href="/newsletter">Newsletter</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/about">About</Link>
            <Link href="/faq">FAQ</Link>
            {authPage ? null : <Link href="/login">Open product</Link>}
          </nav>
        </div>
        <div className="footer-bottom">
          <small>© 2026 Reg Mitra</small>
        </div>
      </footer>
    </div>
  );
}
