import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const pastPaperSchema = z.object({
  papers: z.array(z.object({
    year: z.string(),
    content: z.string(),
  })).min(1, "At least one paper is required"),
  subject: z.string().optional(),
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
    const validatedData = pastPaperSchema.parse(body);

    const creditsNeeded = 8;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { papers, subject, model, language } = validatedData;

    const languageInstructions = language !== "en" 
      ? `Provide the analysis in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert at analyzing exam patterns and predicting future topics.

Analyze the provided past papers to identify trends, frequently tested topics, and predict likely future questions.
${subject ? `Subject: ${subject}` : ""}
${languageInstructions}

Your response MUST be valid JSON:
{
  "summary": "Overview of the analysis",
  "totalQuestionsAnalyzed": 50,
  "topicFrequency": [
    {"topic": "Topic Name", "frequency": 15, "percentage": 30, "trend": "increasing|decreasing|stable", "lastAppeared": "2023"}
  ],
  "yearComparison": [
    {"year": "2023", "mainTopics": ["Topic 1", "Topic 2"], "difficulty": "medium"}
  ],
  "predictions": {
    "highProbability": [
      {"topic": "Topic", "probability": 85, "reason": "Why likely"}
    ],
    "mediumProbability": [
      {"topic": "Topic", "probability": 60, "reason": "Why possible"}
    ],
    "newTopics": ["Emerging topic 1"]
  },
  "questionTypes": [
    {"type": "MCQ", "frequency": 40},
    {"type": "Essay", "frequency": 30}
  ],
  "studyRecommendations": [
    {"topic": "Topic", "priority": "high", "reason": "Why focus here"}
  ],
  "patterns": ["Pattern 1", "Pattern 2"]
}

Be data-driven and specific. Return ONLY valid JSON.`;

    const papersContext = papers.map(p => `Year ${p.year}:\n${p.content.slice(0, 3000)}`).join("\n\n---\n\n");

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Analyze these past papers:\n\n${papersContext}`,
      session.user.id
    );

    let analysis;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      analysis = {
        summary: "Could not fully analyze",
        topicFrequency: [],
        predictions: { highProbability: [], mediumProbability: [], newTopics: [] },
        studyRecommendations: [],
        patterns: [result],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "past-paper-analyzer");

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Past paper error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to analyze papers" }, { status: 500 });
  }
}
