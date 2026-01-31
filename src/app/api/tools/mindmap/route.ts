import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const mindmapSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters").optional(),
  content: z.string().min(50, "Content must be at least 50 characters").optional(),
  depth: z.enum(["shallow", "medium", "deep"]).default("medium"),
  style: z.enum(["radial", "hierarchical"]).default("radial"),
  model: z.string().default("fast"),
  language: z.string().default("en"),
}).refine((data) => data.topic || data.content, {
  message: "Either topic or content must be provided",
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = mindmapSchema.parse(body);

    // Check credits
    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { topic, content, depth, style, model, language } = validatedData;

    const depthGuide = {
      shallow: "2 levels deep with 3-4 main branches",
      medium: "3 levels deep with 4-6 main branches",
      deep: "4 levels deep with 5-7 main branches and detailed sub-branches",
    };

    const languageInstructions = language !== "en" 
      ? `Generate the mind map content in ${language} language.` 
      : "";

    const isContentBased = !!content;
    const displayTopic = topic || "Content Summary";

    const systemPrompt = isContentBased
      ? `You are an expert at creating educational mind maps from document content. Generate a Mermaid.js mindmap diagram.

Rules:
- Analyze the provided content and extract the main concepts and relationships
- Depth: ${depth} - ${depthGuide[depth]}
- Create a comprehensive mind map covering all important aspects from the content
- Use clear, concise labels (max 3-4 words per node)
- Organize logically with related concepts grouped together
- DO NOT use special characters like quotes, colons, or brackets in labels
- Use simple alphanumeric text only
${languageInstructions}

Output Format:
Return ONLY valid Mermaid mindmap syntax. Example:

mindmap
  root((Main Topic))
    Branch1
      Sub1a
      Sub1b
    Branch2
      Sub2a
      Sub2b
        Detail1
        Detail2
    Branch3
      Sub3a

IMPORTANT: Return ONLY the Mermaid code, no explanations or markdown code blocks.`
      : `You are an expert at creating educational mind maps. Generate a Mermaid.js mindmap diagram.

Rules:
- Topic: "${topic}"
- Depth: ${depth} - ${depthGuide[depth]}
- Create a comprehensive mind map covering all important aspects
- Use clear, concise labels (max 3-4 words per node)
- Organize logically with related concepts grouped together
- DO NOT use special characters like quotes, colons, or brackets in labels
- Use simple alphanumeric text only
${languageInstructions}

Output Format:
Return ONLY valid Mermaid mindmap syntax. Example:

mindmap
  root((Main Topic))
    Branch1
      Sub1a
      Sub1b
    Branch2
      Sub2a
      Sub2b
        Detail1
        Detail2
    Branch3
      Sub3a

IMPORTANT: Return ONLY the Mermaid code, no explanations or markdown code blocks.`;

    const userMessage = isContentBased
      ? `Create a mind map from this content:\n\n${content.slice(0, 15000)}`
      : `Create a mind map for: ${topic}`;

    // Non-streaming for diagram generation
    const result = await chatWithTier(
      model,
      systemPrompt,
      userMessage,
      session.user.id
    );

    // Clean up the response
    let mermaidCode = result
      .replace(/```mermaid\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Ensure it starts with mindmap
    if (!mermaidCode.startsWith("mindmap")) {
      mermaidCode = "mindmap\n" + mermaidCode;
    }

    // Deduct credits
    await deductCredits(session.user.id, creditsNeeded, "mind-map");

    return NextResponse.json({ 
      mermaidCode,
      topic: displayTopic,
    });
  } catch (error) {
    console.error("Mind map generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate mind map" }, { status: 500 });
  }
}
