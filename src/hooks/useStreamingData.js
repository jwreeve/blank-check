import { useState, useEffect } from "react";
import { searchMovie, getWatchProviders } from "../services/tmdb";

export function useStreamingData(films) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!films || films.length === 0) return;
    let cancelled = false;

    setLoading(true);
    setData(null);
    setError(null);

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
      .then((results) => {
        if (!cancelled) {
          setData(results);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [films]);

  return { data, loading, error };
}
