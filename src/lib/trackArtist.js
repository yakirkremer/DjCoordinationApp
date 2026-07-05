const HEBREW_RE = /[\u0590-\u05FF]/;

const GENERIC_ARTISTS = new Set([
  "עריכת דיג'יי",
  "dj edit",
  "unknown",
  "various artists",
  "various",
  "unknown artist",
]);

const GENERIC_ARTIST_EN = {
  "עריכת דיג'יי": "DJ Edit",
  "dj edit": "DJ Edit",
  unknown: "Unknown",
  "various artists": "Various Artists",
  various: "Various Artists",
  "unknown artist": "Unknown Artist",
};

export function containsHebrew(text) {
  return HEBREW_RE.test(text || "");
}

export function isGenericArtist(artist) {
  const raw = (artist || "").trim();
  if (!raw) return true;
  return GENERIC_ARTISTS.has(raw.toLowerCase()) || GENERIC_ARTISTS.has(raw);
}

export function shouldResolveEnglishArtist(artist) {
  const raw = (artist || "").trim();
  if (!raw) return true;
  if (isGenericArtist(raw)) return true;
  return containsHebrew(raw);
}

export function isEnglishArtistName(artist) {
  const raw = (artist || "").trim();
  if (!raw) return false;
  if (containsHebrew(raw)) return false;
  return /[A-Za-z]/.test(raw);
}

/** Display artist — English UI shows Latin names when possible. */
export function formatTrackArtist(artist, locale = "he") {
  const raw = (artist || "").trim();
  if (!raw) {
    return locale === "en" ? "DJ Edit" : "עריכת דיג'יי";
  }
  if (locale !== "en" || !containsHebrew(raw)) return raw;

  const mapped = GENERIC_ARTIST_EN[raw] || GENERIC_ARTIST_EN[raw.toLowerCase()];
  if (mapped) return mapped;

  return raw;
}
