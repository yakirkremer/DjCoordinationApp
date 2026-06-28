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

function hashGenreColors(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return [`hsl(${h}, 52%, 52%)`, `hsl(${h}, 52%, 34%)`];
}

export function getGenreGradient(bucket) {
  return BUCKET_COLORS[bucket] ?? hashGenreColors(bucket || "?");
}

export function getGenreAccent(bucket) {
  const [from] = getGenreGradient(bucket);
  return from;
}
