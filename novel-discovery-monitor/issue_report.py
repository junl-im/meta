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


def render(report: dict | None, now: dt.datetime, repository: str, run_id: str) -> str:
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
    args = parser.parse_args()
    try:
        report = json.loads(Path(args.input).read_text(encoding="utf-8"))
    except (OSError, ValueError, UnicodeError):
        report = None
    body = render(
        report,
        dt.datetime.now(dt.timezone.utc),
        os.getenv("GITHUB_REPOSITORY", "junl-im/meta"),
        os.getenv("GITHUB_RUN_ID", ""),
    )
    Path(args.output).write_text(body, encoding="utf-8")
    print(body)


if __name__ == "__main__":
    main()
