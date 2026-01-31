import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const lectureSchema = z.object({
  transcript: z.string().min(100, "Transcript must be at least 100 characters"),
  subject: z.string().optional(),
  noteStyle: z.enum(["detailed", "summary", "bullet"]).default("detailed"),
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
    const validatedData = lectureSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { transcript, subject, noteStyle, model, language } = validatedData;

    const styleGuide = {
      detailed: "Create comprehensive notes with full explanations",
      summary: "Create concise summaries focusing on main points",
      bullet: "Create bullet-point notes for quick reference",
    };

    const languageInstructions = language !== "en" 
      ? `Generate notes in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert note-taker and academic organizer.

Analyze the lecture transcript and create organized, structured notes.
${subject ? `Subject: ${subject}` : ""}
Style: ${noteStyle} - ${styleGuide[noteStyle]}
${languageInstructions}

Your response MUST be valid JSON:
{
  "title": "Lecture title based on content",
  "subject": "Detected or provided subject",
  "duration": "Estimated lecture duration",
  "overview": "Brief 2-3 sentence overview of the lecture",
  "topics": [
    {
      "title": "Topic 1",
      "content": "Main points and explanations",
      "keyTerms": ["Term 1", "Term 2"],
      "examples": ["Example if mentioned"]
    }
  ],
  "keyPoints": [
    "Most important takeaway 1",
    "Most important takeaway 2"
  ],
  "definitions": [
    {"term": "Term", "definition": "Definition from lecture"}
  ],
  "questions": [
    "Potential exam question based on content"
  ],
  "actionItems": ["Things to review", "Further reading"],
  "connections": "How topics connect to each other"
}

Be thorough and extract all valuable information. Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Organize notes from this lecture transcript:\n\n${transcript.slice(0, 10000)}`,
      session.user.id
    );

    let notes;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        notes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      notes = {
        title: "Lecture Notes",
        overview: result.slice(0, 500),
        topics: [],
        keyPoints: [],
        definitions: [],
        questions: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "lecture-organizer");

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Lecture error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to organize lecture" }, { status: 500 });
  }
}
