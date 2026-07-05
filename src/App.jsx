import { useCallback, useEffect, useState } from "react";
import { series } from "./data/series";
import NowShowing from "./components/NowShowing";
import ChannelGuideEntry from "./components/ChannelGuideEntry";
import SeriesPanel from "./components/SeriesPanel";
import PorchScene from "./components/PorchScene";
import TVFrame from "./components/TVFrame";
import VCRDeck from "./components/VCRDeck";
import "./styles/porch-vcr.css";
import "./App.css";

const current = series[0];

export default function App() {
  const [view, setView] = useState("home"); // "home" | "guide" | "playing"
  const [selected, setSelected] = useState(null);
  const [ejecting, setEjecting] = useState(false);

  const index = selected ? series.findIndex((s) => s.id === selected.id) : -1;

  function play(s) {
    setSelected(s);
    setView("playing");
  }

  function openGuide() {
    setSelected(null);
    setView("guide");
  }

  // Stop steps back one level: Now Playing -> Channel Guide -> Home.
  const stop = useCallback(() => {
    setSelected(null);
    setView((v) => (v === "playing" ? "guide" : "home"));
  }, []);

  // Eject always returns all the way home, with a little tape-eject flourish.
  function eject() {
    setSelected(null);
    setView("home");
    setEjecting(true);
    setTimeout(() => setEjecting(false), 500);
  }

  const shift = useCallback((delta) => {
    setView("playing");
    setSelected((current) => {
      const currentIndex = current ? series.findIndex((s) => s.id === current.id) : -1;
      const base = currentIndex === -1 ? -delta : currentIndex;
      const next = (base + delta + series.length) % series.length;
      return series[next];
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowLeft") shift(-1);
      if (e.key === "ArrowRight") shift(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop, shift]);

  const channelKey = view === "playing" ? selected.id : view;

  return (
    <PorchScene>
      <header className="page-header">
        <h1>Blank Check</h1>
        <p className="page-subtitle">Find where to stream every film from every director series</p>
      </header>

      <VCRDeck
        playing={view === "playing"}
        ejecting={ejecting}
        channelNumber={index === -1 ? 0 : index + 1}
        channelLabel={selected ? `${selected.director} — ${selected.title}` : ""}
        onPlay={() => play(series[index === -1 ? 0 : index])}
        onStop={stop}
        onEject={eject}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
      />

      <TVFrame channelKey={channelKey}>
        {view === "playing" && (
          <SeriesPanel series={selected} isCurrent={selected.id === current.id} />
        )}

        {view === "home" && (
          <div className="channel-guide channel-guide-home">
            <main>
              <NowShowing series={current} onClick={() => play(current)} />
              <ChannelGuideEntry count={series.length} onClick={openGuide} />
            </main>
          </div>
        )}

        {view === "guide" && (
          <div className="channel-guide">
            <header className="site-header">
              <h1>Channel Guide</h1>
              <p className="site-subtitle">Every director series, in order of appearance</p>
            </header>
            <main>
              <section className="tv-guide">
                <div className="tv-guide-header">
                  <span className="tv-guide-header-ch">CH</span>
                  <span className="tv-guide-header-program">Program Guide</span>
                </div>
                <ul className="tv-guide-list">
                  {series.map((s, i) => (
                    <li
                      key={s.id}
                      className="tv-guide-row"
                      onClick={() => play(s)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && play(s)}
                    >
                      <span className="tv-guide-channel">{String(i + 1).padStart(2, "0")}</span>
                      <img src={s.image} alt={s.title} className="tv-guide-thumb" />
                      <div className="tv-guide-info">
                        <span className="tv-guide-title">{s.director}</span>
                        <span className="tv-guide-director">{s.title}</span>
                      </div>
                      <span className="tv-guide-arrow">›</span>
                    </li>
                  ))}
                </ul>
              </section>
            </main>
          </div>
        )}
      </TVFrame>
    </PorchScene>
  );
}
