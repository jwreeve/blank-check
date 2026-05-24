import { useState } from "react";
import { series } from "./data/series";
import SeriesCard from "./components/SeriesCard";
import SeriesPanel from "./components/SeriesPanel";
import "./App.css";

const recent = series.slice(0, 3);
const rest = series;

export default function App() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="app">
      <header className="site-header">
        <h1>Blank Check</h1>
        <p className="site-subtitle">Find where to stream every film from every director series</p>
      </header>
      <main>
        <section>
          <h2 className="section-label">Current &amp; Recent</h2>
          <div className="series-grid">
            {recent.map((s) => (
              <SeriesCard key={s.id} series={s} onClick={() => setSelected(s)} />
            ))}
          </div>
        </section>

        <section className="archive-section">
          <h2 className="section-label">All Series</h2>
          <ul className="series-list">
            {rest.map((s) => (
              <li
                key={s.id}
                className="series-list-item"
                onClick={() => setSelected(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelected(s)}
              >
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

      {selected && (
        <SeriesPanel series={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
