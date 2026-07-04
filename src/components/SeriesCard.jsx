export default function SeriesCard({ series, channelNumber, onClick }) {
  return (
    <div className="series-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}>
      <div className="series-card-image-wrap">
        {channelNumber != null && (
          <span className="series-card-channel">CH {String(channelNumber).padStart(2, "0")}</span>
        )}
        <img
          src={series.image}
          alt={series.title}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
        />
      </div>
      <div className="series-card-info">
        <h2 className="series-card-title">{series.director}</h2>
        <p className="series-card-director">{series.title}</p>
      </div>
    </div>
  );
}
