function VCRButton({ className = "", icon, label, hint, onClick }) {
  return (
    <button className={`vcr-btn ${className}`} onClick={onClick} data-tooltip={hint}>
      <span className="vcr-btn-icon">{icon}</span>
      <span className="vcr-btn-label">{label}</span>
    </button>
  );
}

export default function VCRDeck({
  playing,
  channelNumber,
  channelLabel,
  ejecting,
  onPlay,
  onStop,
  onEject,
  onPrev,
  onNext,
}) {
  return (
    <div className={`vcr-deck ${ejecting ? "vcr-deck-ejecting" : ""}`}>
      <div className="vcr-tape-slot">
        <div className="vcr-tape" />
      </div>

      <div className="vcr-display">
        {playing ? (
          <>
            <span className="vcr-display-channel">▶ CH{String(channelNumber).padStart(2, "0")}</span>
            <span className="vcr-display-label">{channelLabel}</span>
          </>
        ) : (
          <span className="vcr-display-clock">12:00</span>
        )}
      </div>

      <div className="vcr-buttons">
        <VCRButton icon="⏪" label="Rewind" hint="Previous series" onClick={onPrev} />
        <VCRButton
          className="vcr-btn-play"
          icon="▶"
          label="Play"
          hint="Watch this series"
          onClick={onPlay}
        />
        <VCRButton icon="⏩" label="F. Fwd" hint="Next series" onClick={onNext} />
        <VCRButton icon="⏹" label="Stop" hint="Back to guide" onClick={onStop} />
        <VCRButton
          className="vcr-btn-eject"
          icon="⏏"
          label="Eject"
          hint="Return home"
          onClick={onEject}
        />
      </div>
    </div>
  );
}
