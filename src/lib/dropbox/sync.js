import { OFFICIAL_CATEGORIES } from "../categories";
import { analyzeDropboxTrack } from "./analyze";
import { parseDropboxApiError } from "./api";

function normalizeRoot(path) {
  if (!path || path === "/") return "";
  const trimmed = path.replace(/\/+$/, "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function genreFolderPaths(root, bucket) {
  const base = root ? `${root}/${bucket}` : `/${bucket}`;
  return [base, `${base}/analyzed`];
}

function hashPath(path) {
  let h = 0;
  for (let i = 0; i < path.length; i++) {
    h = (h << 5) - h + path.charCodeAt(i);
    h |= 0;
  }
  return `dropbox_${Math.abs(h)}`;
}

function parseArtistFromFilename(name) {
  const base = name.replace(/\.mp3$/i, "");
  const parts = base.split(" - ");
  if (parts.length >= 2) {
    return { title: parts.slice(1).join(" - ").trim(), artist: parts[0].trim() };
  }
  return { title: base, artist: "עריכת דיג'יי" };
}

function isDirectMp3(entry) {
  return entry[".tag"] === "file" && entry.name.toLowerCase().endsWith(".mp3");
}

function findExisting(existingByPath, existingByKey, dropboxPath, bucket, filename) {
  return (
    existingByPath.get(dropboxPath) ??
    existingByKey.get(`${bucket}/${filename}`) ??
    null
  );
}

function formatDiagnostics(diagnostics) {
  const lines = [];
  lines.push(`Root: ${diagnostics.rootLabel}`);

  if (diagnostics.rootContents?.length) {
    lines.push(`בתיקיית השורש: ${diagnostics.rootContents.join(", ")}`);
  } else if (diagnostics.rootError) {
    lines.push(`שגיאת שורש: ${diagnostics.rootError}`);
  }

  const withMp3 = diagnostics.folderScans.filter((f) => f.mp3Count > 0);
  const withError = diagnostics.folderScans.filter((f) => f.error);

  if (withMp3.length) {
    for (const scan of withMp3) {
      lines.push(`✓ ${scan.path} — ${scan.mp3Count} MP3`);
    }
  }

  if (!withMp3.length && withError.length) {
    lines.push("לא נמצאו MP3 באף תיקיית ז'אנר. דוגמאות לנתיבים שנבדקו:");
    for (const scan of withError.slice(0, 3)) {
      lines.push(`✗ ${scan.path} — ${scan.error}`);
    }
  }

  if (!withMp3.length) {
    lines.push(
      "טיפ: אם יצרת אפליקציית App folder ב-Dropbox, השאר ROOT ריק או /. שים קבצים ב-Techno/song.mp3 בתוך תיקיית האפליקציה."
    );
  }

  return lines.join("\n");
}

export async function syncCatalogFromDropbox(
  client,
  rootPath,
  existingTracks = [],
  { onProgress } = {}
) {
  const root = normalizeRoot(rootPath);
  const rootLabel = root || "(app folder root)";
  const existingByPath = new Map();
  const existingByKey = new Map();

  for (const track of existingTracks) {
    if (track.dropboxPath) existingByPath.set(track.dropboxPath, track);
    existingByKey.set(`${track.bucket}/${track.filename}`, track);
  }

  const diagnostics = {
    rootLabel,
    rootContents: [],
    rootError: null,
    folderScans: [],
  };

  try {
    const rootEntries = await client.listFolder(root || "");
    diagnostics.rootContents = rootEntries
      .filter((e) => e[".tag"] === "folder" || e[".tag"] === "file")
      .map((e) => (e[".tag"] === "folder" ? `${e.name}/` : e.name));
  } catch (err) {
    diagnostics.rootError = parseDropboxApiError(err.message);
  }

  const seenPaths = new Set();
  const pending = [];

  for (const bucket of OFFICIAL_CATEGORIES) {
    for (const folderPath of genreFolderPaths(root, bucket)) {
      let entries;
      try {
        entries = await client.listFolder(folderPath);
        const mp3s = entries.filter(isDirectMp3);
        diagnostics.folderScans.push({
          path: folderPath,
          mp3Count: mp3s.length,
          error: null,
        });

        for (const entry of mp3s) {
          const dropboxPath = entry.path_display || entry.path_lower;
          if (seenPaths.has(dropboxPath)) continue;
          seenPaths.add(dropboxPath);

          const existing = findExisting(
            existingByPath,
            existingByKey,
            dropboxPath,
            bucket,
            entry.name
          );

          pending.push({ entry, bucket, dropboxPath, existing });
        }
      } catch (err) {
        diagnostics.folderScans.push({
          path: folderPath,
          mp3Count: 0,
          error: parseDropboxApiError(err.message),
        });
      }
    }
  }

  const tracks = [];
  let analyzedCount = 0;
  let analyzeFailedCount = 0;
  const accessToken = await client.getAccessToken();

  for (let i = 0; i < pending.length; i++) {
    const { entry, bucket, dropboxPath, existing } = pending[i];
    const parsed = parseArtistFromFilename(entry.name);

    if (existing) {
      onProgress?.({
        phase: "skip",
        current: i + 1,
        total: pending.length,
        filename: entry.name,
      });

      tracks.push({
        ...existing,
        bucket,
        filename: entry.name,
        dropboxPath,
        source: "dropbox",
        isMissing: false,
      });
      continue;
    }

    onProgress?.({
      phase: "analyze",
      current: i + 1,
      total: pending.length,
      filename: entry.name,
    });

    let cues = { startTime: 0, endTime: 60 };
    try {
      cues = await analyzeDropboxTrack(dropboxPath, accessToken);
      analyzedCount += 1;
    } catch (err) {
      analyzeFailedCount += 1;
      console.warn(`Analyze failed for ${entry.name}:`, err);
      onProgress?.({
        phase: "analyze-failed",
        current: i + 1,
        total: pending.length,
        filename: entry.name,
        error: err.message,
      });
    }

    tracks.push({
      id: hashPath(dropboxPath),
      title: parsed.title,
      artist: parsed.artist,
      bucket,
      filename: entry.name,
      dropboxPath,
      source: "dropbox",
      startTime: cues.startTime ?? 0,
      endTime: cues.endTime ?? 60,
      duration: cues.duration,
      isMissing: false,
    });
  }

  return {
    tracks,
    analyzedCount,
    analyzeFailedCount,
    totalFound: pending.length,
    diagnostics,
    diagnosticsMessage: formatDiagnostics(diagnostics),
  };
}
