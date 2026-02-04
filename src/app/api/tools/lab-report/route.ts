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
  subject: z.enum(["chemistry", "physics", "biology", "environmental", "biochemistry", "microbiology", "general"]).default("general"),
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

Your response MUST be valid JSON with these EXACT fields (all string values):
{
  "title": "Full experiment title",
  "abstract": "Brief summary of the experiment, methodology, and key findings (100-150 words)",
  "introduction": "Scientific background, context, and purpose of the experiment (150-200 words)",
  "hypothesis": "Clear statement of the hypothesis being tested and expected outcomes",
  "methods": "Detailed description of materials used and step-by-step procedure followed",
  "results": "Presentation and analysis of the raw data with any calculations performed",
  "analysis": "Statistical analysis, error calculations, and interpretation of the data",
  "discussion": "Interpretation of results, comparison with expected outcomes, limitations, and suggestions for improvement",
  "conclusion": "Final conclusion summarizing whether the hypothesis was supported and key takeaways",
  "references": "List of suggested references in proper citation format"
}

Follow IMRaD format. Be scientifically accurate and use proper terminology for ${subject}.
Each field should contain detailed, well-written paragraphs (not bullet points unless appropriate).
Return ONLY valid JSON with all 10 fields as strings.`;

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
      // Fallback structure matching expected interface
      report = {
        title: experimentTitle,
        abstract: "Unable to parse AI response. Raw output saved in introduction.",
        introduction: result,
        hypothesis: objective,
        methods: materials || procedure || "Not provided",
        results: rawData,
        analysis: "Analysis could not be generated.",
        discussion: observations || "No observations provided.",
        conclusion: "Please try regenerating the report.",
        references: "No references generated.",
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
