export function DemoNotice() {
  return (
    <div className="notice" role="note">
      <span className="notice-icon" aria-hidden="true">◇</span>
      <span>
        <strong>Illustrative workspace data.</strong> Figures and statuses below are not connected to live client records.
        No government portal, client ledger, or filing system is connected.
      </span>
    </div>
  );
}
