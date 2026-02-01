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

    // Use fast model (groq) - split by sentences for better context
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    const systemPrompt = `You are a language translator. Your ONLY job is to translate text from English to ${langName}.

CRITICAL RULES:
1. Output ONLY the translated text - nothing else
2. If the input is a QUESTION, translate the QUESTION itself - do NOT answer it
3. Do NOT provide explanations, examples, or answers
4. Keep the same sentence structure as the original

Example:
Input: "What is competitive advantage?"
Correct output: "ပြိုင်ဆိုင်မှုအားသာချက်ဆိုတာ ဘာလဲ?"
Wrong output: "Competitive advantage means..." (This is answering, not translating)`;

    const translateSentence = async (sentence: string): Promise<string> => {
      const result = await chatWithTier("fast", systemPrompt, sentence.trim(), session.user.id);
      return result.trim().replace(/^["']|["']$/g, '');
    };

    // Translate sentences in parallel
    const translatedSentences = await Promise.all(sentences.map(translateSentence));
    const fullTranslation = translatedSentences.join(' ');

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
