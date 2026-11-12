#!/usr/bin/env python3
"""Read-only public availability probe for Gomfox novel discovery site."""
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
from pathlib import Path

BASE = "https://gomfox-story-discovery.x7x8.chatgpt.site"
CHECKS = {
    "homepage": "/",
    "works": "/works/",
    "robots": "/robots.txt",
    "sitemap": "/sitemap.xml",
    "view_counts": "/data/view-counts.json",
}


def probe(url: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "GomfoxNovelSiteHealthCheck/1.0 (+read-only monitor)", "Accept": "text/html,application/json,text/plain,application/xml;q=0.9,*/*;q=0.5"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ssl.create_default_context()) as resp:
            blob = resp.read(1_000_000)
            code = resp.status
            mime = resp.headers.get("Content-Type", "")
            result = {"ok": 200 <= code < 300 and bool(blob), "http_status": code, "content_type": mime, "bytes_checked": len(blob)}
            if "view-counts.json" in url and code == 200:
                try:
                    parsed = json.loads(blob)
                    result["json_valid"] = isinstance(parsed, (list, dict))
                    result["json_top_level_type"] = type(parsed).__name__
                    result["ok"] = result["ok"] and result["json_valid"]
                except (UnicodeError, json.JSONDecodeError):
                    result["json_valid"] = False
                    result["ok"] = False
            return result
    except urllib.error.HTTPError as exc:
        return {"ok": False, "http_status": exc.code, "error_class": "http_error"}
    except urllib.error.URLError as exc:
        why = exc.reason
        kind = "dns_error" if isinstance(why, socket.gaierror) else "connection_error"
        return {"ok": False, "error_class": kind, "reason": type(why).__name__}
    except (TimeoutError, OSError) as exc:
        return {"ok": False, "error_class": "transport_error", "reason": type(exc).__name__}


def generate(base: str, timeout: int = 15) -> dict:
    parsed = urllib.parse.urlsplit(base)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError("base URL must be HTTPS and without credentials")
    entries = {
        key: probe(urllib.parse.urljoin(base.rstrip("/") + "/", path.lstrip("/")), timeout)
        for key, path in CHECKS.items()
    }
    return {"checked_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(), "site": base.rstrip("/"), "checks": entries,
            "all_ok": all(item["ok"] for item in entries.values()),
            "note": "Read-only health report: does not validate novels or update site/view counts."}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default=BASE)
    p.add_argument("--out", default="site-health.json")
    p.add_argument("--timeout", type=int, default=15)
    args = p.parse_args()
    output = generate(args.base, args.timeout)
    path = Path(args.out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Site availability: {'PASS' if output['all_ok'] else 'CHECK FAILED'}")
    for name, status in output["checks"].items():
        print(f"- {name}: {'OK' if status['ok'] else 'FAIL'}  {status.get('http_status', status.get('error_class', 'unknown'))}")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as report:
            report.write("## 곰같은여우 소설 사이트 접속 진단\n\n")
            report.write("읽기 전용 진단: 작품 조회수·원본·배포는 수정하지 않습니다.\n\n")
            report.write("| 대상 | 결과 |\n|---|---|\n")
            for name, status in output["checks"].items():
                report.write(f"| {name} | {'OK' if status['ok'] else 'FAIL'} — {status.get('http_status', status.get('error_class', 'unknown'))} |\n")
    return 0 if output["all_ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
