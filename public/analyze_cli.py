"""CLI wrapper for analyzer.py — outputs JSON cue points for a single file."""
import json
import sys

from analyzer import detect_preview_points


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: analyze_cli.py <path>"}))
        sys.exit(1)

    path = sys.argv[1]
    start_time, end_time, duration = detect_preview_points(path)
    result = {"startTime": start_time, "endTime": end_time}
    if duration is not None:
        result["duration"] = duration
    print(json.dumps(result))


if __name__ == "__main__":
    main()
