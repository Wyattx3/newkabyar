import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const roastSchema = z.object({
  text: z.string().min(50, "Text must be at least 50 characters"),
  assignmentType: z.enum(["essay", "report", "thesis", "paper", "general"]).default("general"),
  gradeLevel: z.enum(["high-school", "undergraduate", "graduate", "professional"]).default("undergraduate"),
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
    const validatedData = roastSchema.parse(body);

    const creditsNeeded = 4;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { text, assignmentType, gradeLevel, model, language } = validatedData;

    const languageInstructions = language !== "en" 
      ? `Provide the critique in ${language} language.` 
      : "";

    const systemPrompt = `You are a brutally honest but helpful academic grader. "Roast" this ${assignmentType} with strict but constructive criticism.

Grade Level: ${gradeLevel}
${languageInstructions}

Your output MUST be valid JSON with this structure:
{
  "overallGrade": "A letter grade (A+ to F)",
  "score": "Numeric score out of 100",
  "verdict": "One-liner roast/verdict about the work",
  "strengths": [
    {"point": "Strength 1", "explanation": "Why this is good"}
  ],
  "weaknesses": [
    {"point": "Weakness 1", "explanation": "Why this is problematic", "fix": "How to fix it"}
  ],
  "rubricScores": {
    "thesis": {"score": 8, "max": 10, "feedback": "Brief feedback"},
    "evidence": {"score": 7, "max": 10, "feedback": "Brief feedback"},
    "organization": {"score": 6, "max": 10, "feedback": "Brief feedback"},
    "clarity": {"score": 7, "max": 10, "feedback": "Brief feedback"},
    "grammar": {"score": 8, "max": 10, "feedback": "Brief feedback"}
  },
  "quickFixes": ["Easy improvement 1", "Easy improvement 2", "Easy improvement 3"]
}

Be specific, actionable, and honest. Don't sugarcoat issues.
Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Grade and roast this ${assignmentType}:\n\n${text.slice(0, 10000)}`,
      session.user.id
    );

    // Parse the response
    let critique;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        critique = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      critique = {
        overallGrade: "?",
        score: 0,
        verdict: "Could not analyze",
        strengths: [],
        weaknesses: [],
        rubricScores: {},
        quickFixes: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "roast-assignment");

    return NextResponse.json(critique);
  } catch (error) {
    console.error("Roast error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to roast assignment" }, { status: 500 });
  }
}
