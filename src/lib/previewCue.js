export const DEFAULT_PREVIEW_LENGTH = 60;
export const MIN_PREVIEW_LENGTH = 30;

export function normalizePreviewCue(track) {
  const duration = Number(track.duration) > 0 ? Number(track.duration) : null;
  let startTime = Math.max(0, Number(track.startTime) || 0);
  let endTime = Number(track.endTime);

  if (!Number.isFinite(endTime) || endTime <= startTime) {
    endTime = startTime + DEFAULT_PREVIEW_LENGTH;
  }

  if (duration) {
    if (startTime >= duration - MIN_PREVIEW_LENGTH) {
      startTime = Math.max(0, Math.floor(duration * 0.28));
    }
    endTime = Math.min(duration, endTime);
    if (endTime - startTime < MIN_PREVIEW_LENGTH) {
      endTime = Math.min(duration, startTime + DEFAULT_PREVIEW_LENGTH);
      if (endTime - startTime < MIN_PREVIEW_LENGTH) {
        startTime = Math.max(0, endTime - MIN_PREVIEW_LENGTH);
      }
    }
  }

  return {
    ...track,
    startTime: Math.floor(startTime),
    endTime: Math.floor(endTime),
    duration: duration ?? track.duration,
  };
}

export function getPreviewLength(track) {
  const { startTime, endTime } = normalizePreviewCue(track);
  return Math.max(0, endTime - startTime);
}

export function isWithinPreviewCue(track, time) {
  const { startTime, endTime } = normalizePreviewCue(track);
  return time >= startTime && time < endTime;
}

/** Move start or end while keeping a fixed preview span (linked cue drag). */
export function computeLinkedCue(which, time, span, duration) {
  const dur = Math.floor(Number(duration)) || 0;
  if (dur <= 0) return null;

  const lockedSpan = Math.max(MIN_PREVIEW_LENGTH, Math.floor(span));
  const t = Math.floor(Number(time)) || 0;

  if (which === "start") {
    const maxStart = Math.max(0, dur - lockedSpan);
    const startTime = Math.max(0, Math.min(t, maxStart));
    return { startTime, endTime: startTime + lockedSpan };
  }

  const endTime = Math.max(lockedSpan, Math.min(t, dur));
  return { startTime: endTime - lockedSpan, endTime };
}
