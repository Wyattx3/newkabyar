import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLanguageInstruction, type AILanguage } from "@/lib/language-utils";
import { humanizeWithDiff } from "@/lib/humanizer-utils";
import { checkCredits, deductCredits } from "@/lib/credits";
import type { ModelTier } from "@/lib/ai-providers";
import { GROQ_MODELS } from "@/lib/ai-providers/groq";
import {
  applyDictionary,
  measureCoverage,
  selectInterjection,
  INTERJECTIONS,
} from "@/lib/humanizer-dictionary";
import { z } from "zod";

// ============================================================
// HUMANIZER - Hybrid Code+AI Approach
//
// TESTED WITH SAPLING AI DETECTOR (offline, not in production):
// - Pure code dictionary: 0.0-0.6% AI for most texts
// - AI rewrites: always 100% detectable
//
// APPROACH:
// 1. PRIMARY: Apply comprehensive phrase dictionary (code-level, 0% fingerprint)
// 2. FALLBACK: If dictionary coverage < 20%, use AI phrase mapping
// 3. POST: Add interjections to break document-level patterns
// ============================================================

const humanizeSchema = z.object({
  text: z.string().min(10).max(50000),
  tone: z.enum(["formal", "casual", "academic", "natural"]).default("natural"),
  intensity: z.enum(["light", "balanced", "heavy"]).default("heavy"),
  model: z.enum(["super-smart", "pro-smart", "normal", "fast"]).optional(),
  language: z.enum(["en", "my", "zh", "th", "ko", "ja"]).optional(),
});

function wc(t: string): number {
  return t.split(/\s+/).filter(w => w.trim().length > 0).length;
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(s => s.length > 5) || [text];
}

// ============================================================
// AI FALLBACK: Phrase-by-phrase mapping via Groq
// Only used when dictionary coverage is too low
// ============================================================
async function groqJSON(system: string, user: string, temp: number = 0.3): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODELS.kimi,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: temp,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  return (await res.json()).choices[0]?.message?.content || "";
}

interface ChunkMapping {
  chunk: string;
  casual: string;
}

const MAPPING_PROMPT = `You are a phrase-by-phrase text humanizer. Given a sentence, split it into chunks and provide a casual, human-sounding version of each chunk.

RULES:
1. Cover the ENTIRE sentence - every word must be in a chunk
2. Break into 3-6 meaningful chunks
3. Keep exact same meaning
4. Casual replacements: contractions, simple words, talking style
5. AVOID AI patterns: "one of the most", "cannot be overstated", "has emerged"
6. Return ONLY JSON array: [{"chunk":"original","casual":"replacement"}]`;

async function mapSentenceWithAI(sentence: string): Promise<string | null> {
  try {
    const result = await groqJSON(MAPPING_PROMPT, `Map:\n${sentence}`, 0.4);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const mapping = JSON.parse(jsonMatch[0]) as ChunkMapping[];
    let reassembled = mapping.map(m => m.casual).join(" ");
    if (!/[.!?]$/.test(reassembled)) reassembled += ".";
    return reassembled;
  } catch {
    return null;
  }
}

// ============================================================
// CLEANUP (code-level)
// ============================================================
function cleanup(text: string): string {
  let r = text;
  r = r.replace(/\s+/g, " ").trim();
  r = r.replace(/\.\s+([a-z])/g, (_, c) => ". " + c.toUpperCase());
  if (r.length > 0) r = r.charAt(0).toUpperCase() + r.slice(1);
  // Fix double punctuation
  r = r.replace(/\.\./g, ".").replace(/\?\?/g, "?").replace(/!!/g, "!");
  return r;
}

// ============================================================
// MAIN HUMANIZE FUNCTION
// ============================================================
async function humanizeText(text: string, tone: string, intensity: string): Promise<string> {
  const totalWC = wc(text);

  // ========================================
  // STEP 1: Apply dictionary (code-level, 0% AI fingerprint)
  // ========================================
  let result = applyDictionary(text);
  const coverage = measureCoverage(text, result);
  console.log(`[Humanize] Dictionary coverage: ${(coverage * 100).toFixed(1)}%`);

  // ========================================
  // STEP 2: If coverage is low, use AI fallback for remaining sentences
  // ========================================
  if (coverage < 0.15 && intensity !== "light") {
    console.log("[Humanize] Low coverage, using AI phrase mapping fallback");
    const sentences = splitSentences(result);
    const enhanced: string[] = [];

    for (const sent of sentences) {
      // Check if this sentence was mostly unchanged
      const sentCoverage = measureCoverage(
        text.substring(text.toLowerCase().indexOf(sent.toLowerCase().substring(0, 20))),
        sent
      );
      if (sentCoverage < 0.1) {
        // This sentence barely changed - try AI mapping
        const aiResult = await mapSentenceWithAI(sent);
        enhanced.push(aiResult || sent);
      } else {
        enhanced.push(sent);
      }
    }

    result = enhanced.join(" ");
    result = cleanup(result);
  }

  // ========================================
  // STEP 3: Add interjections (breaks document-level AI patterns)
  // ========================================
  const sentences = splitSentences(result);
  if (sentences.length >= 3) {
    const withInterjections: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
      withInterjections.push(sentences[i]);
      // Inject every 2 sentences (deterministic based on text content)
      if (i < sentences.length - 1 && i % 2 === 1) {
        withInterjections.push(selectInterjection(text, i));
      }
    }
    result = withInterjections.join(" ");
  } else if (sentences.length >= 1 && sentences.length < 3) {
    // Short text: add one interjection at the end
    const seed = text.split("").reduce((a, c, j) => a + c.charCodeAt(0) * (j + 1), 0);
    result = result + " " + INTERJECTIONS[seed % INTERJECTIONS.length];
  }

  result = cleanup(result);

  // ========================================
  // STEP 4: Word count control
  // ========================================
  const finalWC = wc(result);
  if (finalWC > totalWC * 1.3) {
    const words = result.split(/\s+/);
    result = words.slice(0, Math.ceil(totalWC * 1.15)).join(" ");
    if (!/[.!?]$/.test(result)) result += ".";
    result = cleanup(result);
  }

  return result;
}

// ============================================================
// API ROUTE
// ============================================================
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = humanizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
    }

    const modelTier = (parsed.data.model || "fast") as ModelTier;
    const originalText = parsed.data.text;
    const totalWC = wc(originalText);

    const creditCheck = await checkCredits(session.user.id, modelTier, totalWC);
    if (!creditCheck.allowed) {
      return NextResponse.json(
        { error: creditCheck.error, creditsNeeded: creditCheck.creditsNeeded, creditsRemaining: creditCheck.creditsRemaining },
        { status: 402 }
      );
    }

    const language = parsed.data.language as AILanguage || "en";
    const intensity = parsed.data.intensity;
    const tone = parsed.data.tone;

    // Humanize using hybrid dictionary+AI approach
    const result = await humanizeText(originalText, tone, intensity);

    const finalWC = wc(result);
    console.log(`[Humanize] ${totalWC} → ${finalWC} words (±${Math.abs(finalWC - totalWC)}) | Hybrid v12`);

    // Generate diff HTML
    const diffResult = humanizeWithDiff(originalText, intensity as "light" | "balanced" | "heavy", result);

    if (creditCheck.creditsNeeded && creditCheck.creditsNeeded > 0) {
      await deductCredits(session.user.id, creditCheck.creditsNeeded, "humanize-diff", modelTier);
    }

    return NextResponse.json({
      html: diffResult.html,
      plain: diffResult.plain,
      sentences: splitSentences(result).length,
    });
  } catch (error) {
    console.error("Humanize error:", error);
    return NextResponse.json({ error: "Failed to humanize text" }, { status: 500 });
  }
}
