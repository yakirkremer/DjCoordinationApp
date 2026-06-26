import os
import json
import shutil
import time
import argparse
from analyzer import detect_preview_points

BASE_MUSIC_DIR = os.path.join("public", "music")
CATALOG_PATH = os.path.join("public", "data", "catalog.json")

CATEGORIES = ["Israeli", "Loazi", "Mizrahit", "Oldies", "Hip Hop", "Regatton", "Trance", "Techno", "Tomorrowland"]


def init_environment():
    for cat in CATEGORIES:
        os.makedirs(os.path.join(BASE_MUSIC_DIR, cat, "analyzed"), exist_ok=True)
    if not os.path.exists(CATALOG_PATH):
        with open(CATALOG_PATH, "w", encoding="utf-8") as f:
            json.dump([], f)


def track_path(track):
    return os.path.join(BASE_MUSIC_DIR, track["bucket"], "analyzed", track["filename"])


def analyze_track(path):
    start_time, end_time, duration = detect_preview_points(path)
    result = {"startTime": start_time, "endTime": end_time}
    if duration is not None:
        result["duration"] = duration
    return result


def scan_and_ingest():
    init_environment()

    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            catalog = json.load(f)
    except Exception:
        catalog = []

    for track in catalog:
        actual_path = track_path(track)
        track["isMissing"] = not os.path.exists(actual_path)

    existing_filenames = {track["filename"] for track in catalog}
    updated = False

    for category in CATEGORIES:
        category_dir = os.path.join(BASE_MUSIC_DIR, category)
        analyzed_dir = os.path.join(category_dir, "analyzed")
        if not os.path.isdir(category_dir):
            continue

        new_files = [
            f
            for f in os.listdir(category_dir)
            if f.lower().endswith(".mp3") and os.path.isfile(os.path.join(category_dir, f))
        ]

        if not new_files:
            continue

        print(f"📂 נמצאו {len(new_files)} שירים חדשים בקטגוריית [{category}]...")

        for filename in new_files:
            source_path = os.path.join(category_dir, filename)
            dest_path = os.path.join(analyzed_dir, filename)

            if filename in existing_filenames:
                shutil.move(source_path, dest_path)
                continue

            try:
                cues = analyze_track(source_path)

                new_track = {
                    "id": f"track_{int(time.time())}_{len(catalog)}",
                    "title": os.path.splitext(filename)[0],
                    "artist": "עריכת דיג'יי",
                    "bucket": category,
                    "filename": filename,
                    "isMissing": False,
                    **cues,
                }

                shutil.move(source_path, dest_path)
                catalog.append(new_track)
                existing_filenames.add(filename)
                updated = True
                print(f"   [ok] moved to {category}/analyzed/: {filename}")
            except Exception as e:
                print(f"   ❌ שגיאה בעיבוד {filename}: {e}")

    if updated or len(catalog) > 0:
        save_catalog(catalog)
        print("💾 קובץ catalog.json מעודכן ומסונכרן!")


def reanalyze_catalog():
    init_environment()

    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            catalog = json.load(f)
    except Exception:
        print("לא נמצא קטלוג לניתוח מחדש.")
        return

    updated = 0
    for track in catalog:
        path = track_path(track)
        track["isMissing"] = not os.path.exists(path)
        if not os.path.exists(path):
            print(f"   [skip] missing: {track['filename']}")
            continue

        try:
            cues = analyze_track(path)
            track.update(cues)
            updated += 1
            print(f"   [ok] {track['title']}: {cues['startTime']}s-{cues['endTime']}s")
        except Exception as e:
            print(f"   [err] {track['filename']}: {e}")

    save_catalog(catalog)
    print(f"Reanalyze done - updated {updated} tracks.")


def save_catalog(catalog):
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest and analyze DJ pool tracks")
    parser.add_argument(
        "--reanalyze",
        action="store_true",
        help="Recompute preview cue points for all catalog tracks",
    )
    args = parser.parse_args()

    if args.reanalyze:
        reanalyze_catalog()
    else:
        scan_and_ingest()
