/**
 * Humanizer utilities - MINIMAL post-processing + diff generation
 * 
 * PHILOSOPHY: Rule-based transformations create MECHANICAL PATTERNS
 * that AI detectors catch easily. The REAL humanization happens in the
 * AI prompt (persona-based) and temperature (1.2+ for high perplexity).
 * 
 * This file only handles:
 * 1. humanizeText() - Minimal cleanup (only worst AI giveaway phrases)
 * 2. humanizeWithDiff() - Diff HTML generation for UI highlighting
 */

/**
 * MINIMAL humanization - only remove the absolute worst AI giveaway phrases
 * DO NOT add filler words, casual starters, or uniform contractions
 * Those create detectable patterns that make AI detection WORSE
 */
export function humanizeText(text: string, intensity: "light" | "balanced" | "heavy" = "heavy"): string {
  let result = text;
  
  // ONLY remove the worst AI transition words (absolute giveaways)
  const aiGiveaways: [RegExp, string][] = [
    [/\bFurthermore,?\s*/gi, "And "],
    [/\bMoreover,?\s*/gi, "Plus, "],
    [/\bAdditionally,?\s*/gi, "Also, "],
    [/\bNevertheless,?\s*/gi, "Still, "],
    [/\bNonetheless,?\s*/gi, "But still, "],
    [/\bConsequently,?\s*/gi, "So "],
    [/\bIn conclusion,?\s*/gi, ""],
    [/\bTo summarize,?\s*/gi, ""],
    [/\bIn summary,?\s*/gi, ""],
    [/\bIt is important to note that\s*/gi, ""],
    [/\bIt is worth noting that\s*/gi, ""],
    [/\bIt should be noted that\s*/gi, ""],
    [/\bIn today's world,?\s*/gi, "These days, "],
    [/\bIn today's society,?\s*/gi, "Now, "],
    [/\bIn this day and age,?\s*/gi, "Now, "],
    [/\bdelve into\b/gi, "look at"],
    [/\bdelve\b/gi, "look"],
    [/\butilize\b/gi, "use"],
    [/\butilizing\b/gi, "using"],
    [/\bfacilitate\b/gi, "help"],
    [/\bplays a crucial role\b/gi, "matters a lot"],
    [/\bplays a vital role\b/gi, "is key"],
    [/\bplays a significant role\b/gi, "matters"],
  ];

  for (const [pattern, replacement] of aiGiveaways) {
    result = result.replace(pattern, replacement);
  }

  // Fix capitalization after removals
  result = result.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  result = result.charAt(0).toUpperCase() + result.slice(1);
  result = result.replace(/\s+/g, " ").trim();
  
  return result;
}

/**
 * Generate diff HTML showing what changed between original and humanized text
 * Highlights new/changed words in green
 */
export function humanizeWithDiff(
  originalText: string,
  intensity: "light" | "balanced" | "heavy" = "heavy",
  humanizedText?: string
): { html: string; plain: string } {
  const humanized = humanizedText || humanizeText(originalText, intensity);

  // Normalize for comparison (lowercase, remove punctuation)
  const normalize = (t: string) => t.toLowerCase().replace(/[.,!?;:()\[\]{}'"\-—]/g, "").trim();

  // Build sets of original words and n-grams
  const origWords = originalText.split(/\s+/).filter(w => w.trim());
  const origWordSet = new Set<string>();
  const origBigrams = new Set<string>();
  const origTrigrams = new Set<string>();

  for (let i = 0; i < origWords.length; i++) {
    origWordSet.add(normalize(origWords[i]));
    if (i < origWords.length - 1) {
      origBigrams.add(normalize(origWords[i]) + " " + normalize(origWords[i + 1]));
    }
    if (i < origWords.length - 2) {
      origTrigrams.add(
        normalize(origWords[i]) + " " + normalize(origWords[i + 1]) + " " + normalize(origWords[i + 2])
      );
    }
  }

  const humWords = humanized.split(/\s+/).filter(w => w.trim());
  const matched = new Set<number>();

  // Pass 1: Match trigrams (3-word phrases from original)
  for (let i = 0; i < humWords.length - 2; i++) {
    const tri = normalize(humWords[i]) + " " + normalize(humWords[i + 1]) + " " + normalize(humWords[i + 2]);
    if (origTrigrams.has(tri)) {
      matched.add(i);
      matched.add(i + 1);
      matched.add(i + 2);
    }
  }

  // Pass 2: Match bigrams (2-word phrases from original)
  for (let i = 0; i < humWords.length - 1; i++) {
    if (matched.has(i)) continue;
    const bi = normalize(humWords[i]) + " " + normalize(humWords[i + 1]);
    if (origBigrams.has(bi)) {
      matched.add(i);
      matched.add(i + 1);
    }
  }

  // Stop words that shouldn't be highlighted (too common)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "can",
    "must", "not", "no", "so", "if", "as", "it", "its", "this", "that", "than",
    "from", "up", "out", "about", "into", "then", "them", "these", "those", "there",
    "their", "my", "your", "his", "her", "our", "we", "i", "you", "he", "she", "they",
    "me", "him", "us", "what", "who", "which", "how", "when", "where", "all", "each",
    "some", "any", "more", "most", "also", "too", "just", "only", "very", "well",
    "now", "new", "even", "like", "still", "back", "here", "been", "being", "such",
    "own", "same", "other", "over", "after", "before", "between", "through",
  ]);

  // Pass 3: Build HTML with highlights
  const parts: string[] = [];
  for (let i = 0; i < humWords.length; i++) {
    const word = humWords[i];
    const clean = normalize(word);

    // Don't highlight if: matched in n-gram, is a stop word, is short, or exists in original
    if (matched.has(i) || clean.length <= 2 || stopWords.has(clean) || origWordSet.has(clean)) {
      parts.push(word);
    } else {
      parts.push(`<span class="text-green-600 font-medium bg-green-50 px-0.5 rounded">${word}</span>`);
    }

    if (i < humWords.length - 1) parts.push(" ");
  }
  
  return {
    html: parts.join(""),
    plain: humanized,
  };
}
