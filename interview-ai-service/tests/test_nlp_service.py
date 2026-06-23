import sys
import unittest
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from services.nlp_service import detect_concepts, _generate_search_forms


class TestGenerateSearchForms(unittest.TestCase):
    def test_hyphenated_concept(self):
        forms = _generate_search_forms("virtual-dom")
        self.assertIn("virtual dom", forms)
        self.assertIn("virtualdom", forms)
        self.assertIn("virtual-dom", forms)

    def test_camelcase_concept(self):
        forms = _generate_search_forms("useEffect")
        self.assertIn("use effect", forms)
        self.assertIn("useeffect", forms)

    def test_underscore_concept(self):
        forms = _generate_search_forms("time_complexity")
        self.assertIn("time complexity", forms)
        self.assertIn("time_complexity", forms)


class TestDetectConcepts(unittest.TestCase):
    def test_empty_transcript_returns_all_missed(self):
        result = detect_concepts("", ["virtual-dom", "reconciliation"])
        self.assertEqual(result["detected"], [])
        self.assertEqual(result["missed"], ["virtual-dom", "reconciliation"])
        self.assertEqual(result["relevance"], 0)

    def test_whitespace_only_transcript(self):
        result = detect_concepts("   \n\t  ", ["react", "node"])
        self.assertEqual(result["detected"], [])
        self.assertEqual(result["relevance"], 0)

    def test_detects_hyphenated_concept(self):
        result = detect_concepts(
            "I have worked with virtual dom and reconciliation in React.",
            ["virtual-dom", "reconciliation"]
        )
        self.assertIn("virtual-dom", result["detected"])
        self.assertIn("reconciliation", result["detected"])

    def test_detects_camelcase_as_space_separated(self):
        result = detect_concepts(
            "I used use effect and useEffect in my components.",
            ["useEffect"]
        )
        self.assertIn("useEffect", result["detected"])

    def test_partial_detection(self):
        result = detect_concepts(
            "I know about virtual dom.",
            ["virtual-dom", "closure"]
        )
        self.assertIn("virtual-dom", result["detected"])
        self.assertIn("closure", result["missed"])

    def test_relevance_score_full_detection(self):
        result = detect_concepts(
            "I use virtual dom reconciliation closure and closures every day.",
            ["virtual-dom", "reconciliation", "closure"]
        )
        self.assertEqual(result["relevance"], 100)

    def test_relevance_score_partial_detection(self):
        result = detect_concepts(
            "I talk about virtual dom only.",
            ["virtual-dom", "closure"]
        )
        self.assertEqual(result["relevance"], 50)

    def test_relevance_score_empty_concepts(self):
        result = detect_concepts("I talk about React.", [])
        self.assertEqual(result["relevance"], 0)
        self.assertEqual(result["detected"], [])
        self.assertEqual(result["missed"], [])

    def test_case_insensitive_detection(self):
        result = detect_concepts("I know about VIRTUAL DOM and Virtual Dom.", ["virtual-dom"])
        self.assertIn("virtual-dom", result["detected"])

    def test_returns_correct_structure(self):
        result = detect_concepts("I use React.", ["react"])
        self.assertIn("detected", result)
        self.assertIn("missed", result)
        self.assertIn("relevance", result)
        self.assertIsInstance(result["detected"], list)
        self.assertIsInstance(result["missed"], list)
        self.assertIsInstance(result["relevance"], int)


if __name__ == "__main__":
    unittest.main()
