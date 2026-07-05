import { useEffect, useMemo, useRef } from "react";
import { preloadTrackAudioUrls } from "../lib/trackAudioUrl";

function buildTracksPreloadKey(tracks) {
  if (!tracks?.length) return "";
  return tracks
    .map((track) => `${track.id}:${track.audioVersion ?? ""}:${track.isMissing ? 1 : 0}`)
    .join("|");
}

export default function useAudioPreload(tracks, currentTrackId, enabled = true) {
  const tracksPreloadKey = useMemo(() => buildTracksPreloadKey(tracks), [tracks]);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    if (!enabled || !tracksRef.current?.length) return;

    preloadTrackAudioUrls(tracksRef.current, {
      aroundTrackId: currentTrackId,
      limit: 16,
    });
  }, [tracksPreloadKey, currentTrackId, enabled]);
}
