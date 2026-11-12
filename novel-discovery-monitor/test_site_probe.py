import io
import json
import socket
import unittest
from unittest import mock
from urllib.error import HTTPError, URLError

import site_probe


class FakeResponse:
    status = 200

    def __init__(self, body: bytes, content_type: str):
        self.body = body
        self.headers = {"Content-Type": content_type}

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return None

    def read(self, _):
        return self.body


class Tests(unittest.TestCase):
    def test_valid_view_counts(self):
        payload = json.dumps({"works": [{"novelId": str(n), "views": n} for n in range(30)]}).encode()
        with mock.patch("site_probe.urllib.request.urlopen", return_value=FakeResponse(payload, "application/json")):
            result = site_probe.probe("https://example.test/data/view-counts.json")
        self.assertTrue(result["ok"])
        self.assertEqual(result["record_count"], 30)

    def test_real_keyed_view_counts_passes(self):
        payload = json.dumps({
            "metric": "episode_views_sum",
            "source": "naver",
            "verified_at": "2026-11-11",
            "catalog_count": 30,
            "works": {str(1240000 + n): n * 3 for n in range(30)}
        }).encode()
        result = site_probe.inspect_view_counts(payload)
        self.assertTrue(result["ok"])
        self.assertEqual(result["record_count"], 30)
        self.assertTrue(result["numeric_work_ids"])
        self.assertTrue(result["nonnegative_numeric_views"])
        self.assertNotIn("schema_coverage", result)

    def test_keyed_catalog_count_mismatch_rejected(self):
        payload = json.dumps({"catalog_count": 31, "works": {str(n): n for n in range(30)}}).encode()
        result = site_probe.inspect_view_counts(payload)
        self.assertFalse(result["ok"])
        self.assertFalse(result["catalog_count_matches"])

    def test_keyed_negative_view_not_verified(self):
        payload = json.dumps({"catalog_count": 30, "works": {str(n): (-1 if n == 2 else n) for n in range(30)}}).encode()
        result = site_probe.inspect_view_counts(payload)
        self.assertIn("schema_coverage", result)

    def test_empty_view_counts_rejected(self):
        self.assertFalse(site_probe.inspect_view_counts(b'{"works": []}')["ok"])

    def test_unknown_nonempty_json_schema_cautiously_accepted(self):
        result = site_probe.inspect_view_counts(b'{"snapshot":"2026-11-11"}')
        self.assertTrue(result["ok"])
        self.assertIn("schema_coverage", result)

    def test_invalid_json_rejected(self):
        self.assertFalse(site_probe.inspect_view_counts(b"<html>error</html>")["ok"])

    def test_valid_sitemap(self):
        urls = "".join(f"<url><loc>https://example.test/works/{i}</loc></url>" for i in range(47))
        payload = f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'.encode()
        result = site_probe.inspect_sitemap(payload, "example.test")
        self.assertTrue(result["ok"])
        self.assertEqual(result["url_count"], 47)

    def test_sitemap_30_urls_does_not_meet_47_page_baseline(self):
        urls = "".join(f"<url><loc>https://example.test/works/{i}</loc></url>" for i in range(30))
        self.assertFalse(site_probe.inspect_sitemap(f"<urlset>{urls}</urlset>".encode(), "example.test")["ok"])

    def test_sitemap_27_urls_is_not_full_inventory(self):
        urls = "".join(f"<url><loc>https://example.test/works/{i}</loc></url>" for i in range(27))
        payload = f"<urlset>{urls}</urlset>".encode()
        self.assertFalse(site_probe.inspect_sitemap(payload, "example.test")["ok"])

    def test_external_sitemap_urls_rejected(self):
        urls = "".join(f"<url><loc>https://other.test/works/{i}</loc></url>" for i in range(47))
        payload = f"<urlset>{urls}</urlset>".encode()
        self.assertFalse(site_probe.inspect_sitemap(payload, "example.test")["ok"])

    def test_sitemapindex_supported(self):
        payload = b"<sitemapindex><sitemap><loc>https://example.test/sitemap-1.xml</loc></sitemap></sitemapindex>"
        self.assertTrue(site_probe.inspect_sitemap(payload, "example.test")["ok"])

    def test_malformed_sitemap_rejected(self):
        self.assertFalse(site_probe.inspect_sitemap(b"<xml>", "example.test")["ok"])

    @mock.patch("site_probe.urllib.request.urlopen", side_effect=URLError(socket.gaierror(-2, "not known")))
    def test_dns_failure(self, _):
        self.assertEqual(site_probe.probe("https://example.test/")["error_class"], "dns_error")

    @mock.patch("site_probe.urllib.request.urlopen", side_effect=HTTPError("https://example.test", 404, "Not Found", {}, io.BytesIO()))
    def test_404(self, _):
        result = site_probe.probe("https://example.test/x")
        self.assertEqual(result["http_status"], 404)
        self.assertFalse(result["ok"])

    def test_html_meta_robots_noindex_flagged(self):
        result = site_probe.inspect_html_indexability(
            b'<html><head><meta name="robots" content="noindex, nofollow"></head></html>'
        )
        self.assertFalse(result["ok"])
        self.assertIn("robots", result["meta_noindex_agents"])

    def test_html_index_allowed(self):
        result = site_probe.inspect_html_indexability(
            b'<meta name="robots" content="index, follow">'
        )
        self.assertTrue(result["ok"])

    def test_header_noindex_flagged(self):
        result = site_probe.inspect_html_indexability(b"<html></html>", "googlebot: noindex, nofollow")
        self.assertFalse(result["ok"])

    def test_robots_root_disallow_flagged(self):
        result = site_probe.inspect_robots_rules(
            b"User-agent: *\\nDisallow: /\\nSitemap: https://example.test/sitemap.xml"
        )
        self.assertFalse(result["ok"])
        self.assertIn("*", result["root_disallow_agents"])

    def test_robots_other_paths_are_allowed(self):
        result = site_probe.inspect_robots_rules(
            b"User-agent: *\\nDisallow: /admin/\\nAllow: /"
        )
        self.assertTrue(result["ok"])

    def test_nonhttps_url(self):
        with self.assertRaises(ValueError):
            site_probe.generate("http://example.test")


if __name__ == "__main__":
    unittest.main()
