import { useCallback, useEffect, useState } from "react";
import { series } from "./data/series";
import SeriesCard from "./components/SeriesCard";
import SeriesPanel from "./components/SeriesPanel";
import PorchScene from "./components/PorchScene";
import TVFrame from "./components/TVFrame";
import VCRDeck from "./components/VCRDeck";
import "./styles/porch-vcr.css";
import "./App.css";

const recent = series.slice(0, 3);

export default function App() {
  const [selected, setSelected] = useState(null);
  const [ejecting, setEjecting] = useState(false);

  const index = selected ? series.findIndex((s) => s.id === selected.id) : -1;

  function play(s) {
    setSelected(s);
  }

  const stop = useCallback(() => setSelected(null), []);

  function eject() {
    setSelected(null);
    setEjecting(true);
    setTimeout(() => setEjecting(false), 500);
  }

  const shift = useCallback((delta) => {
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

  return (
    <PorchScene>
      <TVFrame channelKey={selected ? selected.id : "guide"}>
        {selected ? (
          <SeriesPanel series={selected} />
        ) : (
          <div className="channel-guide">
            <header className="site-header">
              <h1>Blank Check</h1>
              <p className="site-subtitle">Find where to stream every film from every director series</p>
            </header>
            <main>
              <section>
                <h2 className="section-label">Current &amp; Recent</h2>
                <div className="series-grid">
                  {recent.map((s, i) => (
                    <SeriesCard key={s.id} series={s} channelNumber={i + 1} onClick={() => play(s)} />
                  ))}
                </div>
              </section>

              <section className="archive-section">
                <h2 className="section-label">All Series</h2>
                <ul className="series-list">
                  {series.map((s, i) => (
                    <li
                      key={s.id}
                      className="series-list-item"
                      onClick={() => play(s)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && play(s)}
                    >
                      <span className="series-list-channel">{String(i + 1).padStart(2, "0")}</span>
                      <img src={s.image} alt={s.title} className="series-list-thumb" />
                      <div className="series-list-info">
                        <span className="series-list-title">{s.director}</span>
                        <span className="series-list-director">{s.title}</span>
                      </div>
                      <span className="series-list-arrow">›</span>
                    </li>
                  ))}
                </ul>
              </section>
            </main>
          </div>
        )}
      </TVFrame>

      <VCRDeck
        playing={!!selected}
        ejecting={ejecting}
        channelNumber={index === -1 ? 0 : index + 1}
        channelLabel={selected ? `${selected.director} — ${selected.title}` : ""}
        onPlay={() => play(series[index === -1 ? 0 : index])}
        onStop={stop}
        onEject={eject}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
      />
    </PorchScene>
  );
}
