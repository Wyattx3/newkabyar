import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const vivaSchema = z.object({
  topic: z.string().min(10, "Topic must be at least 10 characters"),
  answer: z.string().optional(),
  questionHistory: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    feedback: z.string().optional(),
  })).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  subject: z.string().optional(),
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
    const validatedData = vivaSchema.parse(body);

    const creditsNeeded = 2; // Per question interaction
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { topic, answer, questionHistory, difficulty, subject, model, language } = validatedData;

    const difficultyGuide = {
      beginner: "Ask foundational questions, be encouraging, give detailed explanations",
      intermediate: "Ask deeper questions, expect reasonable understanding, provide constructive feedback",
      advanced: "Ask challenging questions, probe for deep understanding, be rigorous in assessment",
    };

    const languageInstructions = language !== "en" 
      ? `Conduct the viva in ${language} language.` 
      : "";

    const isFirstQuestion = !questionHistory || questionHistory.length === 0;
    const isAnswer = answer && answer.length > 0;

    let systemPrompt: string;
    let userMessage: string;

    if (isFirstQuestion) {
      // Generate first question
      systemPrompt = `You are an expert oral examiner conducting a viva voce examination.

Topic: ${topic}
${subject ? `Subject: ${subject}` : ""}
Difficulty: ${difficulty} - ${difficultyGuide[difficulty]}
${languageInstructions}

Generate the first question to start the viva examination.

Your response MUST be valid JSON:
{
  "question": "Your first viva question",
  "questionType": "conceptual|application|analysis",
  "expectedPoints": ["Key point 1 expected in answer", "Key point 2"],
  "hint": "A subtle hint if student struggles",
  "tips": "General advice for answering this type of question"
}

Make the question clear and appropriate for the difficulty level. Return ONLY valid JSON.`;
      userMessage = `Start the viva examination on: ${topic}`;
    } else {
      // Evaluate answer and ask follow-up
      systemPrompt = `You are an expert oral examiner conducting a viva voce examination.

Topic: ${topic}
${subject ? `Subject: ${subject}` : ""}
Difficulty: ${difficulty} - ${difficultyGuide[difficulty]}
${languageInstructions}

Evaluate the student's answer and provide feedback, then ask a follow-up question.

Your response MUST be valid JSON:
{
  "feedback": {
    "score": 75,
    "strengths": ["What they got right"],
    "improvements": ["What could be better"],
    "explanation": "Brief explanation of correct answer if needed"
  },
  "followUpQuestion": "Your next question based on their answer",
  "questionType": "conceptual|application|analysis|follow-up",
  "expectedPoints": ["Key points for the follow-up"],
  "overallProgress": "How well the student is doing overall"
}

Be constructive and educational. Return ONLY valid JSON.`;

      const historyContext = questionHistory?.map((h, i) => 
        `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`
      ).join("\n\n") || "";

      userMessage = `Previous exchanges:\n${historyContext}\n\nLatest question: ${questionHistory?.[questionHistory.length - 1]?.question || ""}\nStudent's answer: ${answer}`;
    }

    const result = await chatWithTier(
      model,
      systemPrompt,
      userMessage,
      session.user.id
    );

    let response;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        response = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      response = {
        question: result,
        questionType: "general",
        expectedPoints: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "viva-simulator");

    return NextResponse.json({
      ...response,
      isFirstQuestion,
      topic,
      difficulty,
    });
  } catch (error) {
    console.error("Viva error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process viva" }, { status: 500 });
  }
}
