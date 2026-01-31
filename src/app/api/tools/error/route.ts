import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const errorSchema = z.object({
  error: z.string().min(10, "Error must be at least 10 characters"),
  context: z.string().optional(),
  language: z.string().optional(), // Programming language
  model: z.string().default("fast"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = errorSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { error, context, language, model } = validatedData;

    const systemPrompt = `You are a senior software developer helping debug errors. Analyze the error and provide a clear, actionable solution.

Your response MUST be valid JSON with this exact structure:
{
  "errorType": "Brief error classification (e.g., TypeError, SyntaxError, etc.)",
  "summary": "One sentence explaining what went wrong",
  "cause": "Detailed explanation of why this error occurred",
  "solution": "Step-by-step solution to fix the error",
  "codeExample": "Fixed code example if applicable (use \\n for newlines)",
  "prevention": "How to prevent this error in the future",
  "relatedErrors": ["Similar error 1", "Similar error 2"]
}

Guidelines:
- Be concise but thorough
- Provide working code examples when relevant
- Explain in simple terms, avoid jargon
- Focus on the root cause, not just symptoms
${language ? `- The code is written in ${language}` : "- Detect the programming language from the error"}
${context ? `- Additional context: ${context}` : ""}

Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Explain and fix this error:\n\n${error}`,
      session.user.id
    );

    // Parse the response
    let explanation;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        explanation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      explanation = {
        errorType: "Unknown Error",
        summary: "Could not parse error analysis",
        cause: result,
        solution: "Please try again with more context",
        codeExample: "",
        prevention: "",
        relatedErrors: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "explain-error");

    return NextResponse.json(explanation);
  } catch (error) {
    console.error("Error explanation failed:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to explain error" }, { status: 500 });
  }
}
