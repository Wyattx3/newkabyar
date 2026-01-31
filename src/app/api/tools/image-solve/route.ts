import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import OpenAI from "openai";

const imageSchema = z.object({
  image: z.string(), // Base64 image data
  subject: z.enum(["math", "physics", "chemistry", "biology", "general"]).default("general"),
  detailLevel: z.enum(["brief", "detailed", "step-by-step"]).default("step-by-step"),
  language: z.string().default("en"),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = imageSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { image, subject, detailLevel, language } = validatedData;

    const subjectGuide: Record<string, string> = {
      math: "This is a mathematics problem. Show all calculations clearly.",
      physics: "This is a physics problem. Include formulas, units, and physical reasoning.",
      chemistry: "This is a chemistry problem. Include molecular structures, equations, and reaction types.",
      biology: "This is a biology problem. Include diagrams descriptions and biological concepts.",
      general: "Analyze this academic problem and provide a solution.",
    };

    const detailGuide: Record<string, string> = {
      brief: "Provide a concise answer with key steps only.",
      detailed: "Provide a comprehensive solution with explanations.",
      "step-by-step": "Break down the solution into numbered steps with clear explanations for each.",
    };

    const languageInstructions = language !== "en" 
      ? `Provide the solution in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert tutor helping students solve problems.

Subject Context: ${subjectGuide[subject]}
Detail Level: ${detailGuide[detailLevel]}
${languageInstructions}

Your response MUST be valid JSON:
{
  "problemType": "Type of problem identified",
  "givenInfo": ["Given information 1", "Given information 2"],
  "solution": {
    "steps": [
      {"number": 1, "description": "Step description", "work": "Calculation or reasoning"},
      {"number": 2, "description": "Step description", "work": "Calculation or reasoning"}
    ],
    "finalAnswer": "The final answer clearly stated",
    "explanation": "Why this is the correct answer"
  },
  "concepts": ["Concept 1 used", "Concept 2 used"],
  "tips": ["Helpful tip for similar problems"]
}

Return ONLY valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Solve this problem:" },
            {
              type: "image_url",
              image_url: {
                url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const result = response.choices[0]?.message?.content || "";

    // Parse the response
    let solution;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        solution = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      solution = {
        problemType: "Unknown",
        givenInfo: [],
        solution: {
          steps: [{ number: 1, description: "Analysis", work: result }],
          finalAnswer: "See steps above",
          explanation: "",
        },
        concepts: [],
        tips: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "image-solve");

    return NextResponse.json(solution);
  } catch (error) {
    console.error("Image solve error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to solve problem" }, { status: 500 });
  }
}
