import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { streamWithTier } from "@/lib/ai-providers";

const paraphraseSchema = z.object({
  text: z.string().min(20, "Text must be at least 20 characters"),
  style: z.enum(["academic", "casual", "formal", "simplified"]).default("academic"),
  preserveLength: z.boolean().default(true),
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
    const validatedData = paraphraseSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { text, style, preserveLength, model, language } = validatedData;

    const styleGuide = {
      academic: "Use formal academic language with sophisticated vocabulary. Maintain scholarly tone.",
      casual: "Use conversational, everyday language. Keep it friendly and accessible.",
      formal: "Use professional business language. Maintain formality without being academic.",
      simplified: "Use simple, clear language. Break down complex ideas for easy understanding.",
    };

    const languageInstructions = language !== "en" 
      ? `Generate the paraphrased text in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert paraphrasing assistant. Rewrite the given text while:

1. Style: ${style} - ${styleGuide[style]}
2. ${preserveLength ? "Keep approximately the same length as the original" : "Adjust length as needed for clarity"}
3. Preserve ALL original meaning and facts - do not add or remove information
4. Use different sentence structures and vocabulary
5. Maintain logical flow and coherence
6. Ensure the result is plagiarism-free and sounds natural
${languageInstructions}

IMPORTANT: 
- Do NOT simply replace words with synonyms
- Restructure sentences and paragraphs for genuine paraphrasing
- The result should convey the exact same information differently
- Output ONLY the paraphrased text, no explanations`;

    const stream = await streamWithTier(
      model,
      systemPrompt,
      `Paraphrase this text:\n\n${text}`,
      session.user.id
    );

    await deductCredits(session.user.id, creditsNeeded, "paraphraser");

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Paraphrase error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to paraphrase" }, { status: 500 });
  }
}
