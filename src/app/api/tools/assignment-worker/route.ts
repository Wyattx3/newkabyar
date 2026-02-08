import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const assignmentSchema = z.object({
  assignment: z.string().min(5, "Assignment must be at least 5 characters"),
  instructions: z.string().optional(),
  outputFormat: z.enum(["detailed", "concise", "academic"]).default("detailed"),
  model: z.string().default("fast"),
  language: z.string().default("en"),
});

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

// Step 1: Decompose assignment into tasks
async function decomposeAssignment(
  assignment: string,
  instructions: string,
  language: string,
  tier: "fast" | "normal" | "pro-smart" | "super-smart"
): Promise<{ title: string; tasks: { id: number; type: string; title: string; description: string; priority: "high" | "medium" | "low" }[] }> {
  const systemPrompt = `You are an expert assignment analyzer. Decompose any assignment into clear, actionable tasks.

${language !== "en" ? `Write all output in ${language} language.` : ""}

Analyze the assignment and break it into individual tasks. Each task should be independently completable.

Task types: "essay", "math", "code", "research", "analysis", "creative", "summary", "qa", "diagram", "translation", "other"

Return ONLY valid JSON:
{
  "title": "Short assignment title",
  "tasks": [
    {
      "id": 1,
      "type": "essay|math|code|research|analysis|creative|summary|qa|diagram|translation|other",
      "title": "Task title",
      "description": "Detailed description of what to do",
      "priority": "high|medium|low"
    }
  ]
}

RULES:
- Break complex assignments into 2-8 smaller tasks
- Simple assignments can be 1-2 tasks
- Each task must be clear and self-contained
- Order tasks logically (dependencies first)
- Identify the correct task type for best results`;

  const userPrompt = `Assignment: ${assignment}${instructions ? `\n\nAdditional instructions: ${instructions}` : ""}`;

  const result = await chatWithTier(tier, systemPrompt, userPrompt);
  const jsonStr = extractJSON(result);

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      title: parsed.title || "Assignment",
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.map((t: Record<string, unknown>, i: number) => ({
            id: t.id || i + 1,
            type: t.type || "other",
            title: String(t.title || `Task ${i + 1}`),
            description: String(t.description || ""),
            priority: t.priority || "medium",
          }))
        : [{ id: 1, type: "other", title: "Complete Assignment", description: assignment, priority: "high" }],
    };
  } catch {
    return {
      title: "Assignment",
      tasks: [{ id: 1, type: "other", title: "Complete Assignment", description: assignment, priority: "high" }],
    };
  }
}

// Step 2: Execute individual task
async function executeTask(
  task: { id: number; type: string; title: string; description: string },
  assignmentContext: string,
  outputFormat: string,
  language: string,
  tier: "fast" | "normal" | "pro-smart" | "super-smart"
): Promise<{ id: number; title: string; type: string; status: "completed" | "error"; content: string; codeBlocks?: { language: string; code: string }[]; mathExpressions?: string[] }> {
  const formatInstructions: Record<string, string> = {
    detailed: "Provide thorough, well-structured answers with examples and explanations. Use markdown formatting.",
    concise: "Be direct and concise. Focus on key points. Use bullet points where appropriate.",
    academic: "Use formal academic tone. Include citations format where relevant. Structure with proper headings.",
  };

  const typeInstructions: Record<string, string> = {
    essay: `Write a well-structured essay with introduction, body paragraphs, and conclusion.
Use clear topic sentences and supporting evidence. Ensure smooth transitions between paragraphs.`,
    math: `Solve the math problem step-by-step. Show ALL work clearly.
Use proper mathematical notation. Verify the answer at the end.
Format math expressions using LaTeX syntax wrapped in $ for inline and $$ for block.`,
    code: `Write clean, well-commented code. Include:
- Proper variable naming
- Error handling
- Comments explaining logic
- Example usage/test cases
Wrap code in \`\`\`language blocks.`,
    research: `Provide well-researched information with:
- Key findings organized by theme
- Multiple perspectives where relevant
- Data and statistics when available
- Proper source attribution format`,
    analysis: `Provide systematic analysis:
- Break down the subject into components
- Examine each component critically
- Identify patterns, strengths, weaknesses
- Draw evidence-based conclusions`,
    creative: `Create engaging, original content:
- Use vivid language and imagery
- Maintain consistent tone and style
- Show creativity while meeting requirements`,
    summary: `Create a clear, comprehensive summary:
- Identify main ideas and key points
- Maintain the original meaning
- Use concise language
- Organize logically`,
    qa: `Answer the question directly and thoroughly:
- Start with a clear answer
- Provide supporting explanation
- Include relevant examples`,
    diagram: `Describe the diagram/flowchart in detail using text representation:
- Use ASCII art or structured text for visual elements
- Label all components clearly
- Show relationships and flow`,
    translation: `Provide accurate translation:
- Maintain original meaning and tone
- Use natural language in target language
- Note any cultural context differences`,
    other: `Complete this task thoroughly and accurately. Use the most appropriate format for the content.`,
  };

  const systemPrompt = `You are an expert assignment worker. Complete the following task as part of a larger assignment.

ASSIGNMENT CONTEXT: ${assignmentContext}

TASK TYPE: ${task.type}
${typeInstructions[task.type] || typeInstructions.other}

OUTPUT FORMAT: ${formatInstructions[outputFormat]}

${language !== "en" ? `Write ALL content in ${language} language.` : ""}

IMPORTANT:
- Complete the task fully and thoroughly
- Use proper markdown formatting (headers, lists, bold, code blocks)
- For math: use LaTeX notation ($inline$ and $$block$$)
- For code: use proper code blocks with language tags
- Be accurate and well-organized
- Do NOT include meta-commentary about the task itself`;

  try {
    const result = await chatWithTier(tier, systemPrompt, `Task: ${task.title}\n\nDetails: ${task.description}`);

    // Extract code blocks
    const codeBlocks: { language: string; code: string }[] = [];
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = codeRegex.exec(result)) !== null) {
      codeBlocks.push({ language: match[1] || "text", code: match[2].trim() });
    }

    // Extract math expressions
    const mathExpressions: string[] = [];
    const mathBlockRegex = /\$\$([\s\S]*?)\$\$/g;
    while ((match = mathBlockRegex.exec(result)) !== null) {
      mathExpressions.push(match[1].trim());
    }
    const mathInlineRegex = /(?<!\$)\$([^$]+?)\$(?!\$)/g;
    while ((match = mathInlineRegex.exec(result)) !== null) {
      mathExpressions.push(match[1].trim());
    }

    return {
      id: task.id,
      title: task.title,
      type: task.type,
      status: "completed",
      content: result,
      ...(codeBlocks.length > 0 && { codeBlocks }),
      ...(mathExpressions.length > 0 && { mathExpressions }),
    };
  } catch (error) {
    console.error(`[Assignment] Task ${task.id} failed:`, error);
    return {
      id: task.id,
      title: task.title,
      type: task.type,
      status: "error",
      content: "Failed to complete this task. Please try again.",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = assignmentSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { assignment, instructions, outputFormat, model, language } = validatedData;
    const tier = model === "smart" ? "normal" : model === "pro" ? "pro-smart" : "fast";

    // Step 1: Decompose into tasks
    const decomposed = await decomposeAssignment(
      assignment,
      instructions || "",
      language,
      tier
    );

    // Step 2: Execute ALL tasks in parallel for maximum speed
    const taskResults = await Promise.all(
      decomposed.tasks.map((task) =>
        executeTask(task, assignment, outputFormat, language, tier)
      )
    );

    // Step 3: Build response
    const completedCount = taskResults.filter((r) => r.status === "completed").length;
    const totalTasks = taskResults.length;

    await deductCredits(session.user.id, creditsNeeded, "assignment-worker");

    return NextResponse.json({
      success: true,
      data: {
        title: decomposed.title,
        totalTasks,
        completedTasks: completedCount,
        tasks: decomposed.tasks.map((task) => ({
          ...task,
          result: taskResults.find((r) => r.id === task.id),
        })),
      },
    });
  } catch (error: unknown) {
    console.error("[Assignment Worker] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
