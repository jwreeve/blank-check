export default function ComingSoonEntry({ count, onClick }) {
  return (
    <div
      className="guide-entry"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <span className="guide-entry-icon">🎬</span>
      <div className="guide-entry-info">
        <h2 className="guide-entry-title">Coming Soon</h2>
        <p className="guide-entry-subtitle">
          {count > 0 ? `${count} upcoming director${count === 1 ? "" : "s"}` : "Nothing announced yet"}
        </p>
      </div>
      <span className="guide-entry-arrow">›</span>
    </div>
  );
}
