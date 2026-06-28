import React, { useState } from "react";
import { getGenreGradient } from "../lib/genreColors";

export default function TrackArtwork({ track }) {
  const [failed, setFailed] = useState(false);
  const [from, to] = getGenreGradient(track.bucket);
  const initial = (track.title || "?").charAt(0).toUpperCase();

  if (track.artwork && !failed) {
    return (
      <div className="xdj-az-art xdj-az-art-has-image" aria-hidden>
        <img
          src={track.artwork}
          alt=""
          className="xdj-az-art-img"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="xdj-az-art"
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      aria-hidden
    >
      <span className="xdj-az-art-letter">{initial}</span>
    </div>
  );
}
