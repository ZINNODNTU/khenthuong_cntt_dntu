export default function Loading() {
  return (
    <div className="error-page" role="status" aria-live="polite">
      <div className="card error-card">
        <div className="skeleton" style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", margin: "0 auto var(--space-4)" }} />
        <div className="skeleton" style={{ width: 120, height: 40, margin: "0 auto var(--space-4)", borderRadius: "var(--radius-sm)" }} />
        <div className="skeleton-text" style={{ width: "60%", margin: "0 auto" }} />
        <div className="skeleton-text" style={{ width: "40%", margin: "0 auto" }} />
      </div>
    </div>
  );
}
