import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const labReportSchema = z.object({
  experimentTitle: z.string().min(5, "Title must be at least 5 characters"),
  objective: z.string().min(10, "Objective must be at least 10 characters"),
  materials: z.string().optional(),
  procedure: z.string().optional(),
  rawData: z.string().min(20, "Data must be at least 20 characters"),
  observations: z.string().optional(),
  subject: z.enum(["chemistry", "physics", "biology", "general"]).default("general"),
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
    const validatedData = labReportSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { experimentTitle, objective, materials, procedure, rawData, observations, subject, model, language } = validatedData;

    const languageInstructions = language !== "en" 
      ? `Generate the lab report in ${language} language.` 
      : "";

    const systemPrompt = `You are a scientific report writing expert. Generate a properly structured lab report from the provided experimental data.

Subject: ${subject}
${languageInstructions}

Your response MUST be valid JSON:
{
  "title": "Full experiment title",
  "abstract": "Brief summary of the experiment and findings (100-150 words)",
  "introduction": {
    "background": "Scientific background and context",
    "hypothesis": "The hypothesis being tested"
  },
  "materialsAndMethods": {
    "materials": ["Material 1", "Material 2"],
    "procedure": ["Step 1", "Step 2", "Step 3"]
  },
  "results": {
    "dataAnalysis": "Analysis of the raw data with calculations",
    "tables": [
      {
        "title": "Table title",
        "headers": ["Column 1", "Column 2"],
        "rows": [["Value 1", "Value 2"]]
      }
    ],
    "keyFindings": ["Finding 1", "Finding 2"]
  },
  "discussion": {
    "interpretation": "What the results mean",
    "comparison": "How results compare to expected outcomes",
    "limitations": ["Limitation 1", "Limitation 2"],
    "improvements": ["Improvement suggestion 1"]
  },
  "conclusion": "Final conclusion summarizing the experiment and whether hypothesis was supported",
  "references": ["Suggested reference format 1"]
}

Follow IMRaD format. Be scientifically accurate and use proper terminology.
Return ONLY valid JSON.`;

    const context = `
Experiment Title: ${experimentTitle}
Objective: ${objective}
${materials ? `Materials: ${materials}` : ""}
${procedure ? `Procedure: ${procedure}` : ""}
Raw Data: ${rawData}
${observations ? `Observations: ${observations}` : ""}
`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Generate a lab report from:\n${context}`,
      session.user.id
    );

    // Parse the response
    let report;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        report = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      report = {
        title: experimentTitle,
        abstract: "Report generation failed",
        content: result,
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "lab-report");

    return NextResponse.json(report);
  } catch (error) {
    console.error("Lab report error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate lab report" }, { status: 500 });
  }
}
