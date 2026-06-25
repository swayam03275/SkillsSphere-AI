import sys
import unittest
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from services.communication_analyzer import analyze_communication, FILLER_WORDS  # noqa: E402


class CommunicationAnalyzerTests(unittest.TestCase):
    def test_empty_transcript_returns_zero_score(self):
        result = analyze_communication("")
        self.assertEqual(result["communication"], 0)
        self.assertEqual(result["fillerWords"], 0)
        self.assertEqual(result["speakingSpeed"], "normal")
        self.assertEqual(result["details"]["wordCount"], 0)
        self.assertEqual(result["details"]["sentenceCount"], 0)
        self.assertEqual(result["details"]["avgSentenceLength"], 0)

    def test_whitespace_only_transcript_returns_zero_score(self):
        result = analyze_communication("   \n\t  ")
        self.assertEqual(result["communication"], 0)

    def test_filler_word_detection_um(self):
        result = analyze_communication(
            "Um, I think the answer is um, let me think about it."
        )
        self.assertGreater(result["fillerWords"], 0)

    def test_filler_word_detection_like(self):
        result = analyze_communication(
            "Like basically like you know like basically it's like really important."
        )
        self.assertGreater(result["fillerWords"], 0)

    def test_filler_word_detection_multiple_types(self):
        result = analyze_communication(
            "Um, basically I mean like kind of sort of right okay so yeah."
        )
        # Should detect at least 5 filler words
        self.assertGreaterEqual(result["fillerWords"], 5)

    def test_speaking_speed_slow_for_short_answer(self):
        result = analyze_communication("Yes.")
        self.assertEqual(result["speakingSpeed"], "slow")

    def test_speaking_speed_fast_for_long_answer(self):
        long_text = " ".join(["word"] * 201)
        result = analyze_communication(long_text)
        self.assertEqual(result["speakingSpeed"], "fast")

    def test_speaking_speed_normal_for_moderate_answer(self):
        result = analyze_communication(" ".join(["word"] * 50))
        self.assertEqual(result["speakingSpeed"], "normal")

    def test_communication_score_bounded_0_to_100(self):
        # Very short answer with many filler words
        result = analyze_communication("Um um um.")
        self.assertGreaterEqual(result["communication"], 0)
        self.assertLessEqual(result["communication"], 100)

        # Well-structured answer
        well_structured = (
            "The primary benefit of React is component reusability. "
            "It allows developers to build encapsulated components that manage their own state. "
            "This leads to more maintainable code. "
            "Additionally virtual DOM improves performance."
        )
        result2 = analyze_communication(well_structured)
        self.assertGreater(result2["communication"], 0)
        self.assertLessEqual(result2["communication"], 100)

    def test_sentence_counting(self):
        result = analyze_communication(
            "First sentence here. Second sentence there. Third sentence."
        )
        self.assertEqual(result["details"]["sentenceCount"], 3)

    def test_avg_sentence_length_calculation(self):
        result = analyze_communication(
            "One. Two three. Four five six."
        )
        # 6 words: One, Two, three, Four, five, six; 3 sentences
        self.assertEqual(result["details"]["wordCount"], 6)
        self.assertEqual(result["details"]["sentenceCount"], 3)
        # avg sentence length = 6 / 3 = 2.0 -> rounded to 2
        self.assertEqual(result["details"]["avgSentenceLength"], 2)

    def test_filler_words_score_penalty(self):
        no_filler = "I believe this approach solves the problem efficiently."
        with_filler = "Um, I um believe this approach solves the problem efficiently."
        result1 = analyze_communication(no_filler)
        result2 = analyze_communication(with_filler)
        self.assertLess(
            result2["communication"],
            result1["communication"],
            "Transcript with filler words should score lower"
        )

    def test_structure_bonus_for_multiple_sentences(self):
        short = "Answer."
        long = "First sentence. Second sentence. Third sentence."
        result_short = analyze_communication(short)
        result_long = analyze_communication(long)
        # Multi-sentence answer should score at least as well (not worse) due to structure bonus
        self.assertGreaterEqual(
            result_long["communication"],
            result_short["communication"]
        )

    def test_result_structure_keys(self):
        result = analyze_communication("A typical interview answer.")
        self.assertIn("communication", result)
        self.assertIn("fillerWords", result)
        self.assertIn("speakingSpeed", result)
        self.assertIn("details", result)
        self.assertIn("wordCount", result["details"])
        self.assertIn("sentenceCount", result["details"])
        self.assertIn("avgSentenceLength", result["details"])


if __name__ == "__main__":
    unittest.main()
