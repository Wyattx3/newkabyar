import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import OpenAI from "openai";
import Groq from "groq-sdk";

const solveSchema = z.object({
  image: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  inputType: z.enum(["image", "text", "pdf", "url"]).default("image"),
  subject: z.enum(["math", "physics", "chemistry", "biology", "programming", "statistics", "general"]).default("general"),
  detailLevel: z.enum(["brief", "detailed", "comprehensive"]).default("detailed"),
  model: z.string().default("fast"),
  language: z.string().default("en"),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = solveSchema.parse(body);

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { image, text, inputType, subject, detailLevel, model, language } = validatedData;

    // Validate input
    if (inputType === "image" && !image) {
      return NextResponse.json({ error: "Image is required for image input" }, { status: 400 });
    }
    if (inputType !== "image" && !text) {
      return NextResponse.json({ error: "Text is required for text input" }, { status: 400 });
    }

    const subjectGuide: Record<string, string> = {
      math: "This is a mathematics problem. Show all calculations clearly.",
      physics: "This is a physics problem. Include formulas, units, and physical reasoning.",
      chemistry: "This is a chemistry problem. Include molecular structures, equations, and reaction types.",
      biology: "This is a biology problem. Include diagrams descriptions and biological concepts.",
      programming: "This is a programming/coding problem. Include code examples and explanations.",
      statistics: "This is a statistics problem. Include formulas, probability, and data analysis.",
      general: "Analyze this academic problem and provide a solution.",
    };

    const detailGuide: Record<string, string> = {
      brief: "Provide a concise answer with key steps only.",
      detailed: "Provide a comprehensive solution with explanations.",
      comprehensive: "Break down the solution into numbered steps with clear explanations for each step.",
    };

    const languageInstructions = language && language !== "en" 
      ? `Provide the solution in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert tutor helping students solve problems.

Subject Context: ${subjectGuide[subject]}
Detail Level: ${detailGuide[detailLevel]}
${languageInstructions}

Your response MUST be valid JSON with this EXACT structure:
{
  "problemType": "Type of problem identified (e.g., Algebra, Calculus, Physics - Kinematics)",
  "givenInfo": ["Given information 1", "Given information 2"],
  "steps": [
    {"step": 1, "title": "Step title", "content": "Detailed explanation and work"},
    {"step": 2, "title": "Step title", "content": "Detailed explanation and work"}
  ],
  "finalAnswer": "The final answer clearly stated",
  "concepts": ["Concept 1 used", "Concept 2 used"],
  "tips": ["Helpful tip for similar problems"],
  "explanation": "Brief explanation of why this answer is correct"
}

Return ONLY valid JSON.`;

    let result: string;
    let executedCode: string | null = null;
    let codeOutput: string | null = null;

    // Handle image vs text input differently
    if (inputType === "image" && image) {
      // Use OpenAI GPT-4o for image analysis
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
      result = response.choices[0]?.message?.content || "";
    } else {
      // Use Groq compound model with code execution for math/programming problems
      const isMathOrProgramming = ["math", "physics", "statistics", "programming"].includes(subject);
      
      if (isMathOrProgramming) {
        try {
          // Use Groq compound for code execution
          const compoundResponse = await groq.chat.completions.create({
            model: "groq/compound",
            messages: [
              { 
                role: "system", 
                content: `You are an expert tutor. For math/physics/statistics problems, use Python code execution to verify your calculations. Always show your work step by step.

${languageInstructions}

After solving, format your response as JSON:
{
  "problemType": "Type of problem",
  "givenInfo": ["Given info 1", "Given info 2"],
  "steps": [
    {"step": 1, "title": "Step title", "content": "Explanation with calculation"}
  ],
  "finalAnswer": "The answer",
  "concepts": ["Concept 1"],
  "tips": ["Tip 1"],
  "explanation": "Why this is correct",
  "codeUsed": "Python code if used",
  "codeOutput": "Output from code execution"
}` 
              },
              { role: "user", content: `Solve this ${subject} problem step by step. Use code execution to verify calculations:\n\n${text}` }
            ],
            max_tokens: 4000,
          });
          
          result = compoundResponse.choices[0]?.message?.content || "";
          
          // Extract code execution info if present
          const codeMatch = result.match(/```python([\s\S]*?)```/);
          if (codeMatch) {
            executedCode = codeMatch[1].trim();
          }
        } catch (groqError) {
          console.error("Groq compound error, falling back:", groqError);
          // Fallback to regular Groq
          const fallbackResponse = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Solve this problem:\n\n${text}` }
            ],
            max_tokens: 2000,
          });
          result = fallbackResponse.choices[0]?.message?.content || "";
        }
      } else {
        // Use regular Groq for non-math subjects
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Solve this problem:\n\n${text}` }
          ],
          max_tokens: 2000,
        });
        result = response.choices[0]?.message?.content || "";
      }
    }

    // Parse the response
    let solution;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Normalize the structure to match frontend expectations
        solution = {
          problemType: parsed.problemType || "Problem",
          givenInfo: parsed.givenInfo || [],
          steps: parsed.steps || (parsed.solution?.steps?.map((s: any, i: number) => ({
            step: s.number || i + 1,
            title: s.description || `Step ${i + 1}`,
            content: s.work || s.content || ""
          })) || []),
          finalAnswer: parsed.finalAnswer || parsed.solution?.finalAnswer || "See solution above",
          concepts: parsed.concepts || [],
          tips: parsed.tips || [],
          explanation: parsed.explanation || parsed.solution?.explanation || "",
          codeUsed: parsed.codeUsed || executedCode || null,
          codeOutput: parsed.codeOutput || codeOutput || null,
        };
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Try to extract steps from plain text
      const lines = result.split('\n').filter(l => l.trim());
      const steps = lines.map((line, i) => ({
        step: i + 1,
        title: `Step ${i + 1}`,
        content: line.replace(/^\d+[\.\)]\s*/, '').trim()
      })).filter(s => s.content.length > 10).slice(0, 10);
      
      solution = {
        problemType: "Analysis",
        givenInfo: [],
        steps: steps.length > 0 ? steps : [{ step: 1, title: "Solution", content: result }],
        finalAnswer: "See solution above",
        concepts: [],
        tips: [],
        explanation: "",
        codeUsed: executedCode,
        codeOutput: codeOutput,
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
