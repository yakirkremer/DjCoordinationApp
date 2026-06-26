import { useEffect } from "react";
import { preloadTrackAudioUrls } from "../lib/trackAudioUrl";

export default function useAudioPreload(
  tracks,
  { musicSource, dropboxClient },
  currentTrackId,
  enabled = true
) {
  useEffect(() => {
    if (!enabled || !tracks?.length) return;

    const context = { musicSource, dropboxClient };
    const timer = setTimeout(() => {
      preloadTrackAudioUrls(tracks, context, {
        aroundTrackId: currentTrackId,
        limit: 8,
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [tracks, musicSource, dropboxClient, currentTrackId, enabled]);
}
