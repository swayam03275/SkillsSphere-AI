import sys
import unittest
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from services.nlp_service import detect_concepts, _generate_search_forms  # noqa: E402


class DetectConceptsTests(unittest.TestCase):
    def test_empty_transcript_returns_zero_detected_and_full_missed(self):
        result = detect_concepts("", ["virtual-dom", "reconciliation"])
        self.assertEqual(result["detected"], [])
        self.assertEqual(result["missed"], ["virtual-dom", "reconciliation"])
        self.assertEqual(result["relevance"], 0)

    def test_whitespace_only_transcript_returns_zero_relevance(self):
        result = detect_concepts("   \n\t  ", ["foo", "bar"])
        self.assertEqual(result["relevance"], 0)
        self.assertEqual(result["detected"], [])
        self.assertEqual(result["missed"], ["foo", "bar"])

    def test_single_concept_detected(self):
        result = detect_concepts(
            "The virtual DOM is a representation of the real DOM in memory.",
            ["virtual-dom"]
        )
        self.assertIn("virtual-dom", result["detected"])
        self.assertEqual(result["relevance"], 100)

    def test_multiple_concepts_some_found_some_missed(self):
        # Reconciliation appears clearly; useEffect uses camelCase split to find "use effect"
        result = detect_concepts(
            "React reconciliation works well. Also use effect is a key hook.",
            ["reconciliation", "useEffect", "hooks"]
        )
        self.assertIn("reconciliation", result["detected"])
        self.assertIn("useEffect", result["detected"])
        self.assertIn("hooks", result["missed"])
        # 2 out of 3 found
        self.assertEqual(result["relevance"], round((2 / 3) * 100))

    def test_no_concepts_matched_returns_zero_relevance(self):
        result = detect_concepts(
            "This is a completely unrelated text about cooking dinner.",
            ["virtual-dom", "hooks", "useEffect"]
        )
        self.assertEqual(result["detected"], [])
        self.assertEqual(result["missed"], ["virtual-dom", "hooks", "useEffect"])
        self.assertEqual(result["relevance"], 0)

    def test_all_concepts_detected_returns_100_relevance(self):
        result = detect_concepts(
            "The reconciliation algorithm and virtual dom are key React concepts.",
            ["virtual-dom", "reconciliation"]
        )
        self.assertEqual(len(result["detected"]), 2)
        self.assertEqual(result["missed"], [])
        self.assertEqual(result["relevance"], 100)

    def test_concept_detection_is_case_insensitive(self):
        result = detect_concepts(
            "VIRTUAL DOM and RECONCILIATION are important.",
            ["virtual-dom", "reconciliation"]
        )
        self.assertEqual(len(result["detected"]), 2)

    def test_empty_concepts_list_returns_100_relevance(self):
        result = detect_concepts("Some text about anything.", [])
        self.assertEqual(result["detected"], [])
        self.assertEqual(result["missed"], [])
        self.assertEqual(result["relevance"], 0)


class GenerateSearchFormsTests(unittest.TestCase):
    def test_hyphenated_concept_forms(self):
        forms = _generate_search_forms("virtual-dom")
        forms_lower = [f.lower() for f in forms]
        self.assertIn("virtual dom", forms_lower)
        self.assertIn("virtualdom", forms_lower)
        self.assertIn("virtual-dom", forms_lower)

    def test_camelcase_concept_forms(self):
        forms = _generate_search_forms("useEffect")
        forms_lower = [f.lower() for f in forms]
        self.assertIn("use effect", forms_lower)
        self.assertIn("useeffect", forms_lower)

    def test_underscore_concept_forms(self):
        forms = _generate_search_forms("time_complexity")
        forms_lower = [f.lower() for f in forms]
        self.assertIn("time complexity", forms_lower)
        self.assertIn("time_complexity", forms_lower)

    def test_plain_word_concept_forms(self):
        forms = _generate_search_forms("render")
        self.assertIn("render", forms)
        # Lowercase version should be present
        self.assertTrue(any(f == "render" for f in forms))


if __name__ == "__main__":
    unittest.main()
