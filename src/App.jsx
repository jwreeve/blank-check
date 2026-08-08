import { useCallback, useEffect, useMemo, useState } from "react";
import { track } from "@vercel/analytics";
import { series } from "./data/series";
import { comingSoon as comingSoonData } from "./data/comingSoon";
import NowShowing from "./components/NowShowing";
import ChannelGuideEntry from "./components/ChannelGuideEntry";
import ComingSoonEntry from "./components/ComingSoonEntry";
import SeriesPanel from "./components/SeriesPanel";
import ComingSoonPanel from "./components/ComingSoonPanel";
import PorchScene from "./components/PorchScene";
import TVFrame from "./components/TVFrame";
import VCRDeck from "./components/VCRDeck";
import "./styles/porch-vcr.css";
import "./App.css";

const current = series[0];

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function App() {
  const [view, setView] = useState("home"); // "home" | "guide" | "playing" | "coming-soon" | "coming-soon-playing"
  const [selected, setSelected] = useState(null);
  const [selectedDirector, setSelectedDirector] = useState(null);
  const [ejecting, setEjecting] = useState(false);

  // A director drops off this list automatically once their series shows up
  // in series.js - series.js is the source of truth, so there's nothing to
  // manually clean up in comingSoon.js when a series actually starts.
  const comingSoon = useMemo(() => {
    const started = new Set(series.map((s) => normalizeName(s.director)));
    return comingSoonData.filter((c) => !started.has(normalizeName(c.director)));
  }, []);

  const index = selected ? series.findIndex((s) => s.id === selected.id) : -1;

  function play(s) {
    track("play_series", { director: s.director, title: s.title });
    setSelected(s);
    setView("playing");
  }

  function openGuide() {
    track("open_channel_guide");
    setSelected(null);
    setView("guide");
  }

  function openComingSoon() {
    track("open_coming_soon");
    setSelectedDirector(null);
    setView("coming-soon");
  }

  function playComingSoon(entry) {
    track("view_coming_soon_director", { director: entry.director });
    setSelectedDirector(entry.director);
    setView("coming-soon-playing");
  }

  // Stop steps back one level: Now Playing -> Channel Guide -> Home, and
  // Coming Soon detail -> Coming Soon list -> Home.
  const stop = useCallback(() => {
    setSelected(null);
    setSelectedDirector(null);
    setView((v) => {
      if (v === "playing") return "guide";
      if (v === "coming-soon-playing") return "coming-soon";
      return "home";
    });
  }, []);

  // Eject always returns all the way home, with a little tape-eject flourish.
  function eject() {
    setSelected(null);
    setSelectedDirector(null);
    setView("home");
    setEjecting(true);
    setTimeout(() => setEjecting(false), 500);
  }

  const shift = useCallback((delta) => {
    setView("playing");
    setSelectedDirector(null);
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

  const channelKey =
    view === "playing" ? selected.id : view === "coming-soon-playing" ? selectedDirector : view;

  return (
    <PorchScene
      header={
        <header className="page-header">
          <h1>Porch Movies</h1>
          <p className="page-subtitle">Where to stream every available film from every Blank Check director series</p>
        </header>
      }
    >
      <VCRDeck
        playing={view === "playing"}
        ejecting={ejecting}
        channelNumber={index === -1 ? 0 : index + 1}
        channelLabel={
          view === "playing"
            ? `${selected.director} — ${selected.title}`
            : view === "coming-soon-playing"
              ? `${selectedDirector} — Coming Soon`
              : ""
        }
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

        {view === "coming-soon-playing" && <ComingSoonPanel director={selectedDirector} />}

        {view === "home" && (
          <div className="channel-guide channel-guide-home">
            <main>
              <div className="guide-entry-row">
                <ChannelGuideEntry count={series.length} onClick={openGuide} />
                <ComingSoonEntry count={comingSoon.length} onClick={openComingSoon} />
              </div>
              <NowShowing series={current} onClick={() => play(current)} />
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

        {view === "coming-soon" && (
          <div className="channel-guide">
            <header className="site-header">
              <h1>Coming Soon</h1>
              <p className="site-subtitle">Announced directors whose series hasn't started yet</p>
            </header>
            <main>
              {comingSoon.length > 0 ? (
                <section className="tv-guide">
                  <div className="tv-guide-header">
                    <span className="tv-guide-header-program">Coming Soon</span>
                  </div>
                  <ul className="tv-guide-list">
                    {comingSoon.map((c) => (
                      <li
                        key={c.director}
                        className="tv-guide-row"
                        onClick={() => playComingSoon(c)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && playComingSoon(c)}
                      >
                        <span className="tv-guide-thumb tv-guide-thumb-placeholder">🎬</span>
                        <div className="tv-guide-info">
                          <span className="tv-guide-title">{c.director}</span>
                          <span className="tv-guide-director">Series not yet started</span>
                        </div>
                        <span className="tv-guide-arrow">›</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="panel-empty">No upcoming directors announced yet.</p>
              )}
            </main>
          </div>
        )}
      </TVFrame>
    </PorchScene>
  );
}
