import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { streamWithTier } from "@/lib/ai-providers";

const flashcardSchema = z.object({
  text: z.string().min(100, "Text must be at least 100 characters"),
  cardCount: z.number().min(5).max(50).default(15),
  cardStyle: z.enum(["basic", "detailed", "question"]).default("basic"),
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
    const validatedData = flashcardSchema.parse(body);

    // Check credits
    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { text, cardCount, cardStyle, model, language } = validatedData;

    const styleGuide = {
      basic: "Simple term/definition pairs. Front: key term or concept. Back: concise definition.",
      detailed: "Comprehensive cards. Front: concept or term. Back: detailed explanation with examples.",
      question: "Q&A format. Front: question about the content. Back: complete answer.",
    };

    const languageInstructions = language !== "en" 
      ? `Generate flashcards in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert flashcard creator for effective learning and spaced repetition.

Rules:
- Generate exactly ${cardCount} flashcards
- Style: ${cardStyle} - ${styleGuide[cardStyle]}
- Extract the most important concepts, terms, and facts
- Make cards atomic - one concept per card
- Front should be clear and specific
- Back should be comprehensive but not overwhelming
- Include varied topics from the content
${languageInstructions}

Output Format (JSON):
{
  "title": "Flashcard deck title based on content",
  "cards": [
    {
      "id": 1,
      "front": "Question or term on front of card",
      "back": "Answer or definition on back of card",
      "tags": ["topic1", "topic2"]
    }
  ]
}

Return ONLY valid JSON, no additional text.`;

    const userPrompt = `Create flashcards from this content:\n\n${text}`;

    // Stream the response
    const stream = await streamWithTier(
      model,
      systemPrompt,
      userPrompt,
      session.user.id
    );

    // Deduct credits
    await deductCredits(session.user.id, creditsNeeded, "flashcard-maker");

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Flashcard generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }
}
