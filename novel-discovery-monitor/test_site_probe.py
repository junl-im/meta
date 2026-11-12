import unittest
from unittest import mock
from urllib.error import URLError, HTTPError
import socket
import io
import site_probe


class FakeResponse:
    status = 200
    headers = {"Content-Type": "application/json"}
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, n): return b'{"works": []}'


class Tests(unittest.TestCase):
    @mock.patch("site_probe.urllib.request.urlopen", return_value=FakeResponse())
    def test_json_success(self, _):
        result = site_probe.probe("https://example.test/data/view-counts.json")
        self.assertTrue(result["ok"])
        self.assertTrue(result["json_valid"])

    @mock.patch("site_probe.urllib.request.urlopen", side_effect=URLError(socket.gaierror(-2, "not known")))
    def test_dns_failure(self, _):
        self.assertEqual(site_probe.probe("https://example.test/")["error_class"], "dns_error")

    @mock.patch("site_probe.urllib.request.urlopen", side_effect=HTTPError("https://example.test", 404, "Not Found", {}, io.BytesIO()))
    def test_404(self, _):
        result = site_probe.probe("https://example.test/x")
        self.assertEqual(result["http_status"], 404)
        self.assertFalse(result["ok"])

    def test_nonhttps_url(self):
        with self.assertRaises(ValueError):
            site_probe.generate("http://example.test")


if __name__ == "__main__":
    unittest.main()
