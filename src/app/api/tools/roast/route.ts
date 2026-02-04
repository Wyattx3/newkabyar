import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const roastSchema = z.object({
  text: z.string().min(50, "Text must be at least 50 characters"),
  assignmentType: z.enum(["essay", "research", "report", "analysis", "thesis", "paper", "general"]).default("essay"),
  gradeLevel: z.enum(["highschool", "undergraduate", "graduate", "professional"]).default("undergraduate"),
  intensity: z.enum(["gentle", "balanced", "brutal"]).default("balanced"),
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

    const { text, assignmentType, gradeLevel, intensity, model, language } = validatedData;

    const intensityGuide: Record<string, string> = {
      gentle: "Be constructive and encouraging. Point out issues gently with positive framing.",
      balanced: "Be honest and fair. Don't sugarcoat but be respectful.",
      brutal: "Be brutally honest. Roast the work mercilessly but still provide actionable feedback.",
    };

    const languageInstructions = language !== "en" 
      ? `Provide the critique in ${language} language.` 
      : "";

    const systemPrompt = `You are a ${intensity === "brutal" ? "brutally honest" : intensity === "gentle" ? "constructive and supportive" : "fair but honest"} academic grader. 
    
Intensity: ${intensityGuide[intensity]}
Grade Level: ${gradeLevel}
Assignment Type: ${assignmentType}
${languageInstructions}

Your output MUST be valid JSON with this EXACT structure:
{
  "overallGrade": "B+",
  "overallScore": 78,
  "verdict": "A one-liner summary/roast of the work",
  "rubric": [
    {"category": "Thesis & Argument", "score": 75, "feedback": "Brief feedback"},
    {"category": "Evidence & Support", "score": 80, "feedback": "Brief feedback"},
    {"category": "Organization", "score": 70, "feedback": "Brief feedback"},
    {"category": "Clarity & Style", "score": 82, "feedback": "Brief feedback"},
    {"category": "Grammar & Mechanics", "score": 85, "feedback": "Brief feedback"}
  ],
  "strengths": ["Strength 1 as a string", "Strength 2 as a string", "Strength 3 as a string"],
  "weaknesses": [
    {"issue": "Issue title", "example": "Optional example from text", "fix": "How to fix it"},
    {"issue": "Another issue", "fix": "How to fix it"}
  ],
  "quickFixes": ["Easy fix 1", "Easy fix 2", "Easy fix 3", "Easy fix 4"]
}

IMPORTANT:
- overallScore must be a NUMBER (not string)
- rubric scores must be NUMBERS out of 100
- strengths must be an ARRAY OF STRINGS
- weaknesses must have "issue" and "fix" fields

Be specific and actionable. Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Grade and ${intensity === "brutal" ? "roast" : "review"} this ${assignmentType}:\n\n${text.slice(0, 10000)}`,
      session.user.id
    );

    // Parse the response
    let critique;
    try {
      // Clean markdown code blocks if present
      let cleanResult = result;
      if (result.includes('```json')) {
        cleanResult = result.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (result.includes('```')) {
        cleanResult = result.replace(/```\s*/g, '');
      }

      const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Fix LaTeX escape issues
        let fixedJson = jsonMatch[0];
        try {
          critique = JSON.parse(fixedJson);
        } catch {
          fixedJson = jsonMatch[0].replace(/\\([^"\\/bfnrtu\\])/g, '\\\\$1');
          critique = JSON.parse(fixedJson);
        }

        // Normalize the response structure
        critique = {
          overallGrade: critique.overallGrade || "?",
          overallScore: typeof critique.overallScore === 'number' ? critique.overallScore : parseInt(critique.overallScore) || 0,
          verdict: critique.verdict || "Could not analyze",
          rubric: Array.isArray(critique.rubric) ? critique.rubric.map((r: { category?: string; score?: number; feedback?: string }) => ({
            category: r.category || "Unknown",
            score: typeof r.score === 'number' ? r.score : parseInt(String(r.score)) || 0,
            feedback: r.feedback || ""
          })) : [],
          strengths: Array.isArray(critique.strengths) ? critique.strengths.map((s: string | { point?: string }) => typeof s === 'string' ? s : s.point || String(s)) : [],
          weaknesses: Array.isArray(critique.weaknesses) ? critique.weaknesses.map((w: { issue?: string; point?: string; example?: string; fix?: string; explanation?: string }) => ({
            issue: w.issue || w.point || "Issue",
            example: w.example || undefined,
            fix: w.fix || w.explanation || "Review and improve"
          })) : [],
          quickFixes: Array.isArray(critique.quickFixes) ? critique.quickFixes : [],
        };
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      critique = {
        overallGrade: "?",
        overallScore: 0,
        verdict: "Could not analyze the assignment. Please try again.",
        rubric: [],
        strengths: [],
        weaknesses: [],
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
