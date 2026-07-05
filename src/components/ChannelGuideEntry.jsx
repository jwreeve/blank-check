export default function ChannelGuideEntry({ count, onClick }) {
  return (
    <div
      className="guide-entry"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <span className="guide-entry-icon">📺</span>
      <div className="guide-entry-info">
        <h2 className="guide-entry-title">Channel Guide</h2>
        <p className="guide-entry-subtitle">Browse all {count} series</p>
      </div>
      <span className="guide-entry-arrow">›</span>
    </div>
  );
}
