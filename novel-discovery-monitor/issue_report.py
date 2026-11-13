#!/usr/bin/env python3
"""Render GitHub Issue status from a read-only novel site health report."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

ORDER = ("homepage", "works", "robots", "sitemap", "view_counts")
LABELS = {"homepage": "메인", "works": "작품 목록", "robots": "robots.txt", "sitemap": "사이트맵", "view_counts": "조회수 JSON"}
SITE = "https://gomfox-story-discovery.x7x8.chatgpt.site"


def render(report: dict | None, now: dt.datetime, repository: str, run_id: str, catalog: dict | None = None, seo: dict | None = None) -> str:
    now_kst = now.astimezone(ZoneInfo("Asia/Seoul"))
    checked = now_kst.strftime("%Y-%m-%d %H:%M KST")
    rows = []
    checks = report.get("checks", {}) if isinstance(report, dict) else {}
    complete = isinstance(checks, dict) and all(isinstance(checks.get(k), dict) for k in ORDER)
    healthy = complete and all(checks[k].get("ok") is True for k in ORDER)
    partial_json = complete and bool(checks["view_counts"].get("schema_coverage"))
    if not complete:
        state = "검사 결과 없음 — 실행 환경 또는 보고서 확인 필요"
    elif healthy and partial_json:
        state = "주소 접속 정상 · 조회수 JSON 구조 검증 미완"
    elif healthy:
        state = "5개 대상 기본 진단 통과"
    else:
        state = "일부 항목 실패 — 상세 결과 확인"
    reconciliation_lines = []
    if isinstance(catalog, dict):
        if catalog.get("status") == "mismatch":
            state = "공개 사이트 접속 정상 · 서재 대비 작품 목록 불일치" if healthy else state
            reconciliation_lines = [
                "",
                f"**작품 목록 불일치:** 서재 {catalog.get('shelf_count', '?')}편 / 검색 사이트 {catalog.get('published_count', '?')}편",
            ]
            for work in catalog.get("missing_from_published", []):
                reconciliation_lines.append(
                    f"- 검색 사이트 누락: **{work.get('title', '?')}** · 필명 {work.get('author', '?')} · novelId `{work.get('id', '?')}`"
                )
            if catalog.get("not_in_shelf"):
                reconciliation_lines.append(f"- 서재 카탈로그에 없는 사이트 ID: {', '.join(catalog['not_in_shelf'])}")
            reconciliation_lines.append("이 결과는 두 공개/연결 카탈로그 비교이며 네이버 공식 최신 작품 검색과는 구분됩니다.")
        elif catalog.get("status") == "match":
            reconciliation_lines = ["", "**서재 작품 목록 대조:** 등록 ID 일치"]
        else:
            reconciliation_lines = ["", "**서재 작품 목록 대조:** 검증 실패 · 기존 데이터 유지"]
    seo_lines = []
    if isinstance(seo, dict):
        if seo.get("checked_page_count", 0):
            checked = seo.get("checked_page_count", 0)
            failures = seo.get("failed_page_count", 0)
            warnings = seo.get("warned_page_count", 0)
            seo_lines = [
                "",
                f"**사이트맵 내 개별 페이지 검사:** {checked}개 확인 · 실패 {failures}개 · SEO 주의 {warnings}개",
            ]
            for item in seo.get("failures", [])[:6]:
                seo_lines.append(f"- 접근·색인 차단 오류: {item.get('url', '?')} ({item.get('error', '오류')})")
            for item in seo.get("warnings", [])[:6]:
                seo_lines.append(f"- SEO 확인 필요: {item.get('url', '?')} ({', '.join(item.get('warnings', []))})")
            seo_lines.append("개별 페이지 진단은 HTTP 응답과 메타 태그만 확인하며 실제 검색엔진 색인 여부와는 별개입니다.")
        else:
            seo_lines = ["", "**사이트맵 개별 페이지 검사:** 실행 실패 또는 대상 없음"]
    for key in ORDER:
        item = checks.get(key, {}) if isinstance(checks, dict) else {}
        if not isinstance(item, dict):
            item = {}
        mark = "✅" if item.get("ok") is True else "❌"
        detail = item.get("http_status", item.get("error_class", "미확인"))
        if "url_count" in item:
            detail = f"{detail}, URL {item['url_count']}개"
        if "record_count" in item:
            detail = f"{detail}, 데이터 {item['record_count']}건"
        if key in {"homepage", "works"} and "meta_noindex_agents" in item and item.get("ok"):
            detail = f"{detail}, noindex 차단 없음"
        if key == "robots" and "root_disallow_agents" in item and item.get("ok"):
            detail = f"{detail}, 사이트 전체 차단 없음"
        if key == "sitemap" and item.get("unique_urls") is True and item.get("same_host_https") is True:
            detail = f"{detail}, 중복 없음·동일 HTTPS 도메인"
        if key == "view_counts" and item.get("numeric_work_ids") is True and item.get("nonnegative_numeric_views") is True:
            detail = f"{detail}, 작품 ID·조회수 형식 정상"
        if item.get("schema_coverage"):
            detail = f"{detail}, 실제 스키마 검증 미완"
        rows.append(f"| {LABELS[key]} | {mark} | {detail} |")
    link = f"https://github.com/{repository}/actions/runs/{run_id}" if repository and run_id else "https://github.com/junl-im/meta/actions/workflows/novel-discovery-health.yml"
    return "\n".join([
        "## 소설 사이트 정기 접속 진단",
        "",
        f"**상태: {state}**",
        "",
        f"- 마지막 진단 기록: **{checked}**",
        f"- 대상: {SITE}",
        f"- [이번 GitHub Actions 실행 기록]({link})",
        "",
        "| 확인 대상 | 결과 | 확인 내용 |",
        "|---|---|---|",
        *rows,
        *reconciliation_lines,
        *seo_lines,
        "",
        "**주의:** 이 결과는 공개 URL의 접속·기초 형식 진단이다. 네이버 신규 작품 검색, 전 회차 조회수 재집계, 검색엔진 색인, Sites 소스 편집·배포 성공 여부를 확인한 것이 아니다.",
        "",
        "기존 조회수 스냅샷은 이 도구에서 변경하지 않는다. 실행 실패 시에도 마지막 검증 데이터를 0이나 추정값으로 대체하지 않는다.",
        "",
        "[자동 점검 코드](https://github.com/junl-im/meta/tree/main/novel-discovery-monitor)",
        "",
    ])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="site-health.json")
    parser.add_argument("--output", default="issue-body.md")
    parser.add_argument("--catalog-report", default="catalog-reconciliation.json")
    parser.add_argument("--seo-report", default="seo-pages.json")
    args = parser.parse_args()
    try:
        report = json.loads(Path(args.input).read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError):
        report = None
    try:
        catalog = json.loads(Path(args.catalog_report).read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError):
        catalog = None
    try:
        seo = json.loads(Path(args.seo_report).read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError):
        seo = None
    body = render(
        report,
        dt.datetime.now(dt.timezone.utc),
        os.getenv("GITHUB_REPOSITORY", "junl-im/meta"),
        os.getenv("GITHUB_RUN_ID", ""),
        catalog,
        seo,
    )
    Path(args.output).write_text(body, encoding="utf-8")
    print(body)


if __name__ == "__main__":
    main()
