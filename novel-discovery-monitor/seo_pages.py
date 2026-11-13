#!/usr/bin/env python3
"""Read-only HTML SEO audit of URLs published in the Site sitemap."""
import argparse
import concurrent.futures
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

BASE = "https://gomfox-story-discovery.x7x8.chatgpt.site"
MAX_URLS = 80
MAX_HTML = 750_000


class HeadInfo(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ""
        self.description = ""
        self.canonical = ""
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        attrs = {k.lower(): (v or "") for k, v in attrs}
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            if attrs.get("name", "").lower() == "description":
                self.description = attrs.get("content", "").strip()
            if attrs.get("name", "").lower() in ("robots", "googlebot", "yeti", "naverbot"):
                rules = attrs.get("content", "").lower().replace(";", ",").split(",")
                if any(rule.strip() == "noindex" for rule in rules):
                    self.noindex = True
        if tag == "link" and attrs.get("rel", "").lower() == "canonical":
            self.canonical = attrs.get("href", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def sitemap_urls(blob, expected_host):
    root = ET.fromstring(blob)
    if root.tag.rsplit("}", 1)[-1] != "urlset":
        raise ValueError("Sitemap index or unsupported root; manual audit required")
    urls = []
    for item in root:
        if item.tag.rsplit("}", 1)[-1] != "url":
            continue
        for child in item:
            if child.tag.rsplit("}", 1)[-1] == "loc" and child.text:
                url = child.text.strip()
                parts = urllib.parse.urlsplit(url)
                if parts.scheme != "https" or parts.hostname != expected_host or parts.username or parts.password:
                    raise ValueError("Cross-domain or non-HTTPS sitemap entry")
                urls.append(url)
                break
    if len(urls) != len(set(urls)):
        raise ValueError("Duplicate sitemap URL")
    if not urls or len(urls) > MAX_URLS:
        raise ValueError("Unexpected number of sitemap URLs")
    return urls


def audit_page(url, timeout=10):
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "GomfoxSEOAudit/1.0 (+read-only; 3 times per day)"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = response.status
            final_url = response.geturl()
            mime = response.headers.get("Content-Type", "").lower()
            xrobots = response.headers.get("X-Robots-Tag", "").lower()
            body = response.read(MAX_HTML + 1)
        result = {"url": url, "status": status, "final_url": final_url, "ok": True, "warnings": []}
        if status != 200 or "text/html" not in mime or not body or len(body) > MAX_HTML:
            result["ok"] = False
            result["error"] = "not_html_200_or_body_invalid"
            return result
        parsed = HeadInfo()
        parsed.feed(body.decode("utf-8", errors="replace"))
        directives = [v.strip() for v in xrobots.split(",")]
        if parsed.noindex or "noindex" in directives or any(v.endswith(": noindex") for v in directives):
            result["ok"] = False
            result["error"] = "noindex"
        if not parsed.title.strip():
            result["warnings"].append("missing_title")
        if not parsed.description.strip():
            result["warnings"].append("missing_meta_description")
        if parsed.canonical:
            canon = urllib.parse.urlsplit(urllib.parse.urljoin(final_url, parsed.canonical))
            if canon.hostname != urllib.parse.urlsplit(url).hostname or canon.scheme != "https":
                result["warnings"].append("canonical_cross_domain")
        else:
            result["warnings"].append("canonical_not_declared")
        result["title"] = parsed.title.strip()[:150]
        return result
    except (OSError, ValueError, UnicodeError, urllib.error.URLError) as exc:
        return {"url": url, "ok": False, "error": type(exc).__name__, "warnings": []}


def audit(base=BASE, timeout=10):
    host = urllib.parse.urlsplit(base).hostname
    if urllib.parse.urlsplit(base).scheme != "https" or not host:
        raise ValueError("HTTPS base required")
    sitemap = urllib.parse.urljoin(base.rstrip("/") + "/", "sitemap.xml")
    with urllib.request.urlopen(
        urllib.request.Request(sitemap, headers={"User-Agent": "GomfoxSEOAudit/1.0 (+read-only)"}),
        timeout=timeout,
    ) as response:
        urls = sitemap_urls(response.read(400_000), host)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        pages = list(pool.map(lambda url: audit_page(url, timeout), urls))
    bad = [p for p in pages if not p["ok"]]
    cautions = [p for p in pages if p["warnings"]]
    return {
        "checked_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sitemap_url_count": len(urls),
        "checked_page_count": len(pages),
        "failed_page_count": len(bad),
        "warned_page_count": len(cautions),
        "all_ok": not bad and len(pages) == len(urls),
        "failures": bad[:30],
        "warnings": cautions[:30],
        "note": "Checks HTML fetch/indexability basics, not actual Google/Naver indexing.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="seo-pages.json")
    parser.add_argument("--timeout", type=int, default=10)
    args = parser.parse_args()
    try:
        result = audit(timeout=args.timeout)
    except (OSError, ValueError, ET.ParseError, urllib.error.URLError) as exc:
        result = {"all_ok": False, "error": type(exc).__name__, "checked_page_count": 0}
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if k not in ("failures", "warnings")}, ensure_ascii=False))
    return 0 if result["all_ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
