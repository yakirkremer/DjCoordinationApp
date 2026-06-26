import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from mutagen import File as MutagenFile
from mutagen.id3 import ID3NoHeaderError

BASE_DIR = Path(__file__).resolve().parent
CATALOG_PATH = BASE_DIR / "data" / "catalog.json"
ARTWORK_DIR = BASE_DIR / "data" / "artwork"
MUSIC_DIR = BASE_DIR / "music"

GENERIC_ARTISTS = {
    "עריכת דיג'יי",
    "dj edit",
    "unknown",
    "various artists",
    "various",
    "unknown artist",
}
EDIT_PATTERN = re.compile(
    r"\s*[\(\[](?:[^)\]]*?(?:edit|remix|mashup|blend|mix|bootleg|version|remaster)[^)\]]*)[\)\]]",
    re.IGNORECASE,
)


def load_catalog():
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_catalog(catalog):
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)


def track_mp3_path(track):
    return MUSIC_DIR / track["bucket"] / "analyzed" / track["filename"]


def artwork_file_path(track_id):
    return ARTWORK_DIR / f"{track_id}.jpg"


def catalog_artwork_url(track_id):
    return f"/data/artwork/{track_id}.jpg"


def is_generic_artist(artist):
    if not artist or not str(artist).strip():
        return True
    return artist.strip().lower() in GENERIC_ARTISTS


def clean_search_text(text):
    if not text:
        return ""
    cleaned = EDIT_PATTERN.sub("", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def split_artist_title(text):
    text = (text or "").strip()
    if not text:
        return "", ""

    if " - " in text:
        left, right = text.split(" - ", 1)
        return left.strip(), right.strip()

    parts = re.split(r"\s+x\s+", text, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()

    return "", text


MASHUP_HINTS = (" mashup", " blend", " vs ", " vs.", " bootleg", " megamix")


def looks_like_mashup(text):
    t = (text or "").lower()
    return any(hint in t for hint in MASHUP_HINTS) or " x " in t


def extract_mashup_credit(text):
    match = re.search(
        r"\(([^)]*(?:mashup|edit|blend|remix|bootleg)[^)]*)\)",
        text or "",
        re.IGNORECASE,
    )
    if not match:
        return ""
    credit = match.group(1).strip()
    credit = re.sub(r"(?i)\b(mashup|edit|blend|remix|bootleg)\b", "", credit).strip(" -")
    return credit


def parse_artist_title(track, mp3_path):
    filename_stem = Path(track.get("filename", "")).stem
    file_artist, file_title = split_artist_title(filename_stem)

    artist = ""
    title = (track.get("title") or "").strip() or filename_stem

    if file_artist:
        artist = file_artist
        title = file_title or title
    else:
        tag_artist = ""
        tag_title = ""
        try:
            audio = MutagenFile(mp3_path, easy=True)
            if audio:
                tag_artist = ((audio.get("artist") or [""])[0] or "").strip()
                tag_title = ((audio.get("title") or [""])[0] or "").strip()
        except Exception:
            pass

        if tag_title:
            title = tag_title
        if tag_artist and not is_generic_artist(tag_artist):
            artist = tag_artist

        if not artist:
            parsed_artist, parsed_title = split_artist_title(title)
            if parsed_artist:
                artist = parsed_artist
                title = parsed_title

        if not artist and looks_like_mashup(title or filename_stem):
            credit = extract_mashup_credit(title) or extract_mashup_credit(filename_stem)
            if credit:
                artist = credit

    return artist.strip(), title.strip()


def should_use_api_artist(artist, title, filename):
    if artist and not is_generic_artist(artist):
        return False
    if looks_like_mashup(title) or looks_like_mashup(filename):
        return False
    return True


def extract_embedded_artwork(mp3_path):
    try:
        audio = MutagenFile(mp3_path)
        if audio is None:
            return None

        if hasattr(audio, "tags") and audio.tags:
            for key in sorted(audio.tags.keys()):
                if str(key).startswith("APIC") or str(key).startswith("PIC"):
                    frame = audio.tags[key]
                    data = getattr(frame, "data", None)
                    if data:
                        return data
    except ID3NoHeaderError:
        pass
    except Exception:
        pass
    return None


def http_get_json(url, timeout=12):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "KramerMusicDJPool/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def download_bytes(url, timeout=15):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "KramerMusicDJPool/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _result_matches_query(item_artist, item_title, artist, title):
    item_artist = (item_artist or "").lower()
    item_title = (item_title or "").lower()
    if not title:
        return True

    title_l = title.lower()
    if title_l in item_title or item_title in title_l:
        return True

    if artist:
        artist_l = artist.lower()
        if artist_l in item_artist or artist_l in item_title:
            return True

    return not artist


def search_itunes(artist, title):
    queries = []
    if artist and title:
        queries.append(f"{artist} {title}")
    if title:
        queries.append(title)
    if artist:
        queries.append(artist)

    for query in queries:
        params = urllib.parse.urlencode(
            {"term": query, "media": "music", "entity": "song", "limit": 5}
        )
        try:
            data = http_get_json(f"https://itunes.apple.com/search?{params}")
        except Exception:
            continue

        for item in data.get("results", []):
            art = item.get("artworkUrl100")
            if not art:
                continue
            item_artist = item.get("artistName") or ""
            item_title = item.get("trackName") or ""
            if not _result_matches_query(item_artist, item_title, artist, title):
                continue
            return {
                "artwork_url": art.replace("100x100bb", "600x600bb").replace("100x100", "600x600"),
                "artist": item_artist.strip(),
                "title": item_title.strip(),
                "source": "itunes",
            }
    return None


def search_deezer(artist, title):
    queries = []
    if artist and title:
        queries.append(f'artist:"{artist}" track:"{title}"')
        queries.append(f"{artist} {title}")
    if title:
        queries.append(title)

    for query in queries:
        params = urllib.parse.urlencode({"q": query, "limit": 5})
        try:
            data = http_get_json(f"https://api.deezer.com/search?{params}")
        except Exception:
            continue

        for item in data.get("data", []):
            album = item.get("album") or {}
            art = album.get("cover_big") or album.get("cover_medium")
            if not art:
                continue
            item_artist = (item.get("artist") or {}).get("name") or ""
            item_title = item.get("title") or ""
            if not _result_matches_query(item_artist, item_title, artist, title):
                continue
            return {
                "artwork_url": art,
                "artist": item_artist.strip(),
                "title": item_title.strip(),
                "source": "deezer",
            }
    return None


def find_online_match(artist, title):
    match = search_itunes(artist, title)
    if match:
        return match
    return search_deezer(artist, title)


def save_artwork_bytes(data, dest_path):
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(data)
    return True


def apply_metadata_fix(track, artist, title, api_match=None):
    changes = []
    filename_stem = Path(track.get("filename", "")).stem
    file_artist, _ = split_artist_title(filename_stem)

    resolved_artist = artist
    if (
        not file_artist
        and should_use_api_artist(resolved_artist, title, filename_stem)
        and api_match
    ):
        api_artist = (api_match.get("artist") or "").strip()
        if api_artist and not is_generic_artist(api_artist):
            resolved_artist = api_artist

    if resolved_artist and not is_generic_artist(resolved_artist):
        if track.get("artist") != resolved_artist:
            track["artist"] = resolved_artist
            changes.append("artist")
    elif looks_like_mashup(title or filename_stem):
        credit = extract_mashup_credit(title) or extract_mashup_credit(filename_stem)
        if credit and track.get("artist") != credit:
            track["artist"] = credit
            changes.append("artist")
        elif not is_generic_artist(track.get("artist")):
            track["artist"] = "עריכת דיג'יי"
            changes.append("artist")

    resolved_title = title
    current_title = (track.get("title") or "").strip()

    if resolved_title and resolved_title != current_title:
        track["title"] = resolved_title
        changes.append("title")

    return changes


def process_track(track, force=False):
    track_id = track["id"]
    dest = artwork_file_path(track_id)
    catalog_url = catalog_artwork_url(track_id)
    mp3_path = track_mp3_path(track)

    if not mp3_path.exists():
        return "missing", [], None

    artist, title = parse_artist_title(track, mp3_path)
    search_artist = clean_search_text(artist)
    search_title = clean_search_text(title)
    api_match = find_online_match(search_artist, search_title) if search_title else None

    meta_changes = apply_metadata_fix(track, artist, title, api_match=api_match)

    artwork_status = None
    needs_artwork = force or not track.get("artwork") or not dest.exists()

    if needs_artwork:
        embedded = extract_embedded_artwork(mp3_path)
        if embedded:
            save_artwork_bytes(embedded, dest)
            track["artwork"] = catalog_url
            artwork_status = "embedded"
        elif api_match:
            try:
                image_data = download_bytes(api_match["artwork_url"])
                if len(image_data) >= 500:
                    save_artwork_bytes(image_data, dest)
                    track["artwork"] = catalog_url
                    artwork_status = api_match["source"]
            except Exception:
                artwork_status = "error"
        else:
            artwork_status = "not-found" if search_title else "no-meta"
    else:
        artwork_status = "skip"

    return artwork_status, meta_changes, catalog_url if track.get("artwork") else None


def run_fetch_artwork(force=False, sleep_seconds=0.2):
    ARTWORK_DIR.mkdir(parents=True, exist_ok=True)
    catalog = load_catalog()
    stats = {
        "embedded": 0,
        "itunes": 0,
        "deezer": 0,
        "skip": 0,
        "missing": 0,
        "not-found": 0,
        "no-meta": 0,
        "error": 0,
        "metadata": 0,
    }

    for track in catalog:
        status, meta_changes, url = process_track(track, force=force)
        stats[status] = stats.get(status, 0) + 1
        if meta_changes:
            stats["metadata"] += 1

        meta_note = f" | meta: {', '.join(meta_changes)}" if meta_changes else ""
        artist_label = track.get("artist", "?")
        title_label = track.get("title", "?")

        if status in ("embedded", "itunes", "deezer"):
            print(f"[{status}] {artist_label} - {title_label} -> {url}{meta_note}")
        elif status == "skip":
            print(f"[skip] {artist_label} - {title_label}{meta_note}")
        elif status == "missing":
            print(f"[missing] {track['filename']}")
        else:
            print(f"[{status}] {artist_label} - {title_label}{meta_note}")

        if sleep_seconds and status in ("itunes", "deezer"):
            time.sleep(sleep_seconds)

    save_catalog(catalog)
    print(
        "Done. "
        f"metadata={stats.get('metadata', 0)}, "
        f"embedded={stats.get('embedded', 0)}, "
        f"itunes={stats.get('itunes', 0)}, "
        f"deezer={stats.get('deezer', 0)}, "
        f"skip={stats.get('skip', 0)}, "
        f"not-found={stats.get('not-found', 0)}"
    )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Fetch artwork and fix artist/title metadata in catalog.json"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download artwork even when a file already exists",
    )
    args = parser.parse_args()
    run_fetch_artwork(force=args.force)
