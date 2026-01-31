import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const resumeSchema = z.object({
  resume: z.string().min(100, "Resume must be at least 100 characters"),
  jobDescription: z.string().min(50, "Job description must be at least 50 characters"),
  focus: z.enum(["optimize", "rewrite", "keywords"]).default("optimize"),
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
    const validatedData = resumeSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { resume, jobDescription, focus, model, language } = validatedData;

    const focusGuide = {
      optimize: "Optimize existing content for the job without major rewrites",
      rewrite: "Provide completely rewritten sections where needed",
      keywords: "Focus on adding relevant keywords for ATS systems",
    };

    const languageInstructions = language !== "en" 
      ? `Provide suggestions in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert resume consultant and ATS optimization specialist.

Focus: ${focus} - ${focusGuide[focus]}
${languageInstructions}

Analyze the resume against the job description and provide tailored improvements.

Your response MUST be valid JSON:
{
  "overallScore": 75,
  "atsScore": 70,
  "summary": "Brief analysis of the resume's fit",
  "keywordMatches": [
    {"keyword": "Python", "found": true, "context": "Mentioned in skills section"}
  ],
  "missingKeywords": ["Keyword 1", "Keyword 2"],
  "sectionImprovements": [
    {
      "section": "Summary",
      "current": "Current text snippet",
      "improved": "Improved text",
      "reason": "Why this improvement helps"
    }
  ],
  "bulletImprovements": [
    {
      "original": "Original bullet point",
      "improved": "Improved bullet point with metrics",
      "reason": "Added quantifiable results"
    }
  ],
  "skillsToAdd": ["Skill 1", "Skill 2"],
  "formatTips": ["Formatting tip 1", "Formatting tip 2"],
  "atsWarnings": ["Potential ATS issue 1"]
}

Be specific and actionable. Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Resume:\n${resume.slice(0, 5000)}\n\n---\n\nJob Description:\n${jobDescription.slice(0, 3000)}`,
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
        overallScore: 50,
        atsScore: 50,
        summary: "Could not fully analyze",
        keywordMatches: [],
        missingKeywords: [],
        sectionImprovements: [],
        bulletImprovements: [],
        skillsToAdd: [],
        formatTips: [result],
        atsWarnings: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "resume-tailor");

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Resume tailor error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to analyze resume" }, { status: 500 });
  }
}
