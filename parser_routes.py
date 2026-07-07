from __future__ import annotations

import json
import re
import zipfile
from io import BytesIO
from pathlib import Path

from flask import Blueprint, current_app, jsonify, render_template, request, send_file

from title_parser import normalize_reparse_order, parse_title, VALID_REPARSE_PARTS
from hebrew_transliterate import (
    collect_unknown_hebrew,
    format_unknown_hebrew_for_gemini,
    load_curated_map,
)
from playlist import load_playlist, load_playlist_from_bytes
from playlist import resolve_location
from track_db import (
    DEFAULT_DB_PATH,
    add_artist_to_english_names,
    add_manual_playlist_match,
    apply_file_titles_to_tracks,
    apply_onelibrary_titles_from_tracks,
    apply_playlist_filter,
    clear_playlist_filter,
    create_database,
    database_info,
    db_stats,
    fill_artists_to_english,
    fill_english_names_from_hebrew,
    get_active_db_path,
    get_playlist_filter_ids,
    get_manual_matches,
    get_connection,
    get_source_xml_path,
    get_tracks_by_ids,
    get_unmatched_playlist_tracks,
    import_rekordbox_xml,
    import_rekordbox_xml_bytes,
    import_rekordbox_device_library,
    list_tracks,
    location_title_map_for_tracks,
    normalize_db_path,
    playlist_filter_status,
    remove_manual_playlist_match,
    set_active_db_path,
    update_track,
)
from xml_export import export_rekordbox_xml_with_titles

parser_bp = Blueprint("parser", __name__)
ONELIBRARY_COPY_DIR = (Path(__file__).resolve().parent / "data" / "onelibrary_copies").resolve()


def _reparse_order_from_data(data: dict) -> list[str]:
    raw = data.get("order")
    if isinstance(raw, list):
        return normalize_reparse_order([str(part) for part in raw])
    return normalize_reparse_order(None)


@parser_bp.app_context_processor
def inject_parser_config():
    return {
        "url_prefix": current_app.config.get("PARSER_URL_PREFIX", ""),
        "default_xml_path": "",
        "default_playlist_path": "",
        "db_path": str(get_active_db_path()),
    }


@parser_bp.get("/")
def parser_index():
    return render_template("parser.html")


@parser_bp.post("/api/parse-demo")
def api_parse_demo():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Enter a title to parse."}), 400

    parsed = parse_title(title)
    order = _reparse_order_from_data(data)
    return jsonify(parsed.to_dict(order))


@parser_bp.post("/api/parse-playlist")
def api_parse_playlist():
    upload = request.files.get("file")
    if upload and upload.filename:
        order_raw = request.form.get("order", "")
        try:
            order_data = json.loads(order_raw) if order_raw else {}
        except json.JSONDecodeError:
            order_data = {}
        order = _reparse_order_from_data(order_data)
        try:
            playlist_tracks = load_playlist_from_bytes(upload.read())
        except Exception as exc:
            return jsonify({"error": f"Could not read playlist: {exc}"}), 400
        source = upload.filename
    else:
        data = request.get_json(silent=True) or {}
        order = _reparse_order_from_data(data)
        path_str = (data.get("path") or "").strip()
        if not path_str:
            return jsonify({"error": "Playlist path is required."}), 400

        path = Path(path_str).expanduser()
        if not path.is_file():
            return jsonify({"error": f"Playlist file not found: {path}"}), 404

        try:
            playlist_tracks = load_playlist(path)
        except Exception as exc:
            return jsonify({"error": f"Could not read playlist: {exc}"}), 400
        source = str(path)

    results = []
    for track in playlist_tracks:
        title = track.track_title.strip()
        if not title:
            continue
        parsed = parse_title(title)
        row = {
            "row_number": track.row_number,
            "track_title": title,
            **parsed.to_dict(order),
        }
        results.append(row)

    return jsonify(
        {
            "source": source,
            "total": len(playlist_tracks),
            "parsed": len(results),
            "tracks": results,
        }
    )


@parser_bp.post("/api/import-xml")
def api_import_xml():
    upload = request.files.get("file")
    create_db = False
    if upload and upload.filename:
        create_db = request.form.get("create_db") == "1"
        parse_from_filename = request.form.get("parse_from_filename") == "1"
        if create_db:
            try:
                create_database(f"data/{Path(upload.filename).stem}.db")
            except FileExistsError as exc:
                return jsonify({"error": str(exc)}), 409
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
        try:
            result = import_rekordbox_xml_bytes(
                upload.read(), upload.filename, parse_from_filename=parse_from_filename
            )
        except Exception as exc:
            return jsonify({"error": f"Could not import XML: {exc}"}), 400
        result["database"] = database_info()
        return jsonify(result)

    data = request.get_json(silent=True) or {}
    path_str = (data.get("path") or "").strip()
    if not path_str:
        return jsonify({"error": "XML path is required."}), 400

    path = Path(path_str).expanduser()
    if not path.is_file():
        return jsonify({"error": f"XML file not found: {path}"}), 404

    parse_from_filename = bool(data.get("parse_from_filename"))

    if data.get("create_db"):
        try:
            create_database(f"data/{path.stem}.db")
        except FileExistsError as exc:
            return jsonify({"error": str(exc)}), 409
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    try:
        result = import_rekordbox_xml(path, parse_from_filename=parse_from_filename)
    except Exception as exc:
        return jsonify({"error": f"Could not import XML: {exc}"}), 400

    result["database"] = database_info()
    return jsonify(result)


@parser_bp.post("/api/import-rekordbox-db")
def api_import_rekordbox_db():
    data = request.get_json(silent=True) or {}
    path_str = (data.get("path") or "").strip()
    if not path_str:
        return jsonify({"error": "Rekordbox DB/PDB path is required."}), 400

    path = Path(path_str).expanduser()
    if not path.is_file():
        return jsonify({"error": f"File not found: {path}"}), 404
    if path.suffix.lower() not in {".db", ".pdb", ".dat", ".sync"}:
        return jsonify({"error": "Supported file types: .db, .pdb, .dat, .sync"}), 400

    if data.get("create_db"):
        try:
            create_database(f"data/{path.stem}.db")
        except FileExistsError as exc:
            return jsonify({"error": str(exc)}), 409
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

    try:
        result = import_rekordbox_device_library(path)
    except Exception as exc:
        return jsonify({"error": f"Could not import Rekordbox DB/PDB: {exc}"}), 400

    result["database"] = database_info()
    return jsonify(result)


@parser_bp.get("/api/database")
def api_database_info():
    return jsonify(database_info())


@parser_bp.post("/api/database/load")
def api_database_load():
    data = request.get_json(silent=True) or {}
    path_str = (data.get("path") or "").strip()
    if not path_str:
        return jsonify({"error": "Database path is required."}), 400
    try:
        db_path = set_active_db_path(normalize_db_path(path_str))
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 404
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(database_info(db_path))


@parser_bp.post("/api/database/create")
def api_database_create():
    data = request.get_json(silent=True) or {}
    path_str = (data.get("path") or "").strip()
    if not path_str:
        return jsonify({"error": "Database path is required."}), 400
    try:
        db_path = create_database(path_str)
    except FileExistsError as exc:
        return jsonify({"error": str(exc)}), 409
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(database_info(db_path))


@parser_bp.post("/api/database/upload")
def api_database_upload():
    from track_db import DEFAULT_DATA_DIR

    upload = request.files.get("file")
    if not upload or not upload.filename:
        return jsonify({"error": "Database file is required."}), 400
    if not upload.filename.lower().endswith(".db"):
        return jsonify({"error": "File must be a .db database."}), 400

    DEFAULT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DEFAULT_DATA_DIR / Path(upload.filename).name
    if dest.exists():
        stem = dest.stem
        counter = 2
        while dest.exists():
            dest = DEFAULT_DATA_DIR / f"{stem}-{counter}.db"
            counter += 1

    upload.save(dest)
    try:
        db_path = set_active_db_path(dest)
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(database_info(db_path))


def _parse_track_ids(data: dict) -> list[int]:
    raw_ids = data.get("ids") or []
    if not isinstance(raw_ids, list):
        raise ValueError("ids must be a list.")
    ids: list[int] = []
    for value in raw_ids:
        try:
            ids.append(int(value))
        except (TypeError, ValueError):
            continue
    return ids


def _action_track_ids(data: dict) -> list[int]:
    ids = _parse_track_ids(data)
    filter_ids = get_playlist_filter_ids()
    filter_active = bool(filter_ids)
    if ids:
        if filter_active:
            allowed = set(filter_ids)
            ids = [track_id for track_id in ids if track_id in allowed]
        return ids
    if filter_active or data.get("use_playlist_filter"):
        return filter_ids
    return []


def _hebrew_names_for_export(data: dict | None = None) -> list[str]:
    data = data or {}
    try:
        track_ids = _action_track_ids(data)
    except ValueError:
        track_ids = []

    if track_ids:
        return [
            track.hebrew_name
            for track in get_tracks_by_ids(track_ids)
            if (track.hebrew_name or "").strip()
        ]

    from track_db import get_connection

    with get_connection() as conn:
        rows = conn.execute(
            "SELECT hebrew_name FROM tracks WHERE hebrew_name != '' ORDER BY id"
        ).fetchall()
    return [row["hebrew_name"] for row in rows]


def _unknown_hebrew_payload(hebrew_names: list[str]) -> dict:
    curated = load_curated_map()
    stats = collect_unknown_hebrew(hebrew_names, curated)
    return {
        "tracks_scanned": len(hebrew_names),
        "map_entries": len(curated),
        "unknown_word_count": len(stats["words"]),
        "unknown_phrase_count": len(stats["phrases"]),
        **stats,
    }


def _slugify_track_id(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (text or "").strip().lower()).strip("-")
    return slug or "track"


def _unique_track_id(base_id: str, seen: dict[str, int]) -> str:
    count = seen.get(base_id, 0) + 1
    seen[base_id] = count
    if count == 1:
        return base_id
    return f"{base_id}-{count}"


def _track_export_payload(tracks: list) -> dict:
    seen_ids: dict[str, int] = {}
    items: list[dict] = []
    for track in tracks:
        base_name = Path(track.file_name or track.location or "").name
        title = (track.xml_title or track.english_name or Path(base_name).stem or "").strip()
        track_id = _unique_track_id(
            _slugify_track_id(track.english_name or title or base_name),
            seen_ids,
        )
        file_name = Path(base_name).name
        items.append(
            {
                "trackId": track_id,
                "title": title,
                "artist": (track.artist or "").strip(),
                "genre": "",
                "versions": [
                    {
                        "dropType": "Default",
                        "file": f"audio/{file_name}",
                        "startCue": None,
                        "endCue": None,
                    }
                ],
            }
        )
    return {"tracks": items}


def _first_non_empty(row: dict, keys: list[str]) -> str:
    for key in keys:
        value = row.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _cue_value(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def _normalize_version_item(item: dict, default_file: str = "") -> dict:
    drop_type = (
        str(item.get("dropType") or item.get("drop_type") or item.get("type") or "").strip()
        or "Default"
    )
    file_path = str(item.get("file") or item.get("path") or item.get("audio") or "").strip() or default_file
    start_cue = _cue_value(item.get("startCue") if "startCue" in item else item.get("start_cue"))
    end_cue = _cue_value(item.get("endCue") if "endCue" in item else item.get("end_cue"))
    return {
        "dropType": drop_type,
        "file": file_path,
        "startCue": start_cue,
        "endCue": end_cue,
    }


def _extract_versions_from_row(row: dict, default_file: str) -> list[dict]:
    raw_versions = row.get("versions")
    if isinstance(raw_versions, str) and raw_versions.strip():
        try:
            parsed = json.loads(raw_versions)
            if isinstance(parsed, list):
                versions = [
                    _normalize_version_item(item, default_file)
                    for item in parsed
                    if isinstance(item, dict)
                ]
                if versions:
                    return versions
        except json.JSONDecodeError:
            pass
    if isinstance(raw_versions, list):
        versions = [
            _normalize_version_item(item, default_file)
            for item in raw_versions
            if isinstance(item, dict)
        ]
        if versions:
            return versions

    versions: list[dict] = []
    for index in range(1, 9):
        drop_type = _first_non_empty(
            row,
            [
                f"drop_type_{index}",
                f"drop{index}_type",
                f"version_{index}_drop_type",
                f"dropType{index}",
            ],
        )
        file_path = _first_non_empty(
            row,
            [
                f"file_{index}",
                f"drop{index}_file",
                f"version_{index}_file",
                f"audio_file_{index}",
            ],
        )
        start_raw = _first_non_empty(
            row,
            [
                f"start_cue_{index}",
                f"drop{index}_start_cue",
                f"preview_start_{index}",
                f"start_{index}",
            ],
        )
        end_raw = _first_non_empty(
            row,
            [
                f"end_cue_{index}",
                f"drop{index}_end_cue",
                f"preview_end_{index}",
                f"end_{index}",
            ],
        )
        if not (drop_type or file_path or start_raw or end_raw):
            continue
        versions.append(
            {
                "dropType": drop_type or "Default",
                "file": file_path or default_file,
                "startCue": _cue_value(start_raw),
                "endCue": _cue_value(end_raw),
            }
        )

    if versions:
        return versions

    start_fallback = _cue_value(
        _first_non_empty(
            row,
            ["start_cue", "preview_start", "start"],
        )
    )
    end_fallback = _cue_value(
        _first_non_empty(
            row,
            ["end_cue", "preview_end", "end"],
        )
    )
    drop_type_fallback = _first_non_empty(row, ["drop_type", "dropType", "version_type"]) or "Default"
    file_fallback = _first_non_empty(row, ["file", "audio_file", "file_path"]) or default_file
    return [
        {
            "dropType": drop_type_fallback,
            "file": file_fallback,
            "startCue": start_fallback,
            "endCue": end_fallback,
        }
    ]


def _export_rows_for_ids(track_ids: list[int]) -> list[dict]:
    if not track_ids:
        return []
    placeholders = ",".join("?" for _ in track_ids)
    with get_connection() as conn:
        rows = conn.execute(
            f"SELECT * FROM tracks WHERE id IN ({placeholders}) ORDER BY id",
            track_ids,
        ).fetchall()
    return [dict(row) for row in rows]


def _site_tracks_payload_from_rows(rows: list[dict]) -> tuple[dict, dict[int, list[str]]]:
    seen_ids: dict[str, int] = {}
    tracks: list[dict] = []
    sources_by_id: dict[int, list[str]] = {}
    for row in rows:
        track_pk = int(row.get("id") or 0)
        file_name = Path(str(row.get("file_name") or "")).name
        title = (
            str(row.get("xml_title") or "").strip()
            or str(row.get("english_name") or "").strip()
            or Path(file_name).stem
        )
        track_id = _unique_track_id(
            _slugify_track_id(str(row.get("track_id") or row.get("slug") or row.get("english_name") or title)),
            seen_ids,
        )
        default_file = f"audio/{file_name}" if file_name else ""
        versions = _extract_versions_from_row(row, default_file)
        normalized_versions: list[dict] = []
        version_sources: list[str] = []
        for version in versions:
            version_file = str(version.get("file") or "").strip()
            if version_file:
                version_sources.append(version_file)
                if "/" not in version_file and "\\" not in version_file:
                    version_file = f"audio/{version_file}"
            normalized_versions.append(
                {
                    "dropType": str(version.get("dropType") or "Default"),
                    "file": version_file,
                    "startCue": version.get("startCue"),
                    "endCue": version.get("endCue"),
                }
            )
        if not normalized_versions:
            normalized_versions = [
                {"dropType": "Default", "file": default_file, "startCue": None, "endCue": None}
            ]

        if row.get("location"):
            version_sources.append(str(row.get("location")))
        sources_by_id[track_pk] = [item for item in version_sources if item]
        tracks.append(
            {
                "trackId": track_id,
                "title": title,
                "artist": str(row.get("artist") or "").strip(),
                "genre": str(row.get("genre") or "").strip(),
                "versions": normalized_versions,
            }
        )
    return {"tracks": tracks}, sources_by_id


@parser_bp.get("/api/tracks")
def api_tracks():
    query = (request.args.get("q") or "").strip()
    try:
        limit = min(max(int(request.args.get("limit", 50000)), 1), 50000)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        return jsonify({"error": "Invalid pagination values."}), 400

    apply_filter = request.args.get("playlist_filter", "1") != "0"
    artist_missing = request.args.get("artist_missing", "0") == "1"
    tracks, total = list_tracks(
        query=query,
        limit=limit,
        offset=offset,
        playlist_filter=apply_filter,
        artist_missing_in_title=artist_missing,
    )
    stats = db_stats()
    return jsonify(
        {
            "tracks": [track.to_dict() for track in tracks],
            "total": total,
            "offset": offset,
            "limit": limit,
            "stats": stats,
        }
    )


@parser_bp.get("/api/playlist-filter")
def api_playlist_filter_status():
    status = playlist_filter_status()
    status["unmatched"] = get_unmatched_playlist_tracks()
    return jsonify(status)


@parser_bp.get("/api/playlist-filter/unmatched")
def api_playlist_filter_unmatched():
    if not playlist_filter_status().get("active"):
        return jsonify({"unmatched": [], "manual_matches": {}})
    manual = get_manual_matches()
    unmatched = get_unmatched_playlist_tracks()
    return jsonify({"unmatched": unmatched, "manual_match_count": len(manual)})


@parser_bp.post("/api/playlist-filter/manual-match")
def api_playlist_manual_match():
    data = request.get_json(silent=True) or {}
    playlist_key = (data.get("playlist_key") or "").strip()
    if not playlist_key:
        return jsonify({"error": "playlist_key is required."}), 400
    try:
        track_id = int(data.get("track_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "track_id is required."}), 400

    try:
        result = add_manual_playlist_match(playlist_key, track_id)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    result["playlist_filter"] = playlist_filter_status()
    return jsonify(result)


@parser_bp.post("/api/playlist-filter/manual-unmatch")
def api_playlist_manual_unmatch():
    data = request.get_json(silent=True) or {}
    playlist_key = (data.get("playlist_key") or "").strip()
    if not playlist_key:
        return jsonify({"error": "playlist_key is required."}), 400

    result = remove_manual_playlist_match(playlist_key)
    result["playlist_filter"] = playlist_filter_status()
    return jsonify(result)


@parser_bp.post("/api/playlist-filter")
def api_playlist_filter_apply():
    upload = request.files.get("file")
    if upload and upload.filename:
        try:
            playlist_tracks = load_playlist_from_bytes(upload.read())
        except Exception as exc:
            return jsonify({"error": f"Could not read playlist: {exc}"}), 400
        source = upload.filename
    else:
        data = request.get_json(silent=True) or {}
        path_str = (data.get("path") or "").strip()
        if not path_str:
            return jsonify({"error": "Playlist path is required."}), 400

        path = Path(path_str).expanduser()
        if not path.is_file():
            return jsonify({"error": f"Playlist file not found: {path}"}), 404

        try:
            playlist_tracks = load_playlist(path)
        except Exception as exc:
            return jsonify({"error": f"Could not read playlist: {exc}"}), 400
        source = str(path)

    if not db_stats().get("has_data"):
        return jsonify({"error": "Import XML first before applying a playlist filter."}), 400

    result = apply_playlist_filter(playlist_tracks, source)
    result["playlist_filter"] = playlist_filter_status()
    return jsonify(result)


@parser_bp.delete("/api/playlist-filter")
def api_playlist_filter_clear():
    clear_playlist_filter()
    return jsonify({"ok": True, "playlist_filter": playlist_filter_status()})


@parser_bp.patch("/api/tracks/<int:track_id>")
def api_update_track(track_id: int):
    data = request.get_json(silent=True) or {}
    try:
        updated = update_track(track_id, data)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    if not updated:
        return jsonify({"error": f"Track {track_id} not found."}), 404

    return jsonify({"track": updated.to_dict()})


@parser_bp.post("/api/export-xml")
def api_export_xml():
    data = request.get_json(silent=True) or {}
    mode = (data.get("mode") or "").strip().lower()
    if mode not in {"hebrew", "english"}:
        return jsonify({"error": "mode must be 'hebrew' or 'english'."}), 400

    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    source_xml = get_source_xml_path()
    if not source_xml:
        return jsonify({"error": "Import XML first to store the source library file."}), 400

    tracks = get_tracks_by_ids(track_ids)
    if not tracks:
        return jsonify({"error": "No matching tracks found."}), 404

    mapping = location_title_map_for_tracks(tracks, mode)
    if not mapping:
        return jsonify({"error": f"Selected tracks have no {mode} titles."}), 400

    try:
        xml_bytes, _updated = export_rekordbox_xml_with_titles(source_xml, mapping)
    except Exception as exc:
        return jsonify({"error": f"Could not export XML: {exc}"}), 400

    filename = f"rekordbox_{mode}_titles.xml"
    return send_file(
        BytesIO(xml_bytes),
        mimetype="application/xml",
        as_attachment=True,
        download_name=filename,
    )


@parser_bp.post("/api/export-site-tracks-json")
def api_export_site_tracks_json():
    data = request.get_json(silent=True) or {}
    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    rows = _export_rows_for_ids(track_ids)
    if not rows:
        return jsonify({"error": "No matching tracks found."}), 404

    payload, _sources = _site_tracks_payload_from_rows(rows)
    json_bytes = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    return send_file(
        BytesIO(json_bytes),
        mimetype="application/json",
        as_attachment=True,
        download_name="tracks_export.json",
    )


@parser_bp.post("/api/export-site-tracks-bundle")
def api_export_site_tracks_bundle():
    data = request.get_json(silent=True) or {}
    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    rows = _export_rows_for_ids(track_ids)
    if not rows:
        return jsonify({"error": "No matching tracks found."}), 404

    payload, sources_by_id = _site_tracks_payload_from_rows(rows)
    json_bytes = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")

    archive = BytesIO()
    missing_files: list[str] = []
    added_files = 0
    written_paths: set[str] = set()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("tracks_export.json", json_bytes)
        for row in rows:
            track_pk = int(row.get("id") or 0)
            source_candidates = sources_by_id.get(track_pk, [])
            for candidate in source_candidates:
                candidate_path = Path(candidate).expanduser()
                resolved = candidate_path if candidate_path.is_file() else resolve_location(candidate)
                if not resolved or not resolved.is_file():
                    missing_files.append(candidate or str(row.get("location") or row.get("file_name") or f"id:{track_pk}"))
                    continue
                resolved_key = str(resolved.resolve())
                if resolved_key in written_paths:
                    continue
                written_paths.add(resolved_key)
                arc_name = f"audio/{resolved.name}"
                zf.write(resolved, arc_name)
                added_files += 1

    if added_files == 0:
        return jsonify(
            {
                "error": "No audio files were found on disk for the selected tracks.",
                "missing": missing_files,
            }
        ), 400

    archive.seek(0)
    response = send_file(
        archive,
        mimetype="application/zip",
        as_attachment=True,
        download_name="tracks_export_bundle.zip",
    )
    if missing_files:
        response.headers["X-Missing-Audio-Files"] = str(len(missing_files))
    return response


@parser_bp.post("/api/write-file-titles")
def api_write_file_titles():
    data = request.get_json(silent=True) or {}
    mode = (data.get("mode") or "").strip().lower()
    if mode not in {"hebrew", "english", "merged", "formatted", "xml"}:
        return jsonify({"error": "mode must be 'hebrew', 'english', 'merged', 'formatted', or 'xml'."}), 400

    order = _reparse_order_from_data(data) if mode == "formatted" else None
    if mode == "formatted":
        raw_order = data.get("order")
        if not isinstance(raw_order, list):
            return jsonify({"error": "Write format order is required."}), 400
        selected = [
            str(part).strip().lower()
            for part in raw_order
            if str(part).strip().lower() in VALID_REPARSE_PARTS
        ]
        if not selected:
            return jsonify({"error": "Select at least one title part for the write format."}), 400
        order = normalize_reparse_order(selected)

    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    tracks = get_tracks_by_ids(track_ids)
    if not tracks:
        return jsonify({"error": "No matching tracks found."}), 404

    write = bool(data.get("confirm"))
    results = apply_file_titles_to_tracks(tracks, mode, write=write, order=order)
    changed = sum(1 for item in results if item.get("changed"))
    would_change = sum(1 for item in results if item.get("would_change"))
    failed = sum(1 for item in results if item.get("error"))

    return jsonify(
        {
            "results": results,
            "changed": changed,
            "would_change": would_change,
            "failed": failed,
            "skipped": len(results) - would_change - failed,
            "dry_run": not write,
        }
    )


@parser_bp.post("/api/write-onelibrary-titles")
def api_write_onelibrary_titles():
    data = request.get_json(silent=True) or {}
    mode = (data.get("mode") or "").strip().lower()
    if mode not in {"hebrew", "english", "merged", "formatted", "xml"}:
        return jsonify({"error": "mode must be 'hebrew', 'english', 'merged', 'formatted', or 'xml'."}), 400

    target_path = (data.get("target_path") or "").strip()
    if not target_path:
        return jsonify({"error": "target_path is required."}), 400
    target = Path(target_path).expanduser()
    if not target.is_file():
        return jsonify({"error": f"File not found: {target}"}), 404
    resolved_target = target.resolve()
    if ONELIBRARY_COPY_DIR not in resolved_target.parents:
        return jsonify(
            {
                "error": (
                    "For safety, writes are only allowed to editable copies under "
                    f"{ONELIBRARY_COPY_DIR} (open /onelibrary/ and create a copy first)."
                )
            }
        ), 400

    order = _reparse_order_from_data(data) if mode == "formatted" else None
    if mode == "formatted":
        raw_order = data.get("order")
        if not isinstance(raw_order, list):
            return jsonify({"error": "Write format order is required."}), 400
        selected = [
            str(part).strip().lower()
            for part in raw_order
            if str(part).strip().lower() in VALID_REPARSE_PARTS
        ]
        if not selected:
            return jsonify({"error": "Select at least one title part for the write format."}), 400
        order = normalize_reparse_order(selected)

    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    tracks = get_tracks_by_ids(track_ids)
    if not tracks:
        return jsonify({"error": "No matching tracks found."}), 404

    try:
        result = apply_onelibrary_titles_from_tracks(tracks, resolved_target, mode, order=order)
    except Exception as exc:
        return jsonify({"error": f"Could not write exportLibrary.db: {exc}"}), 400

    return jsonify(result)


@parser_bp.post("/api/fill-english-names")
def api_fill_english_names():
    data = request.get_json(silent=True) or {}
    overwrite = bool(data.get("overwrite"))

    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    tracks = get_tracks_by_ids(track_ids)
    if not tracks:
        return jsonify({"error": "No matching tracks found."}), 404

    write = bool(data.get("confirm"))
    results = fill_english_names_from_hebrew(tracks, write=write, overwrite=overwrite)
    changed = sum(1 for item in results if item.get("changed"))
    would_change = sum(1 for item in results if item.get("would_change"))
    failed = sum(1 for item in results if item.get("error"))
    skipped = sum(1 for item in results if item.get("skipped"))

    return jsonify(
        {
            "results": results,
            "changed": changed,
            "would_change": would_change,
            "failed": failed,
            "skipped": skipped,
            "dry_run": not write,
        }
    )


@parser_bp.post("/api/fill-artist-english")
def api_fill_artist_english():
    data = request.get_json(silent=True) or {}

    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    tracks = get_tracks_by_ids(track_ids)
    if not tracks:
        return jsonify({"error": "No matching tracks found."}), 404

    write = bool(data.get("confirm"))
    results = fill_artists_to_english(tracks, write=write)
    changed = sum(1 for item in results if item.get("changed"))
    would_change = sum(1 for item in results if item.get("would_change"))
    failed = sum(1 for item in results if item.get("error"))
    skipped = sum(1 for item in results if item.get("skipped"))

    return jsonify(
        {
            "results": results,
            "changed": changed,
            "would_change": would_change,
            "failed": failed,
            "skipped": skipped,
            "dry_run": not write,
        }
    )


@parser_bp.post("/api/add-artist-to-english")
def api_add_artist_to_english():
    data = request.get_json(silent=True) or {}

    try:
        track_ids = _action_track_ids(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    if not track_ids:
        return jsonify({"error": "Select tracks or apply a playlist filter."}), 400

    tracks = get_tracks_by_ids(track_ids)
    if not tracks:
        return jsonify({"error": "No matching tracks found."}), 404

    write = bool(data.get("confirm"))
    results = add_artist_to_english_names(tracks, write=write)
    changed = sum(1 for item in results if item.get("changed"))
    would_change = sum(1 for item in results if item.get("would_change"))
    failed = sum(1 for item in results if item.get("error"))
    skipped = sum(1 for item in results if item.get("skipped"))

    return jsonify(
        {
            "results": results,
            "changed": changed,
            "would_change": would_change,
            "failed": failed,
            "skipped": skipped,
            "dry_run": not write,
        }
    )


@parser_bp.get("/api/unknown-hebrew")
def api_unknown_hebrew_get():
    download = request.args.get("download", "0") == "1"
    hebrew_names = _hebrew_names_for_export()
    payload = _unknown_hebrew_payload(hebrew_names)

    if download:
        text = format_unknown_hebrew_for_gemini(payload)
        return send_file(
            BytesIO(text.encode("utf-8")),
            mimetype="text/plain; charset=utf-8",
            as_attachment=True,
            download_name="unknown_hebrew_for_gemini.txt",
        )

    return jsonify(payload)


@parser_bp.post("/api/unknown-hebrew")
def api_unknown_hebrew_post():
    data = request.get_json(silent=True) or {}
    download = bool(data.get("download"))

    try:
        hebrew_names = _hebrew_names_for_export(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not hebrew_names:
        return jsonify({"error": "No Hebrew names found for the selected tracks."}), 400

    payload = _unknown_hebrew_payload(hebrew_names)

    if download:
        text = format_unknown_hebrew_for_gemini(payload)
        return send_file(
            BytesIO(text.encode("utf-8")),
            mimetype="text/plain; charset=utf-8",
            as_attachment=True,
            download_name="unknown_hebrew_for_gemini.txt",
        )

    return jsonify(payload)
