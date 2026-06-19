import powerVerbs from "../data/powerVerbs.json" with { type: "json" };

export default function readabilityEvaluator({ resumeText = "" }) {

  const PASSIVE_PENALTY = 5;
  const LOW_VERB_PENALTY = 20;
  const WEAK_BULLET_PENALTY = 2;
  const MIN_VERB_DENSITY = 0.5;

  function cleanSentenceStart(sentence) {
    return sentence.replace(/^[\s\u2022\*\u2013\u2014•\-]+/, '').trim();
  }

  function detectDomain(text) {
    if (/react|node|javascript|python|java|aws|sql|docker|kubernetes/gi.test(text)) return "technical";
    if (/managed|led|budget|stakeholder|strategy|p&l|headcount/gi.test(text)) return "management";
    if (/designed|ux|figma|wireframe|prototype|user research/gi.test(text)) return "design";
    return "general";
  }

  function getSentenceCategory(cleanedSentence) {
    const lower = cleanedSentence.toLowerCase();
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(lower)) return "date";
    if (lower.split(/\s+/).length < 4) return "short";
    return "bullet";
  }

  function extractBulletContext(sentence, resumeText) {
    const idx = resumeText.indexOf(sentence);
    if (idx === -1) return null;
    const before = resumeText.slice(Math.max(0, idx - 100), idx);
    const sectionMatch = before.match(
      /(experience|education|projects|skills|summary|achievements|certifications)[^\n]*/i
    );
    return sectionMatch ? sectionMatch[0].trim() : null;
  }

  function scoreWeakBulletSeverity(cleanedSentence) {
    const lower = cleanedSentence.toLowerCase();
    if (/\bresponsible for\b|\bworked on\b|\btasks included\b/i.test(lower)) return "high";
    if (/\bhelped\b|\bassisted\b|\bsupported\b|\bparticipated\b/i.test(lower)) return "medium";
    return "low";
  }

  function buildRewriteSuggestion(cleanedSentence, relevantVerbsForSuggestion) {
    const verb = relevantVerbsForSuggestion[Math.floor(Math.random() * Math.min(5, relevantVerbsForSuggestion.length))] ?? "Led";
    const trimmed = cleanedSentence.replace(/^(responsible for|worked on|tasks included|helped|assisted)/i, "").trim();
    return `${verb} ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
  }

  function estimateSentenceComplexity(sentence) {
    // Strip trailing punctuation so characters like '.' or ',' don't artificially increase word length
    const words = sentence.split(/\s+/).map(word => word.replace(/^[.,;:()]+|[.,;:()]+$/g, ""));
    const wordCount = words.length;
    const longWords = words.filter(w => w.length > 8).length;
    const longWordRatio = longWords / Math.max(1, wordCount);

    if (wordCount > 30 || longWordRatio > 0.4) return "complex";
    if (wordCount > 20 || longWordRatio > 0.25) return "moderate";
    return "simple";
  }

  function detectRepetitiveVerbs(verbsUsed) {
    const freq = {};
    for (const v of verbsUsed) freq[v] = (freq[v] || 0) + 1;
    return Object.entries(freq)
      .filter(([, count]) => count > 2)
      .map(([verb, count]) => ({ verb, count }));
  }

  function scoreBulletLength(sentence) {
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount < 6) return "too_short";
    if (wordCount > 35) return "too_long";
    return "optimal";
  }

  const sentences = resumeText
    .split(/[.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  const allPowerVerbs = Object.values(powerVerbs).flat().map(v => v.toLowerCase());

  const domainEarly = detectDomain(resumeText);
  const relevantVerbsEarly = powerVerbs[domainEarly] ?? powerVerbs.general ?? [];

  const weakBullets = [];
  const passiveVoicePatterns = [
    /\b(?:is|are|was|were|be|been|being)\b\s+\b\w+ed\b/i,
    /\bresponsible for\b/i,
    /\bworked on\b/i,
    /\btasks included\b/i
  ];

  let powerVerbCount = 0;
  let passiveVoiceCount = 0;
  const verbsUsed = [];
  const complexSentences = [];
  const bulletLengthIssues = { too_short: 0, too_long: 0, optimal: 0 };

 sentences.forEach(sentence => {
    const cleanedSentence = cleanSentenceStart(sentence);
    const lowerSentence = cleanedSentence.toLowerCase();
    // Split and cleanly strip trailing/leading structural punctuation from each word token
    const words = lowerSentence.split(/\s+/).map(word => word.replace(/^[.,;:()]+|[.,;:()]+$/g, ""));

    const hasPowerVerb = allPowerVerbs.some(verb => words.slice(0, 4).includes(verb));

    // 1. STYLE & IMPACT EVALUATION
    if (hasPowerVerb) {
      powerVerbCount++;
      const matchedVerb = allPowerVerbs.find(verb => words.slice(0, 4).includes(verb));
      if (matchedVerb) verbsUsed.push(matchedVerb);
    } else {
      const category = getSentenceCategory(cleanedSentence);
      if (category === "bullet") {
        const severity = scoreWeakBulletSeverity(cleanedSentence);
        const section = extractBulletContext(sentence, resumeText);
        const rewrite = buildRewriteSuggestion(cleanedSentence, relevantVerbsEarly);
        weakBullets.push({
          original: sentence,
          cleaned: cleanedSentence,
          reason: "No action verb in first 4 words",
          severity,
          section: section ?? "unknown",
          suggestedRewrite: rewrite,
        });
      }
    }

    // 2. UNIVERSAL STRUCTURAL EVALUATION
    const complexity = estimateSentenceComplexity(cleanedSentence);
    if (complexity === "complex") {
      complexSentences.push({ sentence: cleanedSentence, complexity });
    }

    const lengthScore = scoreBulletLength(cleanedSentence);
    if (bulletLengthIssues[lengthScore] !== undefined) {
      bulletLengthIssues[lengthScore]++;
    }

    // Reset lastIndex for global regex before each test
    passiveVoicePatterns.forEach(p => p.lastIndex = 0);
    if (passiveVoicePatterns.some(pattern => pattern.test(lowerSentence))) {
      passiveVoiceCount++;
    }
  });

  const domain = detectDomain(resumeText);
  const relevantVerbs = powerVerbs[domain] ?? powerVerbs.general ?? [];
  const verbDensity = powerVerbCount / Math.max(1, sentences.length);

  const suggestions = [];

  const highSeverity = weakBullets.filter(b => b.severity === "high");
  const mediumSeverity = weakBullets.filter(b => b.severity === "medium");
  const repetitiveVerbs = detectRepetitiveVerbs(verbsUsed);

  if (passiveVoiceCount > 2) {
    suggestions.push(
      `${passiveVoiceCount} passive voice instances detected. Rewrite with active verbs (e.g., 'Led', 'Built', 'Drove').`
    );
  }

  if (highSeverity.length > 0) {
    suggestions.push(
      `${highSeverity.length} high-severity weak bullets detected. Example rewrite: "${highSeverity[0].suggestedRewrite}"`
    );
  }

  if (mediumSeverity.length > 0) {
    suggestions.push(
      `${mediumSeverity.length} medium-severity weak bullets (e.g., 'Helped...', 'Assisted...'). Replace with ownership verbs.`
    );
  }

  if (verbDensity < MIN_VERB_DENSITY) {
    suggestions.push(
      `Verb density is ${Math.round(verbDensity * 100)}% — below 50%. Strengthen bullets using: ${relevantVerbs.slice(0, 3).join(", ")}.`
    );
  }

  if (repetitiveVerbs.length > 0) {
    const examples = repetitiveVerbs.map(r => `'${r.verb}' (${r.count}x)`).join(", ");
    suggestions.push(
      `Repetitive verbs detected: ${examples}. Vary your language to avoid sounding monotonous.`
    );
  }

  if (complexSentences.length > 2) {
    suggestions.push(
      `${complexSentences.length} overly complex sentences detected. Break them into shorter, punchier bullets.`
    );
  }

  if (bulletLengthIssues.too_long > 1) {
    suggestions.push(
      `${bulletLengthIssues.too_long} bullets exceed 35 words — trim for better ATS and recruiter readability.`
    );
  }

  if (bulletLengthIssues.too_short > 1) {
    suggestions.push(
      `${bulletLengthIssues.too_short} bullets are too short (under 6 words) — add context or metrics.`
    );
  }

  let score = 100;
  if (sentences.length > 0) {
    score -= passiveVoiceCount * PASSIVE_PENALTY;
    if (verbDensity < 0.4) score -= LOW_VERB_PENALTY;
    else if (verbDensity < MIN_VERB_DENSITY) score -= 10;
    score -= Math.min(weakBullets.length * WEAK_BULLET_PENALTY, 20);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    key: "readability_match",
    label: "Readability & Impact",
    score: finalScore,
    summary: finalScore > 80
      ? "Strong use of action verbs and active voice."
      : "Some bullets are weak or use passive voice, which reduces the impact of your experience.",
    details: {
      powerVerbCount,
      passiveVoiceCount,
      verbDensity: parseFloat(verbDensity.toFixed(2)),
      weakBullets: weakBullets.slice(0, 5).map(b => ({
        original: b.original,
        cleaned: b.cleaned,
        severity: b.severity,
        section: b.section,
        suggestedRewrite: b.suggestedRewrite,
        reason: b.reason,
      })),
      weakBulletCount: weakBullets.length,
      highSeverityCount: highSeverity.length,
      mediumSeverityCount: mediumSeverity.length,
      repetitiveVerbs,
      complexSentenceCount: complexSentences.length,
      bulletLengthDistribution: bulletLengthIssues,
      suggestions,
      relevantVerbs,
    },
    meta: {
      sentenceCount: sentences.length,
      isTechnicalDomain: domain === "technical",
      domain,
    }
  };
}