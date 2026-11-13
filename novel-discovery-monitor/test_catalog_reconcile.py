import json
import unittest
import catalog_reconcile as c

class ReconcileTests(unittest.TestCase):
    def test_shelf_catalog(self):
        src = '[ "skip"]\n  ["작품 A","[곰같은여우]","1234567","best","a","판타지"],\n  ["작품 B","닥터X","1234568","challenge","b","로맨스"],'
        works=c.parse_shelf(src)
        self.assertEqual(len(works),2)
        self.assertEqual(works["1234568"]["title"],"작품 B")

    def test_no_match_if_author_unexpected(self):
        with self.assertRaises(ValueError):
            c.parse_shelf('["A","Other","1111111","best"]')

    def test_detect_missing_novel_id(self):
        shelf={"1111111":{"id":"1111111","title":"첫번째","author":"[곰같은여우]","league":"best"},
               "2222222":{"id":"2222222","title":"추가작품","author":"닥터X","league":"challenge"}}
        r=c.compare(shelf, {"1111111"},1)
        self.assertEqual(r["status"],"mismatch")
        self.assertEqual(r["missing_from_published"][0]["title"],"추가작품")

    def test_matching(self):
        shelf={"1111111":{"id":"1111111","title":"A","author":"[ZERO]","league":"best"}}
        r=c.compare(shelf, {"1111111"},1)
        self.assertEqual(r["status"],"match")

    def test_reject_bad_published_count(self):
        with self.assertRaises(ValueError):
            c.parse_published(json.dumps({"catalog_count":30,"works":{"111":1}}).encode())

    def test_published_schema(self):
        ids,count=c.parse_published(json.dumps({"catalog_count":2,"works":{"111":4,"222":5}}).encode())
        self.assertEqual(count,2)
        self.assertEqual(ids,{"111","222"})

    def test_reject_unknown_schema(self):
        with self.assertRaises(ValueError):
            c.parse_published(b'{"items":[{"id":"11"}]}')

if __name__=="__main__":
    unittest.main()
