import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const flashcardsSchema = z.object({
  summary: z.string(),
  takeaways: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { summary, takeaways, topics } = flashcardsSchema.parse(body);

    const creditsNeeded = 2;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const systemPrompt = `You are an expert at creating concise educational flashcards.

CRITICAL RULES:
1. Create exactly 6 flashcards
2. Each "front" (question) must be MAX 15 words
3. Each "back" (answer) must be MAX 25 words
4. Make questions clear and specific
5. Make answers concise but complete
6. Focus on key concepts, not trivial details

Return ONLY a JSON array with this exact format:
[
  {"front": "Short question here?", "back": "Concise answer here"},
  {"front": "Another question?", "back": "Another answer"}
]

No markdown, no code blocks, just the JSON array.`;

    const content = `Create 6 study flashcards from this video content:

Summary: ${summary.slice(0, 1500)}

Key Points: ${takeaways?.slice(0, 5).join('. ') || 'None'}

Topics: ${topics?.slice(0, 5).join(', ') || 'None'}`;

    const result = await chatWithTier(
      "fast",
      systemPrompt,
      content,
      session.user.id
    );

    let flashcards = [];
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Ensure each card is properly formatted and not too long
        flashcards = parsed.map((card: any) => ({
          front: String(card.front || '').slice(0, 100),
          back: String(card.back || '').slice(0, 150),
        })).slice(0, 8);
      }
    } catch {
      // Fallback: create basic flashcards from takeaways
      flashcards = (takeaways || []).slice(0, 5).map((t, i) => ({
        front: `What is key point #${i + 1}?`,
        back: t.slice(0, 100),
      }));
    }

    await deductCredits(session.user.id, creditsNeeded, "youtube-flashcards");

    return NextResponse.json({
      flashcards,
    });
  } catch (error) {
    console.error("Flashcards error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }
}
