import { useEffect, useState } from "react";
import { findPerson, getDirectorFilmography } from "../services/tmdb";

// Only meaningful for a single real person's name (not a nickname like
// "Coens" or a combo credit like "J.J. Abrams / Rian Johnson").
function looksLikeAPersonName(name) {
  return !!name && /^[\w'.-]+(\s[\w'.-]+)+$/.test(name.trim());
}

export function useDirectorFilmography(directorName, enabled) {
  const [filmography, setFilmography] = useState(null);

  useEffect(() => {
    if (!enabled || !looksLikeAPersonName(directorName)) return;
    let cancelled = false;

    (async () => {
      try {
        const person = await findPerson(directorName);
        if (!person) return;
        const films = await getDirectorFilmography(person.id);
        if (!cancelled) setFilmography(films);
      } catch {
        // Best-effort enrichment - fall back to the curated film list.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [directorName, enabled]);

  return filmography;
}
