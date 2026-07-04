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
        <button className="vcr-btn" onClick={onPrev} aria-label="Rewind to previous series">
          ⏪
        </button>
        <button className="vcr-btn vcr-btn-play" onClick={onPlay} aria-label="Play">
          ▶
        </button>
        <button className="vcr-btn" onClick={onNext} aria-label="Fast-forward to next series">
          ⏩
        </button>
        <button className="vcr-btn" onClick={onStop} aria-label="Stop">
          ⏹
        </button>
        <button className="vcr-btn vcr-btn-eject" onClick={onEject} aria-label="Eject">
          ⏏
        </button>
      </div>
    </div>
  );
}
