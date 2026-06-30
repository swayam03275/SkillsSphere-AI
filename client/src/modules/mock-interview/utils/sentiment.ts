// A lightweight, browser-safe sentiment intensity analyzer to replace server-only 'vader-sentiment'
const POSITIVE_WORDS = new Set([
  'great', 'excellent', 'good', 'awesome', 'perfect', 'wonderful', 'beautiful',
  'strong', 'confident', 'easy', 'successful', 'success', 'happy', 'positive',
  'best', 'amazing', 'effective', 'efficient', 'smart', 'improve', 'growth',
  'clean', 'reliable', 'stable', 'fast', 'love', 'like', 'helpful', 'glad',
  'creative', 'innovative', 'skillful', 'mastery', 'expert', 'quality', 'safe',
  'secure', 'scalable', 'robust', 'optimize', 'productive', 'correct', 'right'
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'poor', 'weak', 'fail', 'failure', 'error', 'difficult', 'hard',
  'unsuccessful', 'slow', 'unstable', 'unreliable', 'worst', 'issue', 'problem',
  'bug', 'defect', 'negative', 'wrong', 'unhappy', 'sad', 'hate', 'worry',
  'afraid', 'scared', 'break', 'crash', 'risk', 'danger', 'complex', 'mess',
  'inefficient', 'flaw', 'harm', 'loss', 'waste', 'struggle', 'stuck', 'pain'
]);

class SimpleSentimentAnalyzer {
  polarity_scores(text) {
    if (!text) return { pos: 0, neg: 0, neu: 1, compound: 0 };
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    let posCount = 0;
    let negCount = 0;
    
    words.forEach(word => {
      if (POSITIVE_WORDS.has(word)) posCount++;
      else if (NEGATIVE_WORDS.has(word)) negCount++;
    });
    
    const total = posCount + negCount;
    if (total === 0) {
      return { pos: 0, neg: 0, neu: 1, compound: 0 };
    }
    
    // Normalize compounds to a -1 to 1 range
    const diff = posCount - negCount;
    const compound = diff / Math.sqrt(diff * diff + 15);
    const pos = posCount / words.length;
    const neg = negCount / words.length;
    const neu = 1 - (pos + neg);
    
    return { pos, neg, neu, compound };
  }
}

const analyzer = new SimpleSentimentAnalyzer();

const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of'];

export const analyzeText = (text) => {
  if (!text || text.trim() === '') {
    return {
      confidence: 100,
      tone: 50,
      hesitationCount: 0,
      positivity: 50,
    };
  }

  // Sentiment Analysis
  const sentimentResult = analyzer.polarity_scores(text);
  // compound is from -1 to 1. Map to 0-100.
  const toneScore = Math.round(((sentimentResult.compound + 1) / 2) * 100);

  // Hesitation Analysis
  const lowerText = text.toLowerCase();
  const cleanText = lowerText.replace(/[.,!?]/g, ' ');
  const words = lowerText.split(/\s+/);
  let hesitationCount = 0;
  
  FILLER_WORDS.forEach(filler => {
    // Match whole words/phrases to handle both single and multi-word fillers
    const regex = new RegExp(`\\b${filler}\\b`, 'g');
    const matches = cleanText.match(regex);
    if (matches) {
      hesitationCount += matches.length;
    }
  });

  // Calculate composite confidence score (0-100)
  // Baseline 100. Each hesitation drops it by 2 points (for long texts we might need a ratio, but this is simple real-time)
  // We'll calculate a hesitation ratio: hesitations per 10 words
  const wordsLength = words.length > 0 ? words.length : 1;
  const hesitationRatio = hesitationCount / wordsLength; // e.g., 2 / 10 = 0.2
  
  // High hesitation ratio (e.g. > 0.1) drops confidence significantly
  let confidenceScore = 100 - (hesitationRatio * 300); // 10% hesitation = 30 points drop
  
  // Adjust confidence slightly based on sentiment (positive tone increases confidence slightly)
  if (sentimentResult.compound > 0.2) confidenceScore += 5;
  if (sentimentResult.compound < -0.2) confidenceScore -= 5;
  
  confidenceScore = Math.max(0, Math.min(100, Math.round(confidenceScore)));

  return {
    confidence: confidenceScore,
    tone: toneScore,
    hesitationCount,
    positivity: Math.round(sentimentResult.pos * 100)
  };
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
