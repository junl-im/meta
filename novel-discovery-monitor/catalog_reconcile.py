#!/usr/bin/env python3
"""Compare the published novel-site snapshot against the GitHub shelf catalog.

Read-only. NEVER mutates either the published Site or the GitHub catalog.
"""
import argparse
import datetime as dt
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

SITE_COUNTS_URL = "https://gomfox-story-discovery.x7x8.chatgpt.site/data/view-counts.json"
SHELF_PATH = "NaverNovelShelf/site/catalog.js"
AUTHORS = {"[곰같은여우]", "닥터X", "[여우같은곰]", "고양이와사비", "[ZERO]"}
PATTERN = re.compile(r'^\s*\["([^"]+)","([^"]+)","(\d+)","(best|challenge)"', re.M)


def parse_shelf(source: str) -> dict[str, dict]:
    records: dict[str, dict] = {}
    for title, author, novel_id, league in PATTERN.findall(source):
        if author not in AUTHORS:
            raise ValueError(f"unexpected author: {author}")
        if novel_id in records:
            raise ValueError(f"duplicate shelf novelId: {novel_id}")
        records[novel_id] = {"id": novel_id, "title": title, "author": author, "league": league}
    if not records:
        raise ValueError("shelf catalog empty or structure changed")
    return records


def parse_published(payload: bytes) -> tuple[set[str], int]:
    parsed = json.loads(payload)
    if not isinstance(parsed, dict) or not isinstance(parsed.get("works"), dict):
        raise ValueError("published view-count schema not recognized")
    ids = set(str(i) for i in parsed["works"].keys())
    if not all(i.isdigit() for i in ids):
        raise ValueError("published novel IDs invalid")
    count = parsed.get("catalog_count")
    if not isinstance(count, int) or isinstance(count, bool) or count != len(ids):
        raise ValueError("published catalog_count inconsistent with works")
    return ids, count


def compare(shelf: dict[str, dict], published_ids: set[str], published_count: int) -> dict:
    shelf_ids = set(shelf)
    missing_ids = sorted(shelf_ids - published_ids, key=int)
    extra_ids = sorted(published_ids - shelf_ids, key=int)
    return {
        "status": "match" if not missing_ids and not extra_ids and published_count == len(shelf) else "mismatch",
        "shelf_count": len(shelf),
        "published_count": published_count,
        "missing_from_published": [shelf[i] for i in missing_ids],
        "not_in_shelf": extra_ids,
        "note": "Metadata comparison only. Naver official author and episode verification remain separate."
    }


def execute(shelf_path: Path, output_path: Path, timeout: int) -> dict:
    result = {
        "checked_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "connected GitHub shelf catalog vs published discovery view-counts.json",
        "status": "unverified",
    }
    try:
        shelf = parse_shelf(shelf_path.read_text(encoding="utf-8"))
        req = urllib.request.Request(
            SITE_COUNTS_URL,
            headers={"User-Agent": "GomfoxCatalogReconcile/1.0 (read-only)", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            payload = response.read(2_000_000)
            if response.status != 200:
                raise ValueError(f"published HTTP {response.status}")
        published_ids, published_count = parse_published(payload)
        result.update(compare(shelf, published_ids, published_count))
    except (OSError, ValueError, UnicodeError, json.JSONDecodeError, urllib.error.URLError) as exc:
        result["error_class"] = type(exc).__name__
        result["status"] = "unverified"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shelf", default=SHELF_PATH)
    parser.add_argument("--out", default="catalog-reconciliation.json")
    parser.add_argument("--timeout", type=int, default=15)
    args = parser.parse_args()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    result = execute(Path(args.shelf), out, args.timeout)
    return 0 if result["status"] == "match" else 1


if __name__ == "__main__":
    sys.exit(main())
