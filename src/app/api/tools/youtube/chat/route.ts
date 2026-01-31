import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const chatSchema = z.object({
  question: z.string().min(1),
  context: z.string(),
  title: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question, context, title, history } = chatSchema.parse(body);

    const creditsNeeded = 1;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const historyText = history?.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') || '';

    const systemPrompt = `You are a helpful AI assistant that answers questions about a YouTube video.

Video Title: ${title || 'Unknown'}
Video Summary: ${context.slice(0, 3000)}

${historyText ? `Previous conversation:\n${historyText}\n` : ''}

Answer the user's question based on the video content. Be concise and helpful. If the question is not related to the video, politely redirect to the video topic.`;

    const result = await chatWithTier(
      "fast",
      systemPrompt,
      question,
      session.user.id
    );

    await deductCredits(session.user.id, creditsNeeded, "youtube-chat");

    return NextResponse.json({
      answer: result.trim(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 });
  }
}
