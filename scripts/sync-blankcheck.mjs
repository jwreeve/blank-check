#!/usr/bin/env node
// Syncs src/data/series.js and src/data/films.js with new Blank Check episodes.
//
// The RSS feed has no season/category tags, so grouping episodes into series
// can't be done from the feed alone - and blankcheck.beam.ly's per-series
// categories include decades of bonus/commentary/live-show content mixed in
// with the real films, so diffing a whole category against films.js is
// unsafe on its own (it pulls in garbage). Two passes handle this:
//
// 1. Top-of-feed delta: episodes newer than anything already recorded in
//    films.js, classified against the specific beam.ly category they should
//    belong to. Anything that can't be confidently classified is reported,
//    not written.
// 2. Bonus scan: every series' full beam.ly category is diffed against its
//    known films to catch late additions to already-completed series (e.g. a
//    bonus episode covering a director's new film years after their main run
//    wrapped). Since this does diff whole categories, every candidate here
//    must pass strict TMDB director verification before being added.
//
// Only ever adds entries; never removes or reorders existing ones.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERIES_PATH = path.join(ROOT, "src/data/series.js");
const FILMS_PATH = path.join(ROOT, "src/data/films.js");
const RSS_URL = "https://feeds.megaphone.fm/blank-check";
const MINISERIES_URL = "https://www.blankcheckpod.com/miniseries";
const UA = "Mozilla/5.0 (compatible; blank-check-sync/1.0)";

function readTmdbKey() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    const m = txt.match(/VITE_TMDB_API_KEY=(.+)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}
const TMDB_KEY = readTmdbKey();

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripGuest(title) {
  return title.replace(/\s+with\s+.+$/i, "").trim();
}

// stripGuest() assumes anything after " with " is a guest name, which
// mangles films whose own title contains "with" ("Dances with Wolves" ->
// "Dances", "Praying with Anger" -> "Praying"). That's only safe to use for
// the TMDB search query (lookupYear corrects the stored title from TMDB's
// canonical result once verified) - it must never be used to decide whether
// a title is already known, or already-curated films like "Praying with
// Anger" look new and get re-added as duplicates. This checks the raw,
// un-stripped title first and only falls back to the stripped guess.
function isKnownTitle(rawTitle, normalizedKnownTitles) {
  const normFull = normalizeForMatch(rawTitle);
  const normStripped = normalizeForMatch(stripGuest(rawTitle));
  for (const known of normalizedKnownTitles) {
    if (
      known === normFull ||
      known === normStripped ||
      normFull.startsWith(known) || // curated "X", episode "X with Guest"
      known.startsWith(normStripped) // curated "X: Full Subtitle", episode short-titled just "X"
    ) {
      return true;
    }
  }
  return false;
}

// Comparison key that's insensitive to the ways beam.ly/TMDB episode titles
// and our curated titles diverge without being different films: punctuation
// ("WALL-E" vs "WALL·E"), a leading article ("Silence of the Lambs" vs "The
// Silence of the Lambs"), and British/American spelling ("Judgement Day" vs
// "Judgment Day"). Exact string matching missed all three in practice and
// produced duplicate entries.
const SPELLING_VARIANTS = [
  [/judgement/g, "judgment"],
  [/colour/g, "color"],
  [/favour/g, "favor"],
  [/theatre/g, "theater"],
  [/defence/g, "defense"],
];

function normalizeForMatch(title) {
  let t = title.toLowerCase().replace(/^the\s+/, "");
  for (const [pattern, replacement] of SPELLING_VARIANTS) {
    t = t.replace(pattern, replacement);
  }
  return t.replace(/[^a-z0-9]/g, "");
}

// --- RSS -------------------------------------------------------------------

function parseRssItems(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.map((it) => {
    const title = decodeEntities(it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
    const description = decodeEntities(it.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "");
    const pubDate = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    return { title, description, pubDate };
  });
}

function guessSeriesTitle(description, fallbackSlug) {
  const m = description.match(/Welcome to ([^,]+), our (?:series|miniseries)/i);
  return m ? m[1].trim() : fallbackSlug.toUpperCase();
}

function guessDirector(description) {
  const m = description.match(/films of (?:the |an? )?.*?\b([A-Z][\w'-]+(?:\s[A-Z][\w'.-]+){1,2})[!.]/);
  return m ? m[1].trim() : null;
}

// --- beam.ly category pages -------------------------------------------------

async function getCategoryEpisodesRaw(slug) {
  const html = await fetchText(`https://blankcheck.beam.ly/category/${slug}`);
  const m = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  const data = JSON.parse(decodeEntities(m[1]));
  for (const node of Object.values(data)) {
    if (node?.b?.episodes && Array.isArray(node.b.episodes)) {
      return node.b.episodes;
    }
  }
  return [];
}

async function getCategoryEpisodeTitles(slug) {
  const episodes = await getCategoryEpisodesRaw(slug);
  return new Set(episodes.map((e) => stripGuest(e.title).toLowerCase()));
}

// --- miniseries index (for the newest series slug + cover image) -----------

async function getNewestSeriesFromIndex() {
  const html = await fetchText(MINISERIES_URL);
  const matches = [...html.matchAll(/href="https:\/\/blankcheck\.beam\.ly\/category\/([a-z0-9-]+)"/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  const slug = last[1];
  const chunk = html.slice(last.index, last.index + 2000);
  const img = chunk.match(/data-src="(https:\/\/images\.squarespace-cdn\.com[^"]+)"/);
  return { slug, image: img ? img[1] : null };
}

// --- TMDB --------------------------------------------------------------------

async function tmdbSearch(title) {
  if (!TMDB_KEY) return [];
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

async function tmdbDirectorMatches(movieId, directorName) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return false;
  const data = await res.json();
  const directors = (data.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name.toLowerCase());
  return directors.some((d) => directorName.toLowerCase().includes(d) || d.includes(directorName.toLowerCase()));
}

// Returns { year, verified, canonicalTitle }. `verified` is false when we
// couldn't confirm the result is by the expected director (ambiguous titles
// like "The Way Back"). TMDB tokenizes hyphens oddly for stylized titles
// (e.g. "WALL-E" misses the real film entirely; it's catalogued as
// "WALL·E"), so a middle-dot variant is tried as a fallback query when the
// plain title doesn't verify.
//
// `canonicalTitle` is TMDB's own title for the verified match, not our
// guessed query - stripGuest() truncates any film whose real title contains
// " with " (e.g. "Dances with Wolves" -> "Dances", "The Girl with the
// Dragon Tattoo" -> "The Girl"), so once a match is director-verified we
// trust TMDB's title over our own mangled one.
async function lookupYear(title, directorName) {
  const queries = title.includes("-") ? [title, title.replace(/-/g, "·")] : [title];
  let firstResult = null;
  for (const query of queries) {
    const results = await tmdbSearch(query);
    if (results.length === 0) continue;
    if (!firstResult) firstResult = results[0];
    if (directorName && !/[:/&]/.test(directorName)) {
      for (const r of results) {
        if (await tmdbDirectorMatches(r.id, directorName)) {
          return {
            year: Number(r.release_date?.slice(0, 4)) || null,
            verified: true,
            canonicalTitle: r.title,
          };
        }
      }
    }
  }
  if (!firstResult) return { year: null, verified: false, canonicalTitle: title };
  return {
    year: Number(firstResult.release_date?.slice(0, 4)) || null,
    verified: false,
    canonicalTitle: title,
  };
}

// --- series.js / films.js editing -------------------------------------------

function loadSeries() {
  const src = fs.readFileSync(SERIES_PATH, "utf8");
  const ids = [...src.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  return { src, ids, topId: ids[0] };
}

function getDirector(seriesSrc, id) {
  const re = new RegExp(`id:\\s*"${id}"[\\s\\S]*?director:\\s*"([^"]*)"`);
  return seriesSrc.match(re)?.[1] ?? "";
}

function loadFilms() {
  const src = fs.readFileSync(FILMS_PATH, "utf8");
  const allTitles = new Set(
    [...src.matchAll(/title:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) =>
      normalizeForMatch(m[1].replace(/\\"/g, '"'))
    )
  );
  return { src, allTitles };
}

function getKnownTitlesForSeries(filmsSrc, seriesId) {
  const keyRe = new RegExp(`"${seriesId}":\\s*\\[([\\s\\S]*?)\\n  \\]`);
  const m = filmsSrc.match(keyRe);
  if (!m) return new Set();
  return new Set(
    [...m[1].matchAll(/title:\s*"((?:[^"\\]|\\.)*)"/g)].map((t) =>
      normalizeForMatch(t[1].replace(/\\"/g, '"'))
    )
  );
}

function insertNewSeries(seriesSrc, { id, title, director, image }) {
  const marker = "export const series = [\n";
  const idx = seriesSrc.indexOf(marker);
  const insertAt = idx + marker.length;
  const entry =
    `  {\n` +
    `    id: "${id}",\n` +
    `    title: "${title}",\n` +
    `    director: "${director}",\n` +
    `    image: "${image ?? ""}",\n` +
    `  },\n`;
  return seriesSrc.slice(0, insertAt) + entry + seriesSrc.slice(insertAt);
}

function appendFilms(filmsSrc, seriesId, newFilms) {
  const keyRe = new RegExp(`"${seriesId}":\\s*\\[([\\s\\S]*?)\\n  \\]`);
  const m = filmsSrc.match(keyRe);
  const lines = newFilms
    .map((f) => `    { title: "${f.title.replace(/"/g, '\\"')}", year: ${f.year ?? '"TODO"'} },`)
    .join("\n");
  if (m) {
    const replaced = m[0].replace(/\n  \]$/, `\n${lines}\n  ]`);
    return filmsSrc.slice(0, m.index) + replaced + filmsSrc.slice(m.index + m[0].length);
  }
  const marker = "export const filmsBySeries = {\n";
  const idx = filmsSrc.indexOf(marker);
  const insertAt = idx + marker.length;
  const block = `  "${seriesId}": [\n${lines}\n  ],\n`;
  return filmsSrc.slice(0, insertAt) + block + filmsSrc.slice(insertAt);
}

// Catches late additions to already-completed series - e.g. a bonus episode
// covering a director's new film years after their main run wrapped (like
// Sam Raimi's "Send Help" in 2026, four years after "Podcast Me to Hell"
// ended). These won't show up in the top-of-feed delta since they're old
// news by the time they're near the top of the RSS feed.
//
// Diffing whole categories against films.js is normally unsafe (categories
// mix in decades of bonus/commentary/live-show content), so every unknown
// candidate here must pass strict TMDB director verification before being
// added - unlike the top-of-feed pass, there's no unverified fallback.
async function scanForBonusAdditions(seriesSrc, filmsSrc, ids) {
  const report = [];
  let updatedFilmsSrc = filmsSrc;

  for (const id of ids) {
    const director = getDirector(seriesSrc, id);
    if (!director || /[:/&]/.test(director)) continue; // can't verify a group/nickname credit

    let episodes;
    try {
      episodes = await getCategoryEpisodesRaw(id);
    } catch {
      continue;
    }

    const known = getKnownTitlesForSeries(updatedFilmsSrc, id);
    const candidates = episodes.filter((ep) => !isKnownTitle(ep.title, known));
    if (candidates.length === 0) continue;

    const accepted = [];
    for (const ep of candidates) {
      const guess = stripGuest(ep.title);
      const { year, verified, canonicalTitle } = await lookupYear(guess, director);
      if (!verified) continue;
      accepted.push({ title: canonicalTitle, year });
      report.push(`+ film "${canonicalTitle}" (${year}) added as a late bonus addition to ${id}`);
    }
    if (accepted.length > 0) {
      updatedFilmsSrc = appendFilms(updatedFilmsSrc, id, accepted);
    }
  }

  return { filmsSrc: updatedFilmsSrc, report };
}

// --- main --------------------------------------------------------------------

async function main() {
  console.log("Fetching RSS feed...");
  const rssItems = parseRssItems(await fetchText(RSS_URL));
  const { allTitles: knownFilmTitles } = loadFilms();

  const newCandidates = [];
  for (const item of rssItems) {
    if (isKnownTitle(item.title, knownFilmTitles)) break;
    newCandidates.push(item);
  }

  if (newCandidates.length === 0) {
    console.log("No new episodes at the top of the feed since the last sync.");
  } else {
    console.log(`${newCandidates.length} new episode(s) since last sync:`);
    for (const c of newCandidates) console.log(`  - ${c.title}`);
  }

  const { src: seriesSrcOrig, ids, topId } = loadSeries();
  const topDirector = getDirector(seriesSrcOrig, topId);
  const newest = newCandidates.length > 0 ? await getNewestSeriesFromIndex() : null;

  let currentSeriesEpisodes = new Set();
  let newestSeriesEpisodes = new Set();
  if (newCandidates.length > 0) {
    console.log(`Checking against current series ("${topId}") and newest indexed series ("${newest?.slug}")...`);
    [currentSeriesEpisodes, newestSeriesEpisodes] = await Promise.all([
      getCategoryEpisodeTitles(topId).catch(() => new Set()),
      newest ? getCategoryEpisodeTitles(newest.slug).catch(() => new Set()) : new Set(),
    ]);
  }

  let seriesSrc = seriesSrcOrig;
  const { src: filmsSrcOrig } = loadFilms();
  let filmsSrc = filmsSrcOrig;

  const toAppendCurrent = [];
  const toAppendNewSeries = [];
  const skipped = [];
  let newestSeriesCreated = newest && topId === newest.slug; // already exists

  // oldest candidate first, so append order stays chronological
  for (const item of [...newCandidates].reverse()) {
    const filmTitle = stripGuest(item.title);
    const key = filmTitle.toLowerCase();
    if (currentSeriesEpisodes.has(key)) {
      toAppendCurrent.push(item);
    } else if (newest && newestSeriesEpisodes.has(key)) {
      toAppendNewSeries.push(item);
    } else {
      skipped.push(item);
    }
  }

  const report = [];

  if (toAppendCurrent.length > 0) {
    const resolved = [];
    for (const item of toAppendCurrent) {
      const guess = stripGuest(item.title);
      const { year, verified, canonicalTitle } = await lookupYear(guess, topDirector);
      const title = verified ? canonicalTitle : guess;
      resolved.push({ title, year });
      report.push(`+ film "${title}"${year ? ` (${year})` : ""} in ${topId}${verified ? "" : " [year unverified - check manually]"}`);
    }
    filmsSrc = appendFilms(filmsSrc, topId, resolved);
  }

  if (toAppendNewSeries.length > 0 && newest) {
    let newSeriesDirector = "";
    if (!newestSeriesCreated) {
      const firstDescription =
        [...newCandidates]
          .reverse()
          .find((i) => stripGuest(i.title).toLowerCase() === stripGuest(toAppendNewSeries[0].title).toLowerCase())
          ?.description ?? "";
      const title = guessSeriesTitle(firstDescription, newest.slug);
      newSeriesDirector = guessDirector(firstDescription);
      seriesSrc = insertNewSeries(seriesSrc, {
        id: newest.slug,
        title,
        director: newSeriesDirector ?? "TODO: fill in director",
        image: newest.image,
      });
      report.push(
        `+ series "${title}" (${newest.slug}), director "${newSeriesDirector ?? "UNKNOWN - fill in manually"}"` +
          ` - verify both, and check whether it needs moving into the "top 3 most recent" block`
      );
      newestSeriesCreated = true;
    }
    const resolved = [];
    for (const item of toAppendNewSeries) {
      const guess = stripGuest(item.title);
      const { year, verified, canonicalTitle } = await lookupYear(guess, newSeriesDirector);
      const title = verified ? canonicalTitle : guess;
      resolved.push({ title, year });
      report.push(`+ film "${title}"${year ? ` (${year})` : ""} in ${newest.slug}${verified ? "" : " [year unverified - check manually]"}`);
    }
    filmsSrc = appendFilms(filmsSrc, newest.slug, resolved);
  }

  for (const item of skipped) {
    report.push(`? "${item.title}" - couldn't classify (likely a bonus/one-off episode); not added`);
  }

  console.log("\nScanning every series for late bonus additions (this takes a while)...");
  const bonusResult = await scanForBonusAdditions(seriesSrc, filmsSrc, ids);
  filmsSrc = bonusResult.filmsSrc;
  report.push(...bonusResult.report);

  const changed = seriesSrc !== seriesSrcOrig || filmsSrc !== filmsSrcOrig;

  if (!changed) {
    console.log("\nNothing to add. No files changed.");
    if (report.length > 0) {
      console.log("Notes:");
      for (const line of report) console.log("  " + line);
    }
    return;
  }

  fs.writeFileSync(SERIES_PATH, seriesSrc);
  fs.writeFileSync(FILMS_PATH, filmsSrc);

  console.log("\nChanges written to src/data/series.js and src/data/films.js:");
  for (const line of report) console.log("  " + line);
  console.log("\nReview the diff before committing.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
