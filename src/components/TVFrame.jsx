import { useEffect, useRef } from "react";

export default function TVFrame({ children, channelKey }) {
  const contentRef = useRef(null);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [channelKey]);

  return (
    <div className="tv-frame">
      <div className="tv-brand-plate">Blank Check</div>
      <div className="tv-screen-bezel">
        <div className="tv-screen">
          <div className="tv-screen-content" ref={contentRef}>{children}</div>
          <div className="tv-scanlines" />
          <div className="tv-vignette" />
          {/* Remounting on channelKey change replays the CSS static-burst animation. */}
          <div key={channelKey} className="tv-static" />
        </div>
      </div>
      <div className="tv-dial tv-dial-channel" title="Channel">
        <span className="tv-dial-notch" />
      </div>
      <div className="tv-dial tv-dial-volume" title="Volume">
        <span className="tv-dial-notch" />
      </div>
      <div className="tv-speaker-grille" />
    </div>
  );
}
