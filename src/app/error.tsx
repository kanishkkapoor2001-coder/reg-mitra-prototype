"use client";

export default function ErrorPage({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <section className="panel">
      <div className="empty-state">
        <div className="empty-state-icon">!</div>
        <h1>Something went wrong</h1>
        <p>This workspace view could not be loaded. No data was changed.</p>
        <button className="button primary" type="button" onClick={reset}>Try again</button>
      </div>
    </section>
  );
}
