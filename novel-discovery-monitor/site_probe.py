#!/usr/bin/env python3
"""Read-only public health checks for Gomfox novel discovery."""
import argparse
import datetime as dt
import json
import os
import socket
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser

BASE = "https://gomfox-story-discovery.x7x8.chatgpt.site"
CHECKS = {
    "homepage": "/",
    "works": "/works/",
    "robots": "/robots.txt",
    "sitemap": "/sitemap.xml",
    "view_counts": "/data/view-counts.json",
}
MIN_EXPECTED_WORKS = 30
MIN_EXPECTED_SITEMAP_URLS = 47
MAX_RESPONSE_BYTES = 1_000_000


def inspect_sitemap(blob: bytes, expected_host: str) -> dict:
    try:
        root = ET.fromstring(blob)
        kind = root.tag.rsplit("}", 1)[-1]
        if kind not in ("urlset", "sitemapindex"):
            return {"ok": False, "error_class": "unexpected_sitemap_root", "root": kind}
        elem_name = "url" if kind == "urlset" else "sitemap"
        locations = []
        for node in root:
            if node.tag.rsplit("}", 1)[-1] != elem_name:
                continue
            for child in node:
                if child.tag.rsplit("}", 1)[-1] == "loc" and child.text:
                    locations.append(child.text.strip())
                    break
        valid_urls = all(
            (parts := urllib.parse.urlsplit(loc)).scheme == "https"
            and parts.hostname == expected_host
            and parts.username is None and parts.password is None
            for loc in locations
        )
        unique_urls = len(locations) == len(set(locations))
        enough_urls = kind == "sitemapindex" or len(locations) >= MIN_EXPECTED_SITEMAP_URLS
        result = {
            "ok": bool(locations) and valid_urls and unique_urls and enough_urls,
            "sitemap_type": kind,
            "url_count": len(locations),
            "unique_urls": unique_urls,
            "same_host_https": valid_urls,
        }
        if not enough_urls:
            result["warning"] = "Below the verified 47-URL sitemap baseline"
        return result
    except ET.ParseError:
        return {"ok": False, "error_class": "malformed_xml"}


class RobotsMetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.noindex_agents = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "meta":
            return
        attributes = {key.lower(): (value or "") for key, value in attrs}
        name = attributes.get("name", "").lower().strip()
        directives = {value.strip() for value in attributes.get("content", "").lower().split(",")}
        if name in {"robots", "googlebot", "yeti", "naverbot"} and "noindex" in directives:
            self.noindex_agents.append(name)


def inspect_html_indexability(blob: bytes, x_robots_tag: str = "") -> dict:
    parser = RobotsMetaParser()
    parser.feed(blob.decode("utf-8", errors="replace"))
    header_blocks = any(
        segment.strip().lower().endswith("noindex")
        for segment in x_robots_tag.split(",")
    )
    return {
        "ok": not parser.noindex_agents and not header_blocks,
        "meta_noindex_agents": parser.noindex_agents,
        "x_robots_noindex": header_blocks,
    }


def inspect_robots_rules(blob: bytes) -> dict:
    agents = []
    saw_rule = False
    blocked = []
    for raw_line in blob.decode("utf-8", errors="replace").splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if ":" not in line:
            continue
        directive, value = (item.strip().lower() for item in line.split(":", 1))
        if directive == "user-agent":
            if saw_rule:
                agents = []
                saw_rule = False
            agents.append(value)
        elif directive in {"allow", "disallow", "crawl-delay"}:
            saw_rule = True
            if directive == "disallow" and value == "/":
                blocked.extend(agent for agent in agents if agent in {"*", "googlebot", "yeti", "naverbot"})
    return {"ok": not blocked, "root_disallow_agents": sorted(set(blocked))}


def inspect_view_counts(blob: bytes) -> dict:
    try:
        parsed = json.loads(blob)
    except (UnicodeError, json.JSONDecodeError):
        return {"ok": False, "error_class": "invalid_json"}
    if not isinstance(parsed, (dict, list)) or not parsed:
        return {"ok": False, "error_class": "empty_or_unexpected_json"}
    result = {"ok": True, "json_valid": True, "json_top_level_type": type(parsed).__name__}
    if isinstance(parsed, list):
        result["record_count"] = len(parsed)
        result["ok"] = len(parsed) >= MIN_EXPECTED_WORKS
        result["schema_coverage"] = "list count only; individual views unverified"
        return result
    result["top_level_keys"] = list(parsed.keys())[:12]
    for key in ("works", "items", "records"):
        records = parsed.get(key)
        if not isinstance(records, (list, dict)):
            continue
        count = len(records)
        result["record_count"] = count
        result["record_container"] = type(records).__name__
        result["ok"] = count >= MIN_EXPECTED_WORKS
        catalog_count = parsed.get("catalog_count")
        if isinstance(catalog_count, int) and not isinstance(catalog_count, bool):
            result["catalog_count"] = catalog_count
            result["catalog_count_matches"] = catalog_count == count
            result["ok"] = result["ok"] and result["catalog_count_matches"]
        if isinstance(records, dict):
            id_keys_valid = all(str(item).isdigit() for item in records)
            values_valid = all(
                isinstance(value, (int, float)) and not isinstance(value, bool)
                and value >= 0 and value < float("inf")
                for value in records.values()
            )
            result["numeric_work_ids"] = id_keys_valid
            result["nonnegative_numeric_views"] = values_valid
            if not id_keys_valid or not values_valid:
                result["schema_coverage"] = "record count only; work ID or view value format unverified"
            else:
                result["ok"] = result["ok"] and id_keys_valid and values_valid
        else:
            result["schema_coverage"] = "list count only; individual views unverified"
        break
    else:
        result["schema_coverage"] = "unknown; JSON presence only"
    return result


def probe(url: str, timeout: int = 15) -> dict:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "GomfoxNovelSiteHealthCheck/1.1 (+read-only monitor)",
            "Accept": "text/html,application/json,text/plain,application/xml;q=0.9,*/*;q=0.5",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=ssl.create_default_context()) as response:
            blob = response.read(MAX_RESPONSE_BYTES + 1)
            code = response.status
            mime = response.headers.get("Content-Type", "")
            result = {
                "ok": 200 <= code < 300 and 0 < len(blob) <= MAX_RESPONSE_BYTES,
                "http_status": code,
                "content_type": mime,
                "bytes_checked": len(blob),
            }
            if len(blob) > MAX_RESPONSE_BYTES:
                result["error_class"] = "response_too_large"
                return result
            if code == 200 and url.endswith("/sitemap.xml"):
                details = inspect_sitemap(blob, urllib.parse.urlsplit(url).hostname)
                result.update(details)
            elif code == 200 and url.endswith("/data/view-counts.json"):
                details = inspect_view_counts(blob)
                result.update(details)
            elif code == 200 and url.endswith("/robots.txt"):
                result.update(inspect_robots_rules(blob))
            elif code == 200 and "text/html" in mime.lower():
                result.update(inspect_html_indexability(blob, response.headers.get("X-Robots-Tag", "")))
            return result
    except urllib.error.HTTPError as exc:
        return {"ok": False, "http_status": exc.code, "error_class": "http_error"}
    except urllib.error.URLError as exc:
        reason = exc.reason
        kind = "dns_error" if isinstance(reason, socket.gaierror) else "connection_error"
        return {"ok": False, "error_class": kind, "reason": type(reason).__name__}
    except (TimeoutError, OSError) as exc:
        return {"ok": False, "error_class": "transport_error", "reason": type(exc).__name__}


def generate(base: str, timeout: int = 15) -> dict:
    parsed = urllib.parse.urlsplit(base)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("base URL must be HTTPS and without credentials")
    entries = {
        name: probe(urllib.parse.urljoin(base.rstrip("/") + "/", path.lstrip("/")), timeout)
        for name, path in CHECKS.items()
    }
    return {
        "checked_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "site": base.rstrip("/"),
        "checks": entries,
        "all_ok": all(entry["ok"] for entry in entries.values()),
        "note": "Read-only health check; does not collect Naver views, edit novels or deploy Sites.",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=BASE)
    parser.add_argument("--out", default="site-health.json")
    parser.add_argument("--timeout", type=int, default=15)
    args = parser.parse_args()
    result = generate(args.base, args.timeout)
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Site diagnostics: {'PASS' if result['all_ok'] else 'CHECK FAILED'}")
    for name, status in result["checks"].items():
        extra = status.get("url_count", status.get("record_count", ""))
        print(f"- {name}: {'OK' if status['ok'] else 'FAIL'}  "
              f"{status.get('http_status', status.get('error_class', 'unknown'))} {extra}")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as report:
            report.write("## 곰같은여우 소설 사이트 접속·자료 진단\n\n")
            report.write("읽기 전용 진단으로 조회수·원본·배포를 수정하지 않습니다.\n\n")
            report.write("| 대상 | 결과 |\n|---|---|\n")
            for name, status in result["checks"].items():
                detail = status.get("http_status", status.get("error_class", "unknown"))
                report.write(f"| {name} | {'OK' if status['ok'] else 'FAIL'} — {detail} |\n")
    return 0 if result["all_ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
