import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const vocabSchema = z.object({
  text: z.string().min(20, "Text must be at least 20 characters"),
  level: z.enum(["academic", "professional", "advanced"]).default("academic"),
  preserveMeaning: z.boolean().default(true),
  model: z.string().default("fast"),
  language: z.string().default("en"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = vocabSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { text, level, preserveMeaning, model, language } = validatedData;

    const levelGuide = {
      academic: "Use sophisticated academic vocabulary suitable for scholarly papers",
      professional: "Use professional business vocabulary suitable for workplace communication",
      advanced: "Use highly advanced vocabulary for maximum impressiveness",
    };

    const languageInstructions = language !== "en" 
      ? `Maintain the upgrades in ${language} language context.` 
      : "";

    const systemPrompt = `You are a vocabulary enhancement expert. Upgrade the given text to a higher vocabulary level.

Level: ${level} - ${levelGuide[level]}
${preserveMeaning ? "IMPORTANT: Preserve the exact meaning while upgrading vocabulary." : ""}
${languageInstructions}

Your response MUST be valid JSON:
{
  "upgradedText": "The full upgraded text",
  "replacements": [
    {
      "original": "simple word/phrase",
      "upgraded": "sophisticated replacement",
      "reason": "Why this upgrade works"
    }
  ],
  "wordCountOriginal": 50,
  "wordCountUpgraded": 52,
  "sophisticationScore": 85
}

Guidelines:
- Replace common words with more sophisticated alternatives
- Improve sentence structure where appropriate
- Maintain natural flow and readability
- Don't over-complicate simple concepts unnecessarily
- Keep technical terms intact

Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Upgrade this text:\n\n${text}`,
      session.user.id
    );

    // Parse the response
    let upgrade;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        upgrade = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      upgrade = {
        upgradedText: result,
        replacements: [],
        wordCountOriginal: text.split(/\s+/).length,
        wordCountUpgraded: result.split(/\s+/).length,
        sophisticationScore: 70,
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "vocabulary-upgrader");

    return NextResponse.json(upgrade);
  } catch (error) {
    console.error("Vocabulary upgrade error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to upgrade vocabulary" }, { status: 500 });
  }
}
