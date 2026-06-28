import { applyActiveVersion, ensureTrackVersions } from "./trackVersions.js";

/** Genres that also list tracks from other buckets when a version drop matches the genre name. */
export const DROP_MIRROR_GENRES = ["Tomorrowland", "Techno", "Trance", "House"];

export function normGenreKey(name) {
  return String(name ?? "").trim().toLowerCase();
}

export function isDropMirrorGenre(genre, mirrorList = DROP_MIRROR_GENRES) {
  return mirrorList.some((g) => normGenreKey(g) === normGenreKey(genre));
}

export function getTracksForGenre(tracks, genre) {
  const results = [];
  const seen = new Set();
  const genreKey = normGenreKey(genre);

  for (const raw of tracks) {
    const track = ensureTrackVersions(raw);
    const playable = (track.versions || []).filter((v) => !v.isMissing);
    if (playable.length === 0) continue;

    if (normGenreKey(track.bucket) === genreKey) {
      const version = playable.find((v) => v.id === track.defaultVersionId) || playable[0];
      const key = `${track.id}:${version.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          track,
          versionId: version.id,
          via: "bucket",
          lockVersion: false,
        });
      }
    }

    if (isDropMirrorGenre(genre)) {
      for (const version of playable) {
        if (normGenreKey(version.drop) !== genreKey) continue;
        const key = `${track.id}:${version.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            track,
            versionId: version.id,
            via: "drop",
            lockVersion: true,
          });
        }
      }
    }
  }

  return results.sort((a, b) => {
    if (a.via !== b.via) return a.via === "bucket" ? -1 : 1;
    return (a.track.title || "").localeCompare(b.track.title || "", "he");
  });
}

export function countTracksForGenre(tracks, genre) {
  return getTracksForGenre(tracks, genre).length;
}

export function entryPlaybackTrack(entry) {
  return applyActiveVersion(entry.track, entry.versionId);
}

export function findGenreEntry(tracks, genre, trackId) {
  return getTracksForGenre(tracks, genre).find((e) => e.track.id === trackId) ?? null;
}
