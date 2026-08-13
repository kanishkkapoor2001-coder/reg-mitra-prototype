// Streaming boundary for every signed-in page.
//
// Without a loading file, Next has nowhere to suspend: the layout waits for the
// page's data before sending a single byte, so the sidebar and top bar — which
// need no data at all — appeared only once the slowest query had finished. On
// /today that meant a blank screen for the workspace lookup, the task query and
// the pending-decisions query in series.
//
// With it, the shell paints immediately and the page streams into this. Total
// time is unchanged; the wait stops being a blank page, which is the part that
// actually reads as slow.
//
// Deliberately generic. It stands in for /today, /clients, /regulations and the
// rest, so it mimics the shape they share — a heading, a summary strip, a list —
// rather than any one of them. A skeleton that guesses too specifically is worse
// than one that is obviously a placeholder.
export default function AppLoading() {
  return (
    <div className="route-skeleton" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading…</span>

      <div className="skeleton-line skeleton-eyebrow" />
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-subtitle" />

      <div className="skeleton-strip">
        <div className="skeleton-line skeleton-stat" />
        <div className="skeleton-line skeleton-stat" />
        <div className="skeleton-line skeleton-stat" />
      </div>

      <div className="skeleton-rows">
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    </div>
  );
}
