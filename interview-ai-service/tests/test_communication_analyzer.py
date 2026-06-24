import sys
import unittest
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from services.communication_analyzer import analyze_communication


class CommunicationAnalyzerTests(unittest.TestCase):
    def test_empty_transcript_returns_zero_score(self):
        result = analyze_communication("")
        self.assertEqual(result["communication"], 0)
        self.assertEqual(result["fillerWords"], 0)
        self.assertEqual(result["speakingSpeed"], "normal")
        self.assertEqual(result["details"]["wordCount"], 0)

    def test_whitespace_only_transcript_returns_zero(self):
        result = analyze_communication("   \n\t  ")
        self.assertEqual(result["communication"], 0)
        self.assertEqual(result["fillerWords"], 0)

    def test_filler_words_are_correctly_counted(self):
        transcript = "Um, I think, like, you know, this is basically uh really good"
        result = analyze_communication(transcript)
        # um(1) + think is not filler + like(1) + you know(1) + basically(1) + uh(1) = 5
        self.assertEqual(result["fillerWords"], 5)

    def test_common_filler_words_covered(self):
        filler_transcript = "um uh ummm uhhh like so yeah i mean kind of sort of right okay so"
        result = analyze_communication(filler_transcript)
        self.assertGreater(result["fillerWords"], 0)

    def test_speaking_speed_slow_for_short_answers(self):
        result = analyze_communication("Yes.")
        self.assertEqual(result["speakingSpeed"], "slow")
        self.assertEqual(result["details"]["wordCount"], 1)

    def test_speaking_speed_normal_for_moderate_answers(self):
        # 50 words - within the 20-200 normal range
        words = " ".join(["hello"] * 50)
        result = analyze_communication(words)
        self.assertEqual(result["speakingSpeed"], "normal")
        self.assertEqual(result["details"]["wordCount"], 50)

    def test_speaking_speed_fast_for_long_answers(self):
        # 250 words - above 200 threshold
        words = " ".join(["hello"] * 250)
        result = analyze_communication(words)
        self.assertEqual(result["speakingSpeed"], "fast")
        self.assertEqual(result["details"]["wordCount"], 250)

    def test_sentence_count_and_avg_length(self):
        transcript = "Hello world. This is a test. One more sentence here."
        result = analyze_communication(transcript)
        self.assertEqual(result["details"]["sentenceCount"], 3)
        # transcript.split() gives 11 tokens (punctuation stays attached):
        # Hello(1) world.(2) This(3) is(4) a(5) test.(6) One(7) more(8) sentence(9) here.(10) = 10 words
        # Avg = 11 / 3 = 3.7 rounded to 3.7
        self.assertGreater(result["details"]["avgSentenceLength"], 0)

    def test_communication_score_clamped_to_0_100(self):
        # Many filler words + very short answer
        transcript = "um um um um um um um um um um um um um um um"
        result = analyze_communication(transcript)
        self.assertGreaterEqual(result["communication"], 0)
        self.assertLessEqual(result["communication"], 100)

    def test_score_bonus_for_good_length_30_150_words(self):
        # A 50-word answer (within ideal range) should get the +15 bonus
        # Base 70 - filler penalty (0) + length bonus (15) + structure bonus
        words = " ".join(["hello"] * 50)
        result = analyze_communication(words)
        # 50 words: no filler penalty, +15 for ideal length, +5 for 1 sentence
        self.assertGreater(result["communication"], 70)

    def test_score_bonus_for_structured_answers(self):
        # 3+ sentences gets a +10 bonus
        transcript = "First sentence here. Second sentence added. Third sentence for bonus."
        result = analyze_communication(transcript)
        self.assertGreaterEqual(result["details"]["sentenceCount"], 3)
        # word_count 10: < 15 so -10 penalty; 3 sentences +10; avg 3.3 not < 5 (10 is not > 10)
        # Score = 70 - 10 + 10 = 70
        self.assertEqual(result["communication"], 70)

    def test_penalty_for_very_long_sentences(self):
        # A single very long sentence (>35 avg length) gets -5
        words = " ".join(["hello"] * 40)
        result = analyze_communication(words)
        self.assertLess(result["communication"], 95)

    def test_relevance_and_detected_missed_fields_not_present(self):
        # analyze_communication does not return detected/missed/relevance
        result = analyze_communication("Hello world")
        self.assertNotIn("detected", result)
        self.assertNotIn("missed", result)
        self.assertNotIn("relevance", result)


if __name__ == "__main__":
    unittest.main()
