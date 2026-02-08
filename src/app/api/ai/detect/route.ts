import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getModelConfig, type ModelTier } from "@/lib/ai-providers";
import { createDetectorPrompt } from "@/lib/prompts";
import { getLanguageInstruction, type AILanguage } from "@/lib/language-utils";
import { checkCredits, deductCredits } from "@/lib/credits";
import { z } from "zod";
import crypto from "crypto";

const detectSchema = z.object({
  text: z.string().min(50).max(50000),
  provider: z.enum(["openai", "claude", "gemini", "grok"]).optional(),
  model: z.enum(["super-smart", "pro-smart", "normal", "fast"]).optional(),
  language: z.enum(["en", "my", "zh", "th", "ko", "ja"]).optional(),
});

// ============================================================
// IN-MEMORY CACHE for deterministic results
// Same text + model + language = same result
// ============================================================
interface CacheEntry {
  result: any;
  timestamp: number;
}

const detectionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCacheKey(text: string, tier: ModelTier, language: AILanguage): string {
  // Normalize text: trim, normalize whitespace, lowercase for comparison
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  const hash = crypto.createHash("sha256").update(`${normalized}|${tier}|${language}`).digest("hex");
  return hash;
}

function getCached(key: string): any | null {
  const entry = detectionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    detectionCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: any): void {
  detectionCache.set(key, { result, timestamp: Date.now() });
  // Clean old entries (keep cache size reasonable)
  if (detectionCache.size > 1000) {
    const oldest = Array.from(detectionCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    detectionCache.delete(oldest[0]);
  }
}

// ============================================================
// DETERMINISTIC DETECTION with temperature 0
// ============================================================
async function detectWithDeterministic(
  text: string,
  tier: ModelTier,
  language: AILanguage
): Promise<string> {
  const config = getModelConfig(tier);
  const languageInstruction = getLanguageInstruction(language);
  const basePrompt = createDetectorPrompt();
  const systemPrompt = `${basePrompt}\n\nIMPORTANT LANGUAGE REQUIREMENT: ${languageInstruction}\n\nREMEMBER: Return ONLY the JSON object. No markdown, no code blocks, no explanations. Start with { and end with }.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: `Analyze this text for AI-generated content:\n\n${text}` },
  ];

  // Groq - Direct API call with temperature 0
  if (config.provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0, // Deterministic
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) throw new Error(`Groq error: ${response.status}`);
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  // Gemini - Direct API call with temperature 0
  if (config.provider === "gemini") {
    const apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY?.trim();
    if (!apiKey) throw new Error("Gemini API key not configured");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${messages[1].content}` }],
            },
          ],
          generationConfig: {
            temperature: 0, // Deterministic
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // Grok - Direct API call with temperature 0
  if (config.provider === "grok") {
    const apiKey = process.env.GROK_API_KEY?.trim();
    if (!apiKey) throw new Error("GROK_API_KEY not configured");
    
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1",
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0, // Deterministic
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    return response.choices[0]?.message?.content || "";
  }

  // Fallback: Use standard chat function (may not be deterministic)
  const { chat } = await import("@/lib/ai-providers");
  const response = await chat(config.provider, messages, config.model, config.apiKey);
  return response.content;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = detectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const modelTier = (parsed.data.model || "fast") as ModelTier;
    const language = parsed.data.language as AILanguage || "en";
    
    // Normalize text for consistent caching
    const normalizedText = parsed.data.text.trim().replace(/\s+/g, " ");
    const wordCount = normalizedText.split(/\s+/).length;

    // Check cache first
    const cacheKey = getCacheKey(normalizedText, modelTier, language);
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[Detect] Cache HIT: ${cached.aiScore}% AI`);
      return NextResponse.json(cached);
    }

    // Check credits before processing
    const creditCheck = await checkCredits(session.user.id, modelTier, wordCount);
    if (!creditCheck.allowed) {
      return NextResponse.json(
        { 
          error: creditCheck.error,
          creditsNeeded: creditCheck.creditsNeeded,
          creditsRemaining: creditCheck.creditsRemaining,
        },
        { status: 402 }
      );
    }

    // Deduct credits BEFORE processing
    if (creditCheck.creditsNeeded && creditCheck.creditsNeeded > 0) {
      await deductCredits(session.user.id, creditCheck.creditsNeeded, "detect", modelTier);
    }

    // Use deterministic detection
    const response = await detectWithDeterministic(normalizedText, modelTier, language);

    // ============================================================
    // ROBUST JSON EXTRACTION
    // ============================================================
    function extractJSON(text: string): any | null {
      // Strategy 1: Try direct JSON parse
      try {
        return JSON.parse(text.trim());
      } catch {}

      // Strategy 2: Extract JSON from markdown code blocks
      const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonBlockMatch) {
        try {
          return JSON.parse(jsonBlockMatch[1]);
        } catch {}
      }

      // Strategy 3: Find JSON object in text (look for { ... })
      const jsonMatch = text.match(/\{[\s\S]*"aiScore"[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {}
      }

      // Strategy 4: Try to find any JSON-like structure
      const braceMatch = text.match(/\{[\s\S]{20,2000}\}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]);
        } catch {}
      }

      return null;
    }

    // Extract and parse JSON
    const extracted = extractJSON(response);
    
    let validated: any;
    
    if (extracted) {
      // Validate and ensure consistent structure
      validated = {
        aiScore: Math.max(0, Math.min(100, Number(extracted.aiScore) || 50)),
        humanScore: Math.max(0, Math.min(100, Number(extracted.humanScore) || 50)),
        analysis: String(extracted.analysis || "Analysis completed.").substring(0, 1000),
        indicators: Array.isArray(extracted.indicators) 
          ? extracted.indicators.filter((ind: any) => ind && ind.text && ind.reason)
          : [],
        suggestions: Array.isArray(extracted.suggestions)
          ? extracted.suggestions.filter((s: any) => s && typeof s === "string")
          : [],
      };
      
      // Ensure scores add up to 100
      const total = validated.aiScore + validated.humanScore;
      if (total !== 100 && total > 0) {
        const ratio = validated.aiScore / total;
        validated.aiScore = Math.round(ratio * 100);
        validated.humanScore = 100 - validated.aiScore;
      } else if (total === 0) {
        validated.aiScore = 50;
        validated.humanScore = 50;
      }
    } else {
      // Fallback parsing
      console.warn("[Detect] JSON extraction failed, attempting fallback parsing");
      const aiScoreMatch = response.match(/"aiScore"\s*:\s*(\d+)/i) || response.match(/aiScore["\s:]+(\d+)/i);
      const humanScoreMatch = response.match(/"humanScore"\s*:\s*(\d+)/i) || response.match(/humanScore["\s:]+(\d+)/i);
      const analysisMatch = response.match(/"analysis"\s*:\s*"([^"]+)"/i) || response.match(/analysis["\s:]+"([^"]+)"/i);

      validated = {
        aiScore: aiScoreMatch ? Math.max(0, Math.min(100, parseInt(aiScoreMatch[1]))) : 50,
        humanScore: humanScoreMatch ? Math.max(0, Math.min(100, parseInt(humanScoreMatch[1]))) : 50,
        analysis: analysisMatch ? analysisMatch[1] : response.substring(0, 500).replace(/```json|```/g, "").trim(),
        indicators: [],
        suggestions: [],
      };

      // Normalize scores
      const total = validated.aiScore + validated.humanScore;
      if (total !== 100 && total > 0) {
        const ratio = validated.aiScore / total;
        validated.aiScore = Math.round(ratio * 100);
        validated.humanScore = 100 - validated.aiScore;
      }
    }

    // Cache the result
    setCache(cacheKey, validated);
    
    console.log(`[Detect] Success: ${validated.aiScore}% AI | ${validated.indicators.length} indicators`);
    return NextResponse.json(validated);
  } catch (error) {
    console.error("Detection error:", error);
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}
