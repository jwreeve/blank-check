const BASE = "https://api.themoviedb.org/3";
export const IMG_BASE = "https://image.tmdb.org/t/p/original";

const cache = new Map();

async function get(path, params = {}) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey || apiKey === "paste_your_key_here") {
    throw new Error("TMDB API key not set. Add VITE_TMDB_API_KEY to .env.local and restart the dev server.");
  }
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const cacheKey = url.toString();
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  const data = await res.json();
  cache.set(cacheKey, data);
  return data;
}

export async function searchMovie(title, year) {
  const data = await get("/search/movie", { query: title, year, language: "en-US" });
  return data.results?.[0] ?? null;
}

export async function getWatchProviders(tmdbId) {
  const data = await get(`/movie/${tmdbId}/watch/providers`);
  return data.results?.US ?? null;
}
