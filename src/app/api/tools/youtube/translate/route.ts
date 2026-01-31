import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const translateSchema = z.object({
  text: z.string().min(1),
  targetLanguage: z.string().default("my"),
});

const languageNames: Record<string, string> = {
  my: "Burmese (Myanmar)",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ru: "Russian",
  ar: "Arabic",
  vi: "Vietnamese",
  id: "Indonesian",
};

// Split text into smaller chunks for translation
function splitIntoChunks(text: string, maxChunkSize: number = 800): string[] {
  const sentences = text.split(/(?<=[.!?။])\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, targetLanguage } = translateSchema.parse(body);

    const creditsNeeded = 2;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const langName = languageNames[targetLanguage] || targetLanguage;

    // Split text into chunks for better translation
    const chunks = splitIntoChunks(text, 800);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      const systemPrompt = `You are a professional translator. Translate to ${langName}.

RULES:
1. Translate the ENTIRE text completely
2. Do NOT stop in the middle
3. Do NOT summarize or shorten
4. Return ONLY the translation, nothing else
5. Preserve paragraph structure`;

      const result = await chatWithTier(
        "powerful", // Use powerful model for better translation
        systemPrompt,
        chunk,
        session.user.id
      );

      translatedChunks.push(result.trim());
    }

    const fullTranslation = translatedChunks.join('\n\n');

    await deductCredits(session.user.id, creditsNeeded, "youtube-translate");

    return NextResponse.json({
      translatedText: fullTranslation,
      targetLanguage,
    });
  } catch (error) {
    console.error("Translation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
