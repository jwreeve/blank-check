import { useMemo } from "react";
import { useStreamingData } from "../hooks/useStreamingData";
import { useDirectorFilmography } from "../hooks/useDirectorFilmography";
import { FilmListBody } from "./FilmList";

export default function ComingSoonPanel({ director }) {
  const filmography = useDirectorFilmography(director, true);

  const films = useMemo(() => {
    if (!filmography) return [];
    return [...filmography]
      .map((f) => ({ title: f.title, year: f.year, upcoming: true }))
      .sort((a, b) => a.year - b.year);
  }, [filmography]);

  const { data, loading, error } = useStreamingData(films);

  return (
    <div className="now-playing">
      <div className="panel-header">
        <span className="panel-thumb panel-thumb-placeholder">🎬</span>
        <div className="panel-header-text">
          <h2 className="panel-title">{director}</h2>
          <p className="panel-director">Series not yet started</p>
        </div>
      </div>

      <FilmListBody
        films={films}
        data={data}
        loading={loading}
        error={error}
        emptyMessage="No confirmed filmography yet."
      />
    </div>
  );
}
