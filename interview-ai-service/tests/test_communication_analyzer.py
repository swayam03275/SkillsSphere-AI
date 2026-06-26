import sys
import unittest
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from services.communication_analyzer import (
    analyze_communication,
    FILLER_WORDS,
)


class CommunicationAnalyzerTests(unittest.TestCase):
    def test_empty_transcript_returns_zero_score(self):
        result = analyze_communication("")
        self.assertEqual(result["communication"], 0)
        self.assertEqual(result["fillerWords"], 0)
        self.assertEqual(result["speakingSpeed"], "normal")
        self.assertEqual(result["details"]["wordCount"], 0)

    def test_whitespace_only_transcript_returns_zero_score(self):
        result = analyze_communication("   \n\t  ")
        self.assertEqual(result["communication"], 0)
        self.assertEqual(result["fillerWords"], 0)

    def test_filler_word_um_is_detected(self):
        result = analyze_communication("Um, I think this is correct.")
        self.assertGreater(result["fillerWords"], 0)

    def test_filler_word_uh_is_detected(self):
        result = analyze_communication("Uh, let me explain.")
        self.assertGreater(result["fillerWords"], 0)

    def test_filler_word_like_is_detected(self):
        result = analyze_communication("It's like, you know, really important.")
        self.assertGreater(result["fillerWords"], 0)

    def test_filler_word_basically_is_detected(self):
        result = analyze_communication("Basically, I solved the issue.")
        self.assertGreater(result["fillerWords"], 0)

    def test_speaking_speed_slow_under_20_words(self):
        result = analyze_communication("The answer is forty two.")
        self.assertEqual(result["speakingSpeed"], "slow")
        self.assertLess(result["details"]["wordCount"], 20)

    def test_speaking_speed_normal_20_to_200_words(self):
        words = "The solution involves three steps. First, we analyze the problem. " * 5
        result = analyze_communication(words)
        self.assertEqual(result["speakingSpeed"], "normal")

    def test_speaking_speed_fast_over_200_words(self):
        # 25 sentences of ~9 words each = ~225 words, qualifies as fast
        words = "The solution involves multiple components and provides significant value. " * 25
        result = analyze_communication(words)
        self.assertGreater(result["details"]["wordCount"], 200)
        self.assertEqual(result["speakingSpeed"], "fast")

    def test_score_base_plus_filler_penalty(self):
        # Short answer with no fillers
        result1 = analyze_communication("I solved the problem using a hash map.")
        # Same answer with 3 fillers
        result2 = analyze_communication("Um, uh, like I solved the problem using a hash map.")
        # Score with more fillers should be lower
        self.assertLess(result2["communication"], result1["communication"])

    def test_score_bonus_for_ideal_length_30_to_150_words(self):
        # Ideal length (30-150 words)
        ideal = " ".join(["The system architecture follows a microservices pattern."] * 5)
        result_ideal = analyze_communication(ideal)
        # Too short
        short = "The system uses microservices."
        result_short = analyze_communication(short)
        self.assertGreater(
            result_ideal["communication"],
            result_short["communication"],
        )

    def test_score_bonus_for_structured_answers(self):
        # 3 longer sentences that should qualify for sentence structure bonus
        structured = (
            "I identified the root cause of the performance issue in the production system. "
            "Then I wrote a comprehensive test suite to prevent regression failures. "
            "Finally I fixed the memory leak and verified the improvement across all environments."
        )
        result = analyze_communication(structured)
        self.assertGreaterEqual(result["details"]["sentenceCount"], 3)
        self.assertGreater(result["communication"], 0)

    def test_score_clamped_between_0_and_100(self):
        # Maximum filler + minimum length should still be >= 0
        worst = "um uh um uh um"
        result = analyze_communication(worst)
        self.assertGreaterEqual(result["communication"], 0)
        self.assertLessEqual(result["communication"], 100)

        # Very structured, no filler, ideal length should be <= 100
        best = "The key insight is threefold. First identify the root cause. "
        best += "Second implement the solution. Third verify the results. "
        best += "The implementation reduces latency by fifty percent. "
        best += "Testing confirms the improvement across all scenarios."
        result_best = analyze_communication(best)
        self.assertLessEqual(result_best["communication"], 100)

    def test_avgSentenceLength_calculation(self):
        result = analyze_communication("Short. Another short sentence. And one more.")
        # 3 sentences, each short
        self.assertGreater(result["details"]["avgSentenceLength"], 0)

    def test_wordCount_matches_actual_words(self):
        text = "The quick brown fox jumps"
        result = analyze_communication(text)
        self.assertEqual(result["details"]["wordCount"], 5)

    def test_multiple_filler_types_are_counted(self):
        text = "Um, basically, I mean, like, actually this is correct."
        result = analyze_communication(text)
        self.assertGreater(result["fillerWords"], 2)


if __name__ == "__main__":
    unittest.main()
