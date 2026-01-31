import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const timelineSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  eventCount: z.number().min(5).max(20).default(10),
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
    const validatedData = timelineSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { topic, eventCount, model, language } = validatedData;

    const languageInstructions = language !== "en" 
      ? `Generate the timeline content in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert at creating educational timelines. Generate a Mermaid.js timeline diagram.

Rules:
- Topic: "${topic}"
- Generate ${eventCount} chronological events
- Use accurate dates/periods
- Keep event descriptions concise (max 10 words)
- DO NOT use special characters like quotes or colons in the text
- Use simple alphanumeric text only
${languageInstructions}

Output Format:
Return ONLY valid Mermaid timeline syntax. Example:

timeline
    title History of Computing
    1940 : ENIAC built
    1950 : First commercial computers
    1960 : Integrated circuits invented
    1970 : Personal computers emerge
    1980 : IBM PC launched
    1990 : World Wide Web created
    2000 : Mobile revolution begins

IMPORTANT: 
- Return ONLY the Mermaid code
- No markdown code blocks
- No explanations`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Create a timeline for: ${topic}`,
      session.user.id
    );

    // Clean up the response
    let mermaidCode = result
      .replace(/```mermaid\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Ensure it starts with timeline
    if (!mermaidCode.startsWith("timeline")) {
      mermaidCode = "timeline\n" + mermaidCode;
    }

    await deductCredits(session.user.id, creditsNeeded, "timeline");

    return NextResponse.json({ 
      mermaidCode,
      topic,
    });
  } catch (error) {
    console.error("Timeline generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate timeline" }, { status: 500 });
  }
}
