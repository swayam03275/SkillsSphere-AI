import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.nlp_service import detect_concepts


class TestDetectConcepts:
    def test_empty_transcript_returns_zero_relevance(self):
        result = detect_concepts("", ["react", "node"])
        assert result["detected"] == []
        assert result["missed"] == ["react", "node"]
        assert result["relevance"] == 0

    def test_whitespace_only_transcript_returns_zero_relevance(self):
        result = detect_concepts("   \n\t  ", ["react", "node"])
        assert result["relevance"] == 0
        assert set(result["missed"]) == {"react", "node"}

    def test_exact_concept_match_is_detected(self):
        result = detect_concepts(
            "I have experience with React and Node.js",
            ["react", "node"]
        )
        assert "react" in result["detected"]
        assert "node" in result["detected"]
        assert result["relevance"] == 100

    def test_hyphenated_concept_matches_all_forms(self):
        result = detect_concepts(
            "The virtual dom is used by React for efficient updates",
            ["virtual-dom"]
        )
        assert "virtual-dom" in result["detected"]

    def test_camelCase_concept_matches_space_and_no_separator_forms(self):
        result = detect_concepts(
            "We use useeffect for side effects in React components",
            ["useEffect"]
        )
        assert "useEffect" in result["detected"]

    def test_underscore_concept_matches_spaced_form(self):
        result = detect_concepts(
            "The time complexity of this algorithm is O(n log n)",
            ["time_complexity"]
        )
        assert "time_complexity" in result["detected"]

    def test_partial_match_some_concepts_detected(self):
        result = detect_concepts(
            "I have experience with React and Python",
            ["react", "node", "python", "docker"]
        )
        assert "react" in result["detected"]
        assert "python" in result["detected"]
        assert "node" in result["missed"]
        assert "docker" in result["missed"]
        assert result["relevance"] == 50

    def test_relevance_score_calculation(self):
        result = detect_concepts(
            "This answer covers graph algorithms and dynamic programming",
            ["graph", "dynamic-programming", "recursion", "sorting"]
        )
        expected_relevance = round((2 / 4) * 100)
        assert result["relevance"] == expected_relevance

    def test_empty_concepts_list_returns_zero_relevance(self):
        result = detect_concepts("Some answer text", [])
        assert result["detected"] == []
        assert result["missed"] == []
        assert result["relevance"] == 0

    def test_punctuation_is_removed_for_matching(self):
        result = detect_concepts(
            "React, Node.js, and Docker: essential tools!",
            ["react", "node", "docker"]
        )
        assert "react" in result["detected"]
        assert "node" in result["detected"]
        assert "docker" in result["detected"]

    def test_case_insensitive_matching(self):
        result = detect_concepts(
            "I KNOW REACT AND NODE.JS",
            ["react", "node"]
        )
        assert "react" in result["detected"]
        assert "node" in result["detected"]
