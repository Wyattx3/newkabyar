import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const jobMatchSchema = z.object({
  resume: z.string().min(100, "Resume must be at least 100 characters"),
  jobDescription: z.string().min(50, "Job description must be at least 50 characters"),
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
    const validatedData = jobMatchSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { resume, jobDescription, model, language } = validatedData;

    const languageInstructions = language !== "en" 
      ? `Provide the analysis in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert career advisor and resume analyst. Compare the candidate's resume against the job description.
${languageInstructions}

Your response MUST be valid JSON:
{
  "matchScore": 75,
  "verdict": "Strong candidate with some skill gaps",
  "matchedSkills": [
    {"skill": "Python", "strength": "strong", "evidence": "3 years experience mentioned"}
  ],
  "missingSkills": [
    {"skill": "Docker", "importance": "required", "suggestion": "Take a Docker certification course"}
  ],
  "experienceMatch": {
    "required": "3-5 years",
    "candidate": "4 years",
    "assessment": "Meets requirements"
  },
  "educationMatch": {
    "required": "Bachelor's in CS",
    "candidate": "Master's in CS",
    "assessment": "Exceeds requirements"
  },
  "strengths": ["Point 1", "Point 2"],
  "improvements": ["Area to improve 1", "Area to improve 2"],
  "interviewTips": ["Tip 1", "Tip 2"],
  "resumeTweaks": ["Suggested resume change 1", "Suggested resume change 2"]
}

Be thorough and actionable. Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Resume:\n${resume.slice(0, 5000)}\n\n---\n\nJob Description:\n${jobDescription.slice(0, 3000)}`,
      session.user.id
    );

    // Parse the response
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
        matchScore: 50,
        verdict: "Could not fully analyze",
        matchedSkills: [],
        missingSkills: [],
        strengths: [],
        improvements: [result],
        interviewTips: [],
        resumeTweaks: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "job-matcher");

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Job match error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to analyze match" }, { status: 500 });
  }
}
