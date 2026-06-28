import { useEffect } from "react";
import { preloadTrackAudioUrls } from "../lib/trackAudioUrl";

export default function useAudioPreload(tracks, currentTrackId, enabled = true) {
  useEffect(() => {
    if (!enabled || !tracks?.length) return;

    const timer = setTimeout(() => {
      preloadTrackAudioUrls(tracks, {
        aroundTrackId: currentTrackId,
        limit: 8,
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [tracks, currentTrackId, enabled]);
}
