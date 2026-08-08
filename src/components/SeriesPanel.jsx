import { useMemo } from "react";
import { track } from "@vercel/analytics";
import { filmsBySeries } from "../data/films";
import { useStreamingData } from "../hooks/useStreamingData";
import { useDirectorFilmography } from "../hooks/useDirectorFilmography";
import { FilmListBody } from "./FilmList";

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function SeriesPanel({ series, isCurrent }) {
  const curatedFilms = useMemo(() => filmsBySeries[series.id] ?? [], [series.id]);
  const filmography = useDirectorFilmography(series.director, !!isCurrent);

  const films = useMemo(() => {
    if (!filmography) return curatedFilms;
    const known = new Set(curatedFilms.map((f) => normalizeTitle(f.title)));
    const upcoming = filmography
      .filter((f) => !known.has(normalizeTitle(f.title)))
      .map((f) => ({ title: f.title, year: f.year, upcoming: true }));
    return [...curatedFilms, ...upcoming].sort((a, b) => a.year - b.year);
  }, [curatedFilms, filmography]);

  const { data, loading, error } = useStreamingData(films);
  const seriesUrl = `https://blankcheck.beam.ly/category/${series.id}`;

  return (
    <div className="now-playing">
      <div className="panel-header">
        <img src={series.image} alt={series.title} className="panel-thumb" />
        <div className="panel-header-text">
          <h2 className="panel-title">{series.director}</h2>
          <p className="panel-director">{series.title}</p>
          <a
            href={seriesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="panel-series-link"
            onClick={() => track("view_series_external", { director: series.director, title: series.title })}
          >
            View series on Blank Check →
          </a>
        </div>
      </div>

      <FilmListBody films={films} data={data} loading={loading} error={error} />
    </div>
  );
}
