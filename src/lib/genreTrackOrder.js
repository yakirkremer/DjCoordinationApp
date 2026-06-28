function normKey(name) {
  return String(name ?? "").trim().toLowerCase();
}

/** Find saved order key matching genre name (case-insensitive). */
export function resolveGenreOrderKey(genre, genreTrackOrders = {}) {
  if (!genre) return null;
  if (Array.isArray(genreTrackOrders[genre])) return genre;
  const key = normKey(genre);
  const match = Object.keys(genreTrackOrders).find((k) => normKey(k) === key);
  return match ?? genre;
}

export function getGenreTrackOrder(genre, genreTrackOrders = {}) {
  const key = resolveGenreOrderKey(genre, genreTrackOrders);
  const list = genreTrackOrders[key];
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

/** Sort tracks in a genre folder by saved order, then title. */
export function sortTracksInGenre(tracks, genre, genreTrackOrders = {}) {
  const order = getGenreTrackOrder(genre, genreTrackOrders);
  if (!order.length) {
    return [...tracks].sort((a, b) => (a.title || "").localeCompare(b.title || "", "he"));
  }

  const orderIndex = Object.fromEntries(order.map((id, index) => [id, index]));
  return [...tracks].sort((a, b) => {
    const ai = orderIndex[a.id];
    const bi = orderIndex[b.id];
    if (ai !== undefined && bi !== undefined && ai !== bi) return ai - bi;
    if (ai !== undefined && bi === undefined) return -1;
    if (ai === undefined && bi !== undefined) return 1;
    return (a.title || "").localeCompare(b.title || "", "he");
  });
}

/** Reorder track ids: move draggedId to the position of targetId. */
export function reorderTrackIds(order, draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return order;
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, draggedId);
  return next;
}

/** Build order list for a genre from current bucket tracks + saved order. */
export function buildGenreOrderList(tracks, genre, genreTrackOrders = {}) {
  const genreKey = normKey(genre);
  const bucketTracks = tracks.filter((t) => normKey(t.bucket) === genreKey);
  const saved = getGenreTrackOrder(genre, genreTrackOrders);
  const byId = Object.fromEntries(bucketTracks.map((t) => [t.id, t]));

  const ordered = saved.filter((id) => byId[id]).map((id) => id);
  const rest = bucketTracks
    .filter((t) => !ordered.includes(t.id))
    .sort((a, b) => (a.title || "").localeCompare(b.title || "", "he"))
    .map((t) => t.id);

  return [...ordered, ...rest];
}

export function normalizeGenreTrackOrders(genreTrackOrders, tracks = []) {
  if (!genreTrackOrders || typeof genreTrackOrders !== "object") return {};
  const validIds = new Set(tracks.map((t) => t.id));
  const out = {};

  for (const [genre, list] of Object.entries(genreTrackOrders)) {
    if (!Array.isArray(list)) continue;
    const cleaned = list.filter((id) => validIds.has(id));
    if (cleaned.length > 0) out[genre] = cleaned;
  }

  return out;
}
