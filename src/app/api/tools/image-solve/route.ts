import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
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
      brief: "Provide a solution with at least 4-5 clear steps.",
      detailed: "Provide a comprehensive solution with at least 6-8 detailed steps. Each step should thoroughly explain the reasoning and calculations.",
      comprehensive: "Break down the solution into at least 8-12 numbered steps. Each step should have detailed explanations, show all intermediate calculations, and explain WHY each operation is performed.",
    };

    const languageInstructions = language && language !== "en" 
      ? `Provide the solution in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert tutor who explains problems thoroughly. Your goal is to help students UNDERSTAND, not just get the answer.

Subject: ${subjectGuide[subject]}
Detail Level: ${detailGuide[detailLevel]}
${languageInstructions}

CRITICAL INSTRUCTIONS:
1. Break the solution into MANY small, digestible steps (minimum 6 steps, ideally 8-12 for complex problems)
2. Each step should explain WHAT you're doing and WHY
3. Show ALL intermediate calculations - never skip steps
4. Use clear, educational language like you're teaching a student
5. Include the mathematical reasoning behind each operation

Use LaTeX notation for ALL mathematical expressions:
- Inline math: $...$  (e.g., "We have $x = 5$")
- Display math: $$...$$ (e.g., "$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$")

Your response MUST be valid JSON with this structure:
{
  "problemType": "Problem type (e.g., Quadratic Equation, Calculus)",
  "givenInfo": ["$x^2 + 5x + 6 = 0$", "Find the roots of this equation"],
  "steps": [
    {"step": 1, "title": "Identify the Problem Type", "content": "Looking at this equation, we can see it's in the form $ax^2 + bx + c = 0$. This is called a quadratic equation because the highest power of $x$ is 2."},
    {"step": 2, "title": "Extract Coefficients", "content": "Let's identify our coefficients by comparing with the standard form: $a = 1$ (the number before $x^2$), $b = 5$ (the number before $x$), $c = 6$ (the constant term)."},
    {"step": 3, "title": "Choose a Method", "content": "We can solve quadratic equations using: factoring, completing the square, or the quadratic formula. Let's try factoring first since it's often quickest."},
    {"step": 4, "title": "Factor the Expression", "content": "We need two numbers that multiply to give $c = 6$ and add to give $b = 5$. Those numbers are 2 and 3 because $2 \\times 3 = 6$ and $2 + 3 = 5$."},
    {"step": 5, "title": "Write in Factored Form", "content": "Using these numbers, we can write: $$x^2 + 5x + 6 = (x + 2)(x + 3)$$"},
    {"step": 6, "title": "Apply Zero Product Property", "content": "If $(x + 2)(x + 3) = 0$, then either $(x + 2) = 0$ or $(x + 3) = 0$. This is because if a product equals zero, at least one factor must be zero."},
    {"step": 7, "title": "Solve Each Factor", "content": "From $(x + 2) = 0$: subtract 2 from both sides → $x = -2$. From $(x + 3) = 0$: subtract 3 from both sides → $x = -3$."},
    {"step": 8, "title": "Verify Solutions", "content": "Check $x = -2$: $(-2)^2 + 5(-2) + 6 = 4 - 10 + 6 = 0$ ✓. Check $x = -3$: $(-3)^2 + 5(-3) + 6 = 9 - 15 + 6 = 0$ ✓. Both solutions are correct!"}
  ],
  "finalAnswer": "The solutions are $x = -2$ and $x = -3$",
  "concepts": ["Quadratic Equation", "Factoring", "Zero Product Property"],
  "tips": ["Always verify your solutions by substituting back", "If factoring is difficult, use the quadratic formula as backup"],
  "explanation": "This quadratic equation was solved by factoring, which is the simplest method when the equation factors nicely."
}

Return ONLY valid JSON. Use LaTeX for all math. Provide DETAILED explanations in each step.`;

    let result: string;
    let executedCode: string | null = null;
    let codeOutput: string | null = null;

    // Handle image vs text input differently
    if (inputType === "image" && image) {
      try {
        // Use Groq's Llama 4 Scout vision model for image analysis
        const response = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct", // Groq Llama 4 vision model
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Solve this problem step by step with detailed explanations:" },
                {
                  type: "image_url",
                  image_url: {
                    url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4000,
          temperature: 0.2,
        });
        result = response.choices[0]?.message?.content || "";
      } catch (groqError) {
        
        // Check if it's an API key issue
        const errorMsg = String(groqError);
        if (errorMsg.includes('401') || errorMsg.includes('API key')) {
          return NextResponse.json(
            { error: "Groq API key is invalid. Please check your GROQ_API_KEY." },
            { status: 401 }
          );
        }
        throw groqError;
      }
    } else {
      // Use Groq's best model for accurate math solving
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // Best Groq model for reasoning
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Solve this ${subject} problem with MANY detailed steps (at least 6-8 steps). Explain each step thoroughly like you're teaching a student. Show all intermediate calculations and explain WHY each operation is done. Use LaTeX for all math:\n\n${text}` }
        ],
        max_tokens: 6000,
        temperature: 0.2, // Slightly higher for more detailed explanations
      });
      result = response.choices[0]?.message?.content || "";
    }

    // Parse the response - find the outermost JSON object
    let solution;
    try {
      // Clean the result - remove markdown code blocks if present
      let cleanResult = result;
      if (result.includes('```json')) {
        cleanResult = result.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      } else if (result.includes('```')) {
        cleanResult = result.replace(/```\s*/g, '');
      }
      
      // Find JSON object - be more precise with matching
      const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        let parsed;
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          // Fix LaTeX escape sequences that break JSON parsing
          // The regex matches backslashes NOT followed by valid JSON escape chars or another backslash
          const fixedJson = jsonMatch[0]
            .replace(/\\([^"\\/bfnrtu\\])/g, '\\\\$1'); // Double-escape invalid escape sequences
          
          try {
            parsed = JSON.parse(fixedJson);
          } catch (e2) {
            throw e2;
          }
        }
        
        // Validate steps structure
        const validSteps = Array.isArray(parsed.steps) ? parsed.steps.map((s: { step?: number; title?: string; content?: string }, idx: number) => ({
          step: s.step || idx + 1,
          title: s.title || `Step ${idx + 1}`,
          content: typeof s.content === 'string' ? s.content : JSON.stringify(s.content || '')
        })) : [];
        
        solution = {
          problemType: parsed.problemType || "Problem",
          givenInfo: Array.isArray(parsed.givenInfo) ? parsed.givenInfo : [],
          steps: validSteps,
          finalAnswer: parsed.finalAnswer || "See solution above",
          concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
          tips: Array.isArray(parsed.tips) ? parsed.tips : [],
          explanation: parsed.explanation || "",
        };
        
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Fallback: try to extract meaningful content without JSON
      const cleanContent = result
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\{[\s\S]*\}$/g, '') // Remove if entire thing is JSON
        .trim();
      
      solution = {
        problemType: "Solution",
        givenInfo: [],
        steps: [{ step: 1, title: "Solution", content: cleanContent || "Unable to parse solution. Please try again." }],
        finalAnswer: "See solution above",
        concepts: [],
        tips: [],
        explanation: "",
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
