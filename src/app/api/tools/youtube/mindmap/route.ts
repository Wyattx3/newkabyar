import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const mindmapSchema = z.object({
  title: z.string(),
  summary: z.string(),
  topics: z.array(z.string()).optional(),
  takeaways: z.array(z.string()).optional(),
  keyMoments: z.array(z.any()).optional(),
});

// Clean text for mermaid (remove special characters)
function cleanText(text: string): string {
  return text
    .replace(/[()[\]{}'"<>]/g, '')
    .replace(/[^\w\s\u1000-\u109F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g, '')
    .trim()
    .slice(0, 30);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, summary, topics, takeaways, keyMoments } = mindmapSchema.parse(body);

    const creditsNeeded = 2;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const systemPrompt = `You are an expert at creating mind maps using Mermaid.js mindmap syntax.

Create a simple, clean mind map based on the video content.

STRICT RULES:
1. Use exactly this format - no other syntax
2. Root node uses double parentheses: root((Title))
3. Each branch is indented with 2 spaces
4. Sub-items are indented with 4 spaces
5. Keep all text SHORT (2-5 words max)
6. Use ONLY letters, numbers, and spaces in text
7. NO special characters: no (), [], {}, quotes, colons, etc.
8. Create 4-5 main branches max
9. Each branch has 2-3 sub-items max

EXACT FORMAT:
mindmap
  root((Main Topic))
    Branch One
      Sub item A
      Sub item B
    Branch Two
      Sub item X
      Sub item Y
    Branch Three
      Detail 1
      Detail 2

Return ONLY the mermaid code. No markdown. No explanations.`;

    const content = `Create a mind map for this video:

Title: ${cleanText(title)}

Main Topics: ${topics?.slice(0, 4).map(t => cleanText(t)).join(', ') || 'General'}

Key Points: ${takeaways?.slice(0, 4).map(t => cleanText(t)).join(', ') || 'Summary'}`;

    const result = await chatWithTier(
      "fast",
      systemPrompt,
      content,
      session.user.id
    );

    // Clean up the result
    let mermaidCode = result
      .replace(/```mermaid/gi, '')
      .replace(/```/g, '')
      .trim();

    // Validate and fix mermaid code
    if (!mermaidCode.startsWith('mindmap')) {
      // Generate fallback mindmap
      const safeTitle = cleanText(title) || 'Video Summary';
      const safeTopics = topics?.slice(0, 4).map(t => cleanText(t)) || ['Topic 1', 'Topic 2'];
      const safeTakeaways = takeaways?.slice(0, 4).map(t => cleanText(t)) || ['Point 1', 'Point 2'];
      
      mermaidCode = `mindmap
  root((${safeTitle}))
    Main Topics
${safeTopics.map(t => `      ${t}`).join('\n')}
    Key Points
${safeTakeaways.map(t => `      ${t}`).join('\n')}`;
    }

    // Additional cleanup - remove any problematic characters
    mermaidCode = mermaidCode
      .split('\n')
      .map(line => {
        // Keep indentation and basic structure
        const indent = line.match(/^(\s*)/)?.[0] || '';
        let content = line.trim();
        
        // Don't modify root or mindmap lines
        if (content === 'mindmap' || content.startsWith('root((')) {
          return line;
        }
        
        // Clean content of special chars (except for root node)
        content = content.replace(/[()[\]{}'"<>:;]/g, '').trim();
        
        return indent + content;
      })
      .join('\n');

    await deductCredits(session.user.id, creditsNeeded, "youtube-mindmap");

    return NextResponse.json({
      mermaidCode,
    });
  } catch (error) {
    console.error("Mindmap error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate mind map" }, { status: 500 });
  }
}
