import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";
import { searchWithExa, searchWithTavily } from "@/lib/integrations/search";

const researchGapSchema = z.object({
  topic: z.string().min(10, "Topic must be at least 10 characters"),
  field: z.string().optional(),
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
    const validatedData = researchGapSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { topic, field, model, language } = validatedData;

    // Search for existing research
    let searchResults: { title: string; url: string; text: string }[] = [];
    
    try {
      if (process.env.EXA_API_KEY) {
        const exaResults = await searchWithExa(`${topic} research study academic`, {
          maxResults: 10,
          type: "academic",
        });
        searchResults = exaResults.map(r => ({
          title: r.title || "Untitled",
          url: r.url,
          text: r.content || "",
        }));
      }
    } catch (e) {
      console.log("Exa failed, trying Tavily");
    }

    if (searchResults.length === 0 && process.env.TAVILY_API_KEY) {
      try {
        const tavilyResults = await searchWithTavily(`${topic} research study academic paper`, {
          maxResults: 10,
        });
        searchResults = tavilyResults.map(r => ({
          title: r.title,
          url: r.url,
          text: r.content,
        }));
      } catch (e) {
        console.log("Tavily failed");
      }
    }

    const languageInstructions = language !== "en" 
      ? `Provide the analysis in ${language} language.` 
      : "";

    const systemPrompt = `You are a research advisor specializing in identifying gaps in academic literature.

Analyze the existing research on "${topic}"${field ? ` in ${field}` : ""} and identify unexplored areas.
${languageInstructions}

Your response MUST be valid JSON:
{
  "topic": "${topic}",
  "existingResearch": {
    "summary": "Brief overview of current research landscape",
    "mainThemes": ["Theme 1", "Theme 2"],
    "keyPapers": [{"title": "Paper title", "contribution": "What it contributes"}]
  },
  "gaps": [
    {
      "title": "Gap title",
      "description": "Description of the research gap",
      "importance": "high|medium|low",
      "difficulty": "high|medium|low",
      "potentialQuestions": ["Research question 1", "Research question 2"],
      "methodology": "Suggested research methodology"
    }
  ],
  "emergingTrends": ["Trend 1", "Trend 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Return ONLY valid JSON.`;

    const context = searchResults.length > 0
      ? `Existing research found:\n${searchResults.map(r => `- ${r.title}: ${r.text.slice(0, 300)}`).join("\n")}`
      : `Topic: ${topic}${field ? `, Field: ${field}` : ""}`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Find research gaps in:\n${context}`,
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
        topic,
        gaps: [],
        existingResearch: { summary: result },
        emergingTrends: [],
        recommendations: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "research-gap");

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Research gap error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to analyze research gaps" }, { status: 500 });
  }
}
