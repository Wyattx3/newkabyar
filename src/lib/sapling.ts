/**
 * Sapling AI API - Detection ONLY
 * Used to measure AI detection score and identify worst sentences
 * Humanization is done by Groq - Sapling is used only to train/test
 */

export interface SaplingSentenceScore {
  score: number;
  sentence: string;
}

export interface SaplingDetectionResult {
  score: number;
  sentence_scores: SaplingSentenceScore[];
}

/**
 * Detect AI content using Sapling AI
 * Score: 0 = human, 1 = AI
 */
export async function detectAI(text: string): Promise<SaplingDetectionResult> {
  const apiKey = process.env.SAPLING_API_KEY?.trim();
  if (!apiKey) throw new Error("SAPLING_API_KEY not configured");

  const response = await fetch("https://api.sapling.ai/api/v1/aidetect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: apiKey, text, sent_scores: true }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[Sapling] Error:", err);
    throw new Error(`Sapling error: ${response.status}`);
  }

  const data = await response.json();
  return {
    score: data.score ?? 0,
    sentence_scores: data.sentence_scores ?? [],
  };
}
