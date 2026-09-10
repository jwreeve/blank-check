// Amazon has no public API for physical-media listings, so these are plain
// Amazon search links rather than direct product-page lookups - "i=dvd"
// scopes the search to Amazon's Movies & TV department (Amazon's own,
// long-standing index name for it) so results stay on-topic instead of
// surfacing soundtracks, posters, etc.
const ASSOCIATE_TAG = import.meta.env.VITE_AMAZON_ASSOCIATE_TAG;

export function amazonPhysicalMediaLink(title, formatQuery) {
  const url = new URL("https://www.amazon.com/s");
  url.searchParams.set("k", `${title} ${formatQuery}`);
  url.searchParams.set("i", "dvd");
  if (ASSOCIATE_TAG) url.searchParams.set("tag", ASSOCIATE_TAG);
  return url.toString();
}
