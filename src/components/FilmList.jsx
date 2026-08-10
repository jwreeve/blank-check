import { track } from "@vercel/analytics";
import { IMG_BASE } from "../services/tmdb";

function dedupeProviders(providers) {
  const seen = new Set();
  return providers.filter((p) => {
    if (seen.has(p.provider_id)) return false;
    seen.add(p.provider_id);
    return true;
  });
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

function ProviderRow({ label, providers, watchLink, filmTitle }) {
  if (providers.length === 0) return null;
  return (
    <div className="film-providers">
      <span className="film-providers-label">{label}</span>
      {providers.map((p) => (
        <ProviderBadge key={p.provider_id} provider={p} watchLink={watchLink} filmTitle={filmTitle} />
      ))}
    </div>
  );
}

export function FilmRow({ film }) {
  const streaming = dedupeProviders([
    ...(film.providers?.flatrate ?? []),
    ...(film.providers?.free ?? []),
    ...(film.providers?.ads ?? []),
  ]);
  const purchase = dedupeProviders([
    ...(film.providers?.rent ?? []),
    ...(film.providers?.buy ?? []),
  ]);

  const watchLink = film.tmdbId
    ? `https://www.themoviedb.org/movie/${film.tmdbId}/watch?locale=US`
    : null;

  return (
    <div className="film-row">
      <div className="film-meta">
        <span className="film-title">{film.title}</span>
        <span className="film-year">{film.year}</span>
      </div>
      {streaming.length > 0 || purchase.length > 0 ? (
        <>
          <ProviderRow label="Stream" providers={streaming} watchLink={watchLink} filmTitle={film.title} />
          <ProviderRow label="Buy/Rent" providers={purchase} watchLink={watchLink} filmTitle={film.title} />
        </>
      ) : (
        <span className="film-unavailable">Not streaming</span>
      )}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="film-row skeleton-row">
      <div className="skeleton-line skeleton-title-line" />
      <div className="skeleton-line skeleton-providers-line" />
    </div>
  );
}

export function FilmListBody({ films, data, loading, error, emptyMessage = "Film list coming soon." }) {
  return (
    <div className="panel-body">
      {error && <p className="panel-error">{error}</p>}

      {loading &&
        (films.length > 0 ? films : Array(5).fill(null)).map((f, i) => <SkeletonRow key={i} />)}

      {data && data.map((film) => <FilmRow key={`${film.title}-${film.year}`} film={film} />)}

      {!loading && films.length === 0 && <p className="panel-empty">{emptyMessage}</p>}
    </div>
  );
}
