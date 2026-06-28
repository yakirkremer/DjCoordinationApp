import { DEFAULT_DROP_TYPE } from "./dropTypes.js";

export function generateVersionId() {
  return `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function withDefaultDrop(drop) {
  const label = String(drop ?? "").trim();
  return label || DEFAULT_DROP_TYPE;
}

export function createVersionFromLegacy(track, partial = {}) {
  return {
    id: partial.id || generateVersionId(),
    drop: withDefaultDrop(partial.drop ?? track?.drop),
    remixer: partial.remixer ?? track?.remixer ?? "",
    filename: partial.filename ?? track?.filename,
    startTime: partial.startTime ?? track?.startTime ?? 30,
    endTime: partial.endTime ?? track?.endTime ?? 90,
    dropboxSourcePath: partial.dropboxSourcePath ?? track?.dropboxSourcePath ?? null,
  };
}

/** Ensure catalog track has a versions[] array (migrates legacy flat tracks). */
export function ensureTrackVersions(track) {
  if (!track) return track;

  if (Array.isArray(track.versions) && track.versions.length > 0) {
    const versions = track.versions.map((v) => ({
      ...v,
      drop: withDefaultDrop(v.drop),
      remixer: v.remixer ?? "",
    }));
    const defaultVersionId = track.defaultVersionId || versions[0].id;
    return syncFlatFromVersions({ ...track, versions, defaultVersionId });
  }

  if (!track.filename) {
    return { ...track, versions: [], defaultVersionId: null, isMissing: true };
  }

  const version = createVersionFromLegacy(track);
  return syncFlatFromVersions({
    ...track,
    versions: [version],
    defaultVersionId: version.id,
  });
}

export function getTrackVersion(track, versionId) {
  const normalized = ensureTrackVersions(track);
  const id = versionId || normalized.activeVersionId || normalized.defaultVersionId;
  return normalized.versions.find((v) => v.id === id) || normalized.versions[0] || null;
}

export function syncFlatFromVersions(track, activeVersionId) {
  const versions = track.versions || [];
  const activeId = activeVersionId || track.activeVersionId || track.defaultVersionId || versions[0]?.id;
  const active = versions.find((v) => v.id === activeId) || versions[0];
  const anyAvailable = versions.some((v) => v.isMissing !== true);

  if (!active) {
    return { ...track, activeVersionId: activeId ?? null, isMissing: true };
  }

  return {
    ...track,
    activeVersionId: active.id,
    filename: active.filename,
    startTime: active.startTime ?? 30,
    endTime: active.endTime ?? 90,
    drop: active.drop,
    remixer: active.remixer,
    dropboxSourcePath: active.dropboxSourcePath ?? null,
    isMissing: active.isMissing === true ? true : !anyAvailable && versions.length > 0,
  };
}

export function applyActiveVersion(track, versionId) {
  return syncFlatFromVersions(ensureTrackVersions(track), versionId);
}

export function getVersionLabel(version, index = 0, locale = "he") {
  if (version?.drop?.trim()) return version.drop.trim();
  if (locale === "en") return index === 0 ? "Original" : `Version ${index + 1}`;
  return index === 0 ? "מקור" : `גרסה ${index + 1}`;
}

export function hasMultipleVersions(track) {
  return ensureTrackVersions(track).versions.length > 1;
}

export function reorderTrackVersions(track, versionOrder) {
  const normalized = ensureTrackVersions(track);
  const existingIds = normalized.versions.map((v) => v.id);
  if (versionOrder.length !== existingIds.length) {
    throw new Error("versionOrder must include every version");
  }
  const idSet = new Set(existingIds);
  for (const id of versionOrder) {
    if (!idSet.has(id)) throw new Error("Invalid version id in versionOrder");
  }
  const byId = Object.fromEntries(normalized.versions.map((v) => [v.id, v]));
  return syncFlatFromVersions({
    ...normalized,
    versions: versionOrder.map((id) => byId[id]),
    defaultVersionId: versionOrder[0],
  });
}

export function stripTrackForCatalogSave(track) {
  const { isMissing, activeVersionId, audioVersion, ...rest } = track;
  const versions = (rest.versions || []).map(({ isMissing: _missing, ...version }) => version);
  const out = { ...rest, versions };
  delete out.filename;
  delete out.startTime;
  delete out.endTime;
  delete out.drop;
  delete out.remixer;
  delete out.dropboxSourcePath;
  if (versions.length > 0) {
    out.defaultVersionId = versions[0].id;
  }
  return out;
}
