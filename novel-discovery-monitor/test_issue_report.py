import datetime as dt
import unittest

from issue_report import ORDER, render


class ReportRenderingTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 11, 12, 7, 0, tzinfo=dt.timezone.utc)

    def test_missing_report_is_never_success(self):
        output = render(None, self.now, "junl-im/meta", "777")
        self.assertIn("검사 결과 없음", output)
        self.assertIn("2026-11-12 16:00 KST", output)

    def test_full_success_has_all_five_checks(self):
        report = {"checks": {name: {"ok": True, "http_status": 200} for name in ORDER}}
        output = render(report, self.now, "junl-im/meta", "777")
        self.assertIn("5개 대상 기본 진단 통과", output)
        self.assertIn("https://github.com/junl-im/meta/actions/runs/777", output)
        self.assertIn("조회수 JSON", output)

    def test_missing_one_check_not_success(self):
        report = {"checks": {name: {"ok": True} for name in ORDER if name != "sitemap"}}
        output = render(report, self.now, "junl-im/meta", "777")
        self.assertNotIn("5개 대상 기본 진단 통과", output)

    def test_unknown_json_schema_is_partial(self):
        report = {"checks": {name: {"ok": True} for name in ORDER}}
        report["checks"]["view_counts"]["schema_coverage"] = "unknown; JSON presence only"
        output = render(report, self.now, "junl-im/meta", "777")
        self.assertIn("구조 검증 미완", output)

    def test_failure_reports_failure(self):
        report = {"checks": {name: {"ok": True} for name in ORDER}}
        report["checks"]["works"] = {"ok": False, "error_class": "dns_error"}
        output = render(report, self.now, "junl-im/meta", "777")
        self.assertIn("일부 항목 실패", output)
        self.assertIn("dns_error", output)


if __name__ == "__main__":
    unittest.main()
