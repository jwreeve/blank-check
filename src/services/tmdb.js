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
  const results = data.results ?? [];
  if (results.length === 0) return null;
  // TMDB doesn't rank results by relevance for stylized/punctuation-heavy
  // titles (e.g. "WALL-E" surfaces a "WALL·E's Treasures & Trinkets" short
  // ahead of the actual film), so prefer the most popular match instead of
  // trusting result order.
  return results.reduce((best, r) => (r.popularity > best.popularity ? r : best));
}

export async function getWatchProviders(tmdbId) {
  const data = await get(`/movie/${tmdbId}/watch/providers`);
  return data.results?.US ?? null;
}

export async function findPerson(name) {
  const data = await get("/search/person", { query: name, language: "en-US" });
  return data.results?.[0] ?? null;
}

// Full director filmography (released films only), for "watch ahead" on the
// currently-airing series - the podcast may not have covered these yet.
export async function getDirectorFilmography(personId) {
  const data = await get(`/person/${personId}/movie_credits`);
  const today = new Date();
  return (data.crew ?? [])
    .filter(
      (c) =>
        c.job === "Director" &&
        c.release_date &&
        new Date(c.release_date) <= today &&
        (c.vote_count ?? 0) >= 200
    )
    .map((c) => ({
      title: c.title,
      year: Number(c.release_date.slice(0, 4)),
      tmdbId: c.id,
      releaseDate: c.release_date,
    }))
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
}
