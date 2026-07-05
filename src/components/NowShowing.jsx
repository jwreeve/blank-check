export default function NowShowing({ series, onClick }) {
  return (
    <div
      className="now-showing"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="now-showing-media">
        <img src={series.image} alt={series.title} />
      </div>
      <div className="now-showing-info">
        <span className="now-showing-badge">
          <span className="now-showing-dot" /> On now &middot; CH 01
        </span>
        <h2 className="now-showing-title">{series.director}</h2>
        <p className="now-showing-director">{series.title}</p>
      </div>
    </div>
  );
}
