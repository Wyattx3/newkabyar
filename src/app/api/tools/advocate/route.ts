import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { streamWithTier } from "@/lib/ai-providers";

const advocateSchema = z.object({
  argument: z.string().min(20, "Argument must be at least 20 characters"),
  intensity: z.enum(["gentle", "moderate", "aggressive"]).default("moderate"),
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
    const validatedData = advocateSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { argument, intensity, model, language } = validatedData;

    const intensityGuide = {
      gentle: "Be respectful and constructive. Point out weaknesses while acknowledging strengths.",
      moderate: "Be balanced but thorough. Challenge assumptions and provide counterexamples.",
      aggressive: "Be rigorous and uncompromising. Find every possible weakness and logical flaw.",
    };

    const languageInstructions = language !== "en" 
      ? `Generate the counter-arguments in ${language} language.` 
      : "";

    const systemPrompt = `You are a Devil's Advocate - an expert at finding weaknesses in arguments and generating counter-arguments.

Your Role: Challenge the given argument by:
1. Identifying logical fallacies
2. Finding unsupported assumptions
3. Presenting counter-evidence
4. Suggesting alternative perspectives
5. Questioning premises

Intensity Level: ${intensity} - ${intensityGuide[intensity]}
${languageInstructions}

Structure your response as:
## Summary
Brief summary of the argument and your overall critique.

## Main Counter-Arguments
Present 3-5 strong counter-arguments, each with:
- The point you're challenging
- Why it's problematic
- An alternative perspective

## Logical Weaknesses
List any logical fallacies or reasoning errors.

## Strengthening Suggestions
How could the original argument be improved?

Be thoughtful and constructive. The goal is to help strengthen thinking, not to attack.`;

    const stream = await streamWithTier(
      model,
      systemPrompt,
      `Challenge this argument:\n\n${argument}`,
      session.user.id
    );

    await deductCredits(session.user.id, creditsNeeded, "devils-advocate");

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Devils advocate error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate counter-arguments" }, { status: 500 });
  }
}
