import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const flowchartSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  direction: z.enum(["TD", "LR", "BT", "RL"]).default("TD"),
  style: z.enum(["simple", "detailed"]).default("simple"),
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
    const validatedData = flowchartSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { description, direction, style, model, language } = validatedData;

    const directionMap: Record<string, string> = {
      TD: "top to bottom",
      LR: "left to right",
      BT: "bottom to top",
      RL: "right to left",
    };

    const languageInstructions = language !== "en" 
      ? `Generate the flowchart labels in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert at creating flowcharts. Generate a Mermaid.js flowchart diagram.

Rules:
- Direction: ${direction} (${directionMap[direction]})
- Style: ${style === "detailed" ? "Include decision diamonds and multiple paths" : "Simple linear flow with key steps"}
- Use clear, concise labels (max 4-5 words per node)
- Use appropriate node shapes:
  - [Text] for process/action boxes
  - {Text} for decision diamonds
  - ([Text]) for start/end rounded boxes
  - [[Text]] for subroutines
- DO NOT use special characters that break Mermaid syntax
- Use simple alphanumeric text and spaces only
${languageInstructions}

Output Format:
Return ONLY valid Mermaid flowchart syntax. Example:

flowchart ${direction}
    A([Start]) --> B[Step 1]
    B --> C{Decision?}
    C -->|Yes| D[Action A]
    C -->|No| E[Action B]
    D --> F([End])
    E --> F

IMPORTANT: Return ONLY the Mermaid code, no explanations or markdown code blocks.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Create a flowchart for: ${description}`,
      session.user.id
    );

    // Clean up the response
    let mermaidCode = result
      .replace(/```mermaid\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Comprehensive mermaid code sanitization
    mermaidCode = mermaidCode
      // Remove YAML front-matter (---)
      .replace(/^---[\s\S]*?---\s*\n?/, '')
      // Remove any standalone --- lines (not part of arrows)
      .replace(/^---+\s*$/gm, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove %% comments
      .replace(/%%.*$/gm, '')
      // Fix various prefixes to "flowchart"
      .replace(/^chart\s+(TD|TB|BT|RL|LR)/im, `flowchart $1`)
      .replace(/^Chart\s+(TD|TB|BT|RL|LR)/im, `flowchart $1`)
      .replace(/^graph\s+(TD|TB|BT|RL|LR)/im, `flowchart $1`)
      .replace(/^Graph\s+(TD|TB|BT|RL|LR)/im, `flowchart $1`)
      // Remove empty lines at start
      .replace(/^\s*\n+/, '')
      .trim();

    // Ensure it starts with flowchart
    if (!/^flowchart\s+(TD|TB|BT|RL|LR)/im.test(mermaidCode)) {
      // Remove any invalid prefix and add correct one
      mermaidCode = mermaidCode.replace(/^[A-Za-z]+\s+(TD|TB|BT|RL|LR)\s*\n/im, '');
      mermaidCode = `flowchart ${direction}\n` + mermaidCode;
    }

    // Process line by line for better sanitization
    const lines = mermaidCode.split('\n');
    const sanitizedLines = lines.map((line, index) => {
      // Keep first line (flowchart declaration) as is
      if (index === 0 && /^flowchart\s+(TD|TB|BT|RL|LR)/i.test(line)) {
        return line;
      }
      
      // Skip empty lines
      if (!line.trim()) return '';
      
      // Sanitize edge labels: |text|
      let sanitizedLine = line.replace(/\|([^|]*)\|/g, (match, label) => {
        const sanitized = label
          .replace(/[()[\]{}%#&<>]/g, '')
          .replace(/[^\w\s,.!?:;'-]/g, '')
          .trim();
        if (!sanitized) return '';
        return `|${sanitized}|`;
      });
      
      // Fix double pipes that might remain
      sanitizedLine = sanitizedLine.replace(/\|\|/g, '');
      
      // Sanitize node labels
      sanitizedLine = sanitizedLine.replace(/(\[+|\{|\(\[)([^\]\}]+)(\]+|\}|\]\))/g, (match, open, label, close) => {
        const sanitized = label
          .replace(/%/g, ' percent')
          .replace(/[#&<>]/g, '')
          .replace(/"/g, "'")
          .trim();
        return `${open}${sanitized}${close}`;
      });
      
      return sanitizedLine;
    });
    
    mermaidCode = sanitizedLines.filter(line => line.trim()).join('\n');

    await deductCredits(session.user.id, creditsNeeded, "flowchart");

    return NextResponse.json({ 
      mermaidCode,
      description,
    });
  } catch (error) {
    console.error("Flowchart generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate flowchart" }, { status: 500 });
  }
}
