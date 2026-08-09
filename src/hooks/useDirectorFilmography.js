import { useEffect, useState } from "react";
import { findPerson, getDirectorFilmography } from "../services/tmdb";

// Only meaningful for a single real person's name (not a nickname like
// "Coens" or a combo credit like "J.J. Abrams / Rian Johnson").
function looksLikeAPersonName(name) {
  return !!name && /^[\w'.-]+(\s[\w'.-]+)+$/.test(name.trim());
}

export function useDirectorFilmography(directorName, enabled) {
  // Keyed by the exact `directorName` the fetch was for, so a switch to a
  // new series can't keep showing the previous director's films while the
  // new fetch is in flight (same pattern as useStreamingData).
  const [result, setResult] = useState({ directorName: null, filmography: null });

  useEffect(() => {
    if (!enabled || !looksLikeAPersonName(directorName)) return;
    let cancelled = false;

    (async () => {
      try {
        const person = await findPerson(directorName);
        if (!person) return;
        const films = await getDirectorFilmography(person.id);
        if (!cancelled) setResult({ directorName, filmography: films });
      } catch {
        // Best-effort enrichment - fall back to the curated film list.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [directorName, enabled]);

  return result.directorName === directorName ? result.filmography : null;
}
