import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const codeVisualSchema = z.object({
  code: z.string().min(10, "Code must be at least 10 characters"),
  language: z.string().optional(),
  visualType: z.enum(["flowchart", "sequence", "class"]).default("flowchart"),
  model: z.string().default("fast"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = codeVisualSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { code, language, visualType, model } = validatedData;

    const visualGuide: Record<string, string> = {
      flowchart: `Create a Mermaid flowchart showing the control flow:
- Use [Text] for process boxes
- Use {Text} for decision diamonds
- Use ([Text]) for start/end
- Show all branches and loops`,
      sequence: `Create a Mermaid sequence diagram showing:
- Participants (functions, classes, modules)
- Method/function calls
- Return values
- Async operations if any`,
      class: `Create a Mermaid class diagram showing:
- Classes/interfaces with their properties and methods
- Relationships (inheritance, composition, association)
- Visibility modifiers`,
    };

    const systemPrompt = `You are an expert at analyzing code and creating visual diagrams.

Task: Analyze the given code and create a Mermaid diagram.
${language ? `Programming Language: ${language}` : "Detect the programming language."}
Visualization Type: ${visualType}

${visualGuide[visualType]}

IMPORTANT:
- Use simple alphanumeric text in nodes (no special characters)
- Return ONLY the Mermaid code, no explanations
- Do NOT wrap in markdown code blocks

Also provide a brief JSON summary before the Mermaid code:
{"explanation": "Brief explanation of what the code does", "complexity": "O(n) complexity if applicable", "keyPoints": ["Point 1", "Point 2"]}

---MERMAID---
(your mermaid code here)`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Visualize this code:\n\n${code.slice(0, 5000)}`,
      session.user.id
    );

    // Parse the response
    let explanation = { explanation: "", complexity: "", keyPoints: [] as string[] };
    let mermaidCode = "";

    try {
      // Split by the separator
      const parts = result.split("---MERMAID---");
      
      if (parts.length >= 2) {
        // Parse JSON explanation
        const jsonMatch = parts[0].match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          explanation = JSON.parse(jsonMatch[0]);
        }
        
        // Get Mermaid code
        mermaidCode = parts[1]
          .replace(/```mermaid\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
      } else {
        // Fallback: try to extract mermaid code directly
        mermaidCode = result
          .replace(/```mermaid\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      mermaidCode = result;
    }

    // Ensure valid mermaid type
    if (!mermaidCode.startsWith("flowchart") && 
        !mermaidCode.startsWith("sequenceDiagram") && 
        !mermaidCode.startsWith("classDiagram") &&
        !mermaidCode.startsWith("graph")) {
      const prefix = visualType === "sequence" ? "sequenceDiagram" : 
                    visualType === "class" ? "classDiagram" : "flowchart TD";
      mermaidCode = `${prefix}\n${mermaidCode}`;
    }

    await deductCredits(session.user.id, creditsNeeded, "code-visualizer");

    return NextResponse.json({
      mermaidCode,
      ...explanation,
    });
  } catch (error) {
    console.error("Code visualization error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to visualize code" }, { status: 500 });
  }
}
