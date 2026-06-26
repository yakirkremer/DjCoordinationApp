import numpy as np
import librosa

PREVIEW_LENGTH = 60
LEAD_IN = 12
MIN_START = 8
SKIP_INTRO = 12
SEARCH_END_RATIO = 0.88
MIN_PREVIEW = 30
HOP_LENGTH = 512


def _frame_time(n_frames, sr):
    return librosa.frames_to_time(np.arange(n_frames), sr=sr, hop_length=HOP_LENGTH)


def detect_preview_points(file_path, preview_length=PREVIEW_LENGTH):
    """
    Pick a preview window around the strongest sustained chorus / hook / drop.
    Uses RMS loudness + onset strength, sliding-window scoring, and build-up bonus.
    Returns (start_time, end_time, duration_seconds).
    """
    try:
        y, sr = librosa.load(file_path, sr=22050, mono=True)
        duration = float(librosa.get_duration(y=y, sr=sr))
        if duration <= 0:
            return _fallback_preview(0)

        if duration <= MIN_PREVIEW + MIN_START:
            return 0, int(duration), int(duration)

        rms = librosa.feature.rms(y=y, hop_length=HOP_LENGTH)[0]
        onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP_LENGTH)
        n = min(len(rms), len(onset))
        rms = rms[:n]
        onset = onset[:n]
        times = _frame_time(n, sr)

        rms_n = (rms - rms.min()) / (rms.max() - rms.min() + 1e-8)
        onset_n = (onset - onset.min()) / (onset.max() - onset.min() + 1e-8)
        combined = 0.72 * rms_n + 0.28 * onset_n

        search_start_t = min(SKIP_INTRO, duration * 0.08)
        search_end_t = duration * SEARCH_END_RATIO
        start_idx = next((i for i, t in enumerate(times) if t >= search_start_t), 0)
        end_idx = next((i for i in range(n - 1, -1, -1) if times[i] <= search_end_t), n - 1)

        window_frames = max(8, int(preview_length * sr / HOP_LENGTH))
        half_window = window_frames // 2
        rise_frames = max(4, int(4 * sr / HOP_LENGTH))

        best_score = -1.0
        best_center = start_idx + max(0, (end_idx - start_idx) // 2)

        lo_center = start_idx + half_window
        hi_center = max(lo_center, end_idx - half_window)

        for center in range(lo_center, hi_center + 1):
            lo = max(0, center - half_window)
            hi = min(n, center + half_window)
            if hi - lo < half_window // 2:
                continue

            window_score = float(np.mean(combined[lo:hi]))

            pre_lo = max(0, lo - rise_frames)
            rise = float(np.mean(combined[lo:hi]) - np.mean(combined[pre_lo:lo]))
            window_score += max(0.0, rise) * 0.2

            post_hi = min(n, hi + rise_frames)
            fall = float(np.mean(combined[lo:hi]) - np.mean(combined[hi:post_hi]))
            window_score += max(0.0, fall) * 0.05

            position = times[center] / duration
            if 0.2 <= position <= 0.7:
                window_score += 0.04

            if window_score > best_score:
                best_score = window_score
                best_center = center

        center_time = float(times[best_center])
        start_time = max(MIN_START, int(center_time - LEAD_IN))
        end_time = int(start_time + preview_length)

        if end_time > duration - 1:
            end_time = max(int(duration) - 1, start_time + MIN_PREVIEW)
            start_time = max(MIN_START, end_time - preview_length)

        start_time = int(max(0, min(start_time, duration - MIN_PREVIEW)))
        end_time = int(max(start_time + MIN_PREVIEW, min(end_time, duration)))

        print(
            f"[preview] peak ~{int(center_time)}s / {int(duration)}s "
            f"-> cue {start_time}s-{end_time}s (score {best_score:.3f})"
        )
        return start_time, end_time, int(duration)

    except Exception as e:
        print(f"[preview failed] {file_path}: {e}. Using fallback 30s-90s")
        return _fallback_preview(None)


def _fallback_preview(duration):
    if duration is not None and duration > 0:
        if duration <= 90:
            return 0, int(duration), int(duration)
        start = min(30, max(0, int(duration * 0.25)))
        end = min(int(duration), start + PREVIEW_LENGTH)
        return start, end, int(duration)
    return 30, 90, None
