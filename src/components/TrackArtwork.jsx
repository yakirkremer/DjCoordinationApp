import React, { useState } from "react";

const BUCKET_COLORS = {
  Israeli: ["#c9a962", "#8a7340"],
  Loazi: ["#00c8e8", "#006880"],
  Mizrahit: ["#ff6b2c", "#b84a1a"],
  Oldies: ["#a78bfa", "#6d4fc7"],
  "Hip Hop": ["#f472b6", "#be185d"],
  Regatton: ["#34d399", "#047857"],
  Trance: ["#60a5fa", "#1d4ed8"],
  Techno: ["#fbbf24", "#b45309"],
  Tomorrowland: ["#22c55e", "#15803d"],
};

export default function TrackArtwork({ track }) {
  const [failed, setFailed] = useState(false);
  const [from, to] = BUCKET_COLORS[track.bucket] ?? ["#6b6b78", "#3a3a44"];
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
