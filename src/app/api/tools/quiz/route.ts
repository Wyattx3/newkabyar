import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { streamWithTier } from "@/lib/ai-providers";

const quizSchema = z.object({
  text: z.string().min(100, "Text must be at least 100 characters"),
  questionCount: z.number().min(1).max(50).default(10),
  questionTypes: z.array(z.enum(["mcq", "truefalse", "fillin"])).default(["mcq"]),
  difficulty: z.enum(["easy", "medium", "hard", "tricky"]).default("medium"),
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
    const validatedData = quizSchema.parse(body);

    // Check credits
    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { text, questionCount, questionTypes, difficulty, model, language } = validatedData;

    const questionTypeDescriptions = {
      mcq: "Multiple choice questions with 4 options (A, B, C, D) and one correct answer",
      truefalse: "True or False questions",
      fillin: "Fill in the blank questions with the answer word/phrase",
    };

    const selectedTypes = questionTypes.map(t => questionTypeDescriptions[t]).join("; ");
    
    const difficultyGuide: Record<string, string> = {
      easy: "Basic recall and simple understanding questions",
      medium: "Application and analysis level questions",
      hard: "Critical thinking and synthesis level questions",
      tricky: "Include misleading options that seem correct but aren't. Add questions with subtle differences. Some wrong options should be very close to the correct answer to test deep understanding. Also include 2-3 questions where ALL options look correct but only one is truly accurate based on the content.",
    };

    const languageMap: Record<string, string> = {
      en: "English",
      my: "Burmese (မြန်မာ)",
      zh: "Chinese (中文)",
      th: "Thai (ไทย)",
      ko: "Korean (한국어)",
      ja: "Japanese (日本語)",
    };
    
    const targetLanguage = languageMap[language] || "English";
    const isTranslated = language !== "en";

    const systemPrompt = `You are an expert quiz generator for educational purposes.

CRITICAL REQUIREMENT: You MUST generate EXACTLY ${questionCount} questions. Count them before returning.

Rules:
- Generate EXACTLY ${questionCount} questions (mandatory)
- Question types: ${selectedTypes}
- Difficulty: ${difficulty} - ${difficultyGuide[difficulty]}
- Questions must be answerable from the provided content
- For MCQ: Make wrong options plausible
- For Fill-in-blank: Use underscores (___) for the blank
${isTranslated ? `
TRANSLATION REQUIREMENT:
- Keep "question", "options", "correctAnswer", "explanation" in ENGLISH
- Add ONLY "questionTranslated" with a SHORT translation in ${targetLanguage}
- Do NOT add optionsTranslated (keep options in English only)` : ""}

Output Format (JSON only):
{
  "title": "Quiz title",
  "questions": [
    {
      "id": 1,
      "type": "mcq|truefalse|fillin",
      "question": "Question in English",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A|B|C|D|true|false|answer text",
      "explanation": "Brief explanation in English"${isTranslated ? `,
      "questionTranslated": "Short translation in ${targetLanguage}"` : ""}
    }
  ]
}

Return ONLY valid JSON. No markdown. Generate exactly ${questionCount} questions.`;

    const userPrompt = `Generate a quiz from this content:\n\n${text}`;

    // Stream the response
    const stream = await streamWithTier(
      model,
      systemPrompt,
      userPrompt,
      session.user.id
    );

    // Deduct credits
    await deductCredits(session.user.id, creditsNeeded, "quiz-generator");

    // Return streaming response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
