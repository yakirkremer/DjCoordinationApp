import fs from "fs/promises";
import path from "path";
import { ensureTrackVersions } from "../src/lib/trackVersions.js";
import { readJsonFile, writeJsonFile, DATA_FILES } from "./dataStore.js";
import { DATA_DIR, MUSIC_ROOT } from "./storagePaths.js";

const ARTWORK_DIR = path.join(DATA_DIR, "artwork");
const USER_AGENT = "KramerMusicDJPool/1.0";

const EDIT_PATTERN =
  /\s*[\(\[](?:[^)\]]*?(?:edit|remix|mashup|blend|mix|bootleg|version|remaster)[^)\]]*)[\)\]]/gi;

function artworkUrl(trackId) {
  return `/data/artwork/${trackId}.jpg`;
}

function artworkPath(trackId) {
  return path.join(ARTWORK_DIR, `${trackId}.jpg`);
}

function cleanSearchText(text) {
  if (!text) return "";
  return String(text).replace(EDIT_PATTERN, "").replace(/\s+/g, " ").trim();
}

function resultMatchesQuery(itemArtist, itemTitle, artist, title) {
  const itemA = (itemArtist || "").toLowerCase();
  const itemT = (itemTitle || "").toLowerCase();
  const titleL = (title || "").toLowerCase();
  if (!titleL) return true;
  if (itemT.includes(titleL) || titleL.includes(itemT)) return true;
  if (artist) {
    const artistL = artist.toLowerCase();
    if (itemA.includes(artistL) || itemT.includes(artistL)) return true;
  }
  return !artist;
}

async function httpGetJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function downloadBytes(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function searchItunes(artist, title) {
  const queries = [];
  if (artist && title) queries.push(`${artist} ${title}`);
  if (title) queries.push(title);
  if (artist) queries.push(artist);

  for (const query of queries) {
    const params = new URLSearchParams({
      term: query,
      media: "music",
      entity: "song",
      limit: "5",
    });
    try {
      const data = await httpGetJson(`https://itunes.apple.com/search?${params}`);
      for (const item of data.results || []) {
        const art = item.artworkUrl100;
        if (!art) continue;
        const itemArtist = item.artistName || "";
        const itemTitle = item.trackName || "";
        if (!resultMatchesQuery(itemArtist, itemTitle, artist, title)) continue;
        return {
          artworkUrl: art.replace("100x100bb", "600x600bb").replace("100x100", "600x600"),
          source: "itunes",
        };
      }
    } catch {
      /* try next query */
    }
  }
  return null;
}

async function searchDeezer(artist, title) {
  const queries = [];
  if (artist && title) {
    queries.push(`artist:"${artist}" track:"${title}"`);
    queries.push(`${artist} ${title}`);
  }
  if (title) queries.push(title);

  for (const query of queries) {
    const params = new URLSearchParams({ q: query, limit: "5" });
    try {
      const data = await httpGetJson(`https://api.deezer.com/search?${params}`);
      for (const item of data.data || []) {
        const album = item.album || {};
        const art = album.cover_big || album.cover_medium;
        if (!art) continue;
        const itemArtist = item.artist?.name || "";
        const itemTitle = item.title || "";
        if (!resultMatchesQuery(itemArtist, itemTitle, artist, title)) continue;
        return { artworkUrl: art, source: "deezer" };
      }
    } catch {
      /* try next query */
    }
  }
  return null;
}

async function findOnlineArtwork(artist, title) {
  const match = await searchItunes(artist, title);
  if (match) return match;
  return searchDeezer(artist, title);
}

function resolveSearchMeta(track) {
  const normalized = ensureTrackVersions(track);
  const artist = cleanSearchText(track.artist || "");
  const title = cleanSearchText(track.title || "");
  const filename = normalized.filename || normalized.versions?.[0]?.filename || "";
  const stem = filename ? path.basename(filename, path.extname(filename)) : "";
  const searchTitle = title || cleanSearchText(stem);
  return { artist, title: searchTitle };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function processTrack(track, { force = false } = {}) {
  const trackId = track.id;
  const dest = artworkPath(trackId);
  const url = artworkUrl(trackId);
  const { artist, title } = resolveSearchMeta(track);

  if (!title) {
    return { trackId, status: "no-meta", artwork: track.artwork || null };
  }

  const hasArtwork = track.artwork && (await fileExists(dest));
  if (!force && hasArtwork) {
    return { trackId, status: "skip", artwork: track.artwork };
  }

  const match = await findOnlineArtwork(artist, title);
  if (!match) {
    return { trackId, status: "not-found", artwork: track.artwork || null };
  }

  try {
    const imageData = await downloadBytes(match.artworkUrl);
    if (imageData.length < 500) {
      return { trackId, status: "error", artwork: track.artwork || null };
    }
    await fs.mkdir(ARTWORK_DIR, { recursive: true });
    await fs.writeFile(dest, imageData);
    track.artwork = url;
    return { trackId, status: match.source, artwork: url };
  } catch {
    return { trackId, status: "error", artwork: track.artwork || null };
  }
}

function emptyStats() {
  return {
    itunes: 0,
    deezer: 0,
    skip: 0,
    "not-found": 0,
    "no-meta": 0,
    error: 0,
    total: 0,
  };
}

/**
 * Search iTunes/Deezer by track title (+ artist) and save artwork files.
 */
export async function fetchArtworkForCatalog({ force = false, sleepMs = 200 } = {}) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const stats = emptyStats();
  const results = [];

  for (let i = 0; i < catalog.length; i++) {
    const track = ensureTrackVersions(catalog[i]);
    stats.total += 1;
    const result = await processTrack(track, { force });
    if (track.artwork) {
      catalog[i] = { ...catalog[i], artwork: track.artwork };
    }
    results.push({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      status: result.status,
      artwork: result.artwork,
    });
    stats[result.status] = (stats[result.status] || 0) + 1;

    if (sleepMs > 0 && (result.status === "itunes" || result.status === "deezer")) {
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  }

  await writeJsonFile(DATA_FILES.catalog, catalog);

  return { stats, results, tracks: catalog };
}

export async function fetchArtworkForTrack(trackId, { force = false } = {}) {
  const catalog = await readJsonFile(DATA_FILES.catalog, []);
  const idx = catalog.findIndex((t) => t.id === trackId);
  if (idx === -1) throw new Error("Track not found");

  const track = ensureTrackVersions(catalog[idx]);
  const result = await processTrack(track, { force });
  if (track.artwork) {
    catalog[idx] = { ...catalog[idx], artwork: track.artwork };
  }
  await writeJsonFile(DATA_FILES.catalog, catalog);

  return { ...result, track, stats: { [result.status]: 1, total: 1 } };
}
