import unittest
import seo_pages

class SitemapSEOTests(unittest.TestCase):
    def test_valid_urls(self):
        urls="".join(f"<url><loc>https://example.test/works/{i}/</loc></url>" for i in range(31))
        data=f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'.encode()
        self.assertEqual(len(seo_pages.sitemap_urls(data,"example.test")),31)

    def test_reject_wrong_host(self):
        data=b'<urlset><url><loc>https://unrelated.test/</loc></url></urlset>'
        with self.assertRaises(ValueError):
            seo_pages.sitemap_urls(data,"example.test")

    def test_reject_duplicate_urls(self):
        data=b'<urlset><url><loc>https://example.test/a</loc></url><url><loc>https://example.test/a</loc></url></urlset>'
        with self.assertRaises(ValueError):
            seo_pages.sitemap_urls(data,"example.test")

    def test_detect_noindex_title_description_canonical(self):
        p=seo_pages.HeadInfo()
        p.feed('<head><title>작품 소개</title><meta name="description" content="설명"><meta name="robots" content="noindex"><link rel="canonical" href="https://example.test/works/a/"></head>')
        self.assertEqual(p.title,"작품 소개")
        self.assertEqual(p.description,"설명")
        self.assertTrue(p.noindex)
        self.assertEqual(p.canonical,"https://example.test/works/a/")

    def test_no_robots_meta_defaults_to_indexable(self):
        p=seo_pages.HeadInfo()
        p.feed('<title>표지 소개</title>')
        self.assertFalse(p.noindex)
        self.assertEqual(p.title,"표지 소개")

if __name__ == "__main__":
    unittest.main()
