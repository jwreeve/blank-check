import { useState, useEffect } from "react";
import { searchMovie, getWatchProviders } from "../services/tmdb";

export function useStreamingData(films) {
  // Keyed by the exact `films` reference the fetch was for, so loading/data/
  // error can be derived during render instead of reset with a synchronous
  // setState call at the top of the effect (that pattern forces React into
  // an extra render pass every time films changes).
  const [result, setResult] = useState({ films: null, data: null, error: null });

  useEffect(() => {
    if (!films || films.length === 0) return;
    let cancelled = false;

    Promise.all(
      films.map(async (film) => {
        const { title, year } = film;
        try {
          const movie = await searchMovie(title, year);
          if (!movie) return { ...film, providers: null, tmdbId: null };
          const providers = await getWatchProviders(movie.id);
          return { ...film, providers, tmdbId: movie.id };
        } catch (e) {
          return { ...film, providers: null, tmdbId: null, fetchError: e.message };
        }
      })
    )
      .then((data) => {
        if (!cancelled) setResult({ films, data, error: null });
      })
      .catch((e) => {
        if (!cancelled) setResult({ films, data: null, error: e.message });
      });

    return () => {
      cancelled = true;
    };
  }, [films]);

  const current = result.films === films;
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: !!films && films.length > 0 && !current,
  };
}
