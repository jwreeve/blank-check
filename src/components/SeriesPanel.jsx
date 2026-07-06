import { useMemo } from "react";
import { track } from "@vercel/analytics";
import { filmsBySeries } from "../data/films";
import { useStreamingData } from "../hooks/useStreamingData";
import { useDirectorFilmography } from "../hooks/useDirectorFilmography";
import { IMG_BASE } from "../services/tmdb";

function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function ProviderBadge({ provider, watchLink, filmTitle }) {
  return (
    <a
      href={watchLink ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="provider-badge"
      title={provider.provider_name}
      onClick={() => track("click_provider", { provider: provider.provider_name, film: filmTitle })}
    >
      <img
        src={`${IMG_BASE}${provider.logo_path}`}
        alt={provider.provider_name}
        className="provider-logo"
      />
    </a>
  );
}

function FilmRow({ film }) {
  const providers = [
    ...(film.providers?.flatrate ?? []),
    ...(film.providers?.free ?? []),
    ...(film.providers?.ads ?? []),
    ...(film.providers?.rent ?? []),
    ...(film.providers?.buy ?? []),
  ];

  const seen = new Set();
  const unique = providers.filter((p) => {
    if (seen.has(p.provider_id)) return false;
    seen.add(p.provider_id);
    return true;
  });

  const watchLink = film.tmdbId
    ? `https://www.themoviedb.org/movie/${film.tmdbId}/watch?locale=US`
    : null;

  return (
    <div className="film-row">
      <div className="film-meta">
        <span className="film-title">{film.title}</span>
        <span className="film-year">{film.year}</span>
        {film.upcoming && <span className="film-upcoming-tag">Not yet covered</span>}
      </div>
      <div className="film-providers">
        {unique.length > 0 ? (
          unique.map((p) => (
            <ProviderBadge
              key={p.provider_id}
              provider={p}
              watchLink={watchLink}
              filmTitle={film.title}
            />
          ))
        ) : (
          <span className="film-unavailable">Not streaming</span>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="film-row skeleton-row">
      <div className="skeleton-line skeleton-title-line" />
      <div className="skeleton-line skeleton-providers-line" />
    </div>
  );
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

      <div className="panel-body">
        {error && <p className="panel-error">{error}</p>}

        {loading &&
          (films.length > 0 ? films : Array(5).fill(null)).map((f, i) => (
            <SkeletonRow key={i} />
          ))}

        {data &&
          data.map((film) => (
            <FilmRow key={`${film.title}-${film.year}`} film={film} />
          ))}

        {!loading && films.length === 0 && (
          <p className="panel-empty">Film list coming soon.</p>
        )}
      </div>
    </div>
  );
}
