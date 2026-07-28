import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel">
      <div className="empty-state">
        <div className="empty-state-icon">?</div>
        <h1>Page not found</h1>
        <p>The workspace page you requested does not exist or has moved.</p>
        <Link className="button primary" href="/">Return home</Link>
      </div>
    </section>
  );
}
