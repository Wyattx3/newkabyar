import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const emailSchema = z.object({
  purpose: z.enum(["internship", "job", "networking", "professor", "followup"]),
  recipientName: z.string().min(1),
  recipientRole: z.string().optional(),
  company: z.string().optional(),
  yourBackground: z.string().min(10),
  specificAsk: z.string().optional(),
  tone: z.enum(["professional", "friendly", "formal"]).default("professional"),
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
    const validatedData = emailSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { purpose, recipientName, recipientRole, company, yourBackground, specificAsk, tone, model, language } = validatedData;

    const purposeGuide: Record<string, string> = {
      internship: "Requesting an internship opportunity. Show enthusiasm and relevant skills.",
      job: "Applying for a job position. Highlight experience and value proposition.",
      networking: "Building professional connections. Focus on mutual benefits.",
      professor: "Contacting a professor for research/academic purposes. Be respectful and specific.",
      followup: "Following up on a previous conversation. Be brief and action-oriented.",
    };

    const languageInstructions = language !== "en" 
      ? `Write the email in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert at writing effective cold emails that get responses.

Purpose: ${purposeGuide[purpose]}
Tone: ${tone}
${languageInstructions}

Your output MUST be valid JSON:
{
  "subject": "Compelling email subject line",
  "body": "The full email body with proper formatting",
  "tips": ["Tip 1 for improving response rate", "Tip 2"]
}

Email Guidelines:
- Keep it under 150 words
- Start with a hook or connection point
- Be specific about what you're asking
- Show you've done research on the recipient
- End with a clear call-to-action
- Be genuine, not salesy
- Use proper greeting and sign-off

Return ONLY valid JSON.`;

    const context = `
Recipient: ${recipientName}${recipientRole ? ` (${recipientRole})` : ""}${company ? ` at ${company}` : ""}
About me: ${yourBackground}
${specificAsk ? `Specific request: ${specificAsk}` : ""}
`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Write a ${purpose} cold email:\n${context}`,
      session.user.id
    );

    // Parse the response
    let email;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        email = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      email = {
        subject: "Cold Email",
        body: result,
        tips: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "cold-email");

    return NextResponse.json(email);
  } catch (error) {
    console.error("Email generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate email" }, { status: 500 });
  }
}
