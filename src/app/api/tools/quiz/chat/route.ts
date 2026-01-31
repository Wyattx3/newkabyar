import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { chatWithTier } from "@/lib/ai-providers";

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })),
  model: z.string().default("fast"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messages, model } = chatSchema.parse(body);

    // Use chatWithTier for non-streaming response
    const response = await chatWithTier(
      model,
      messages[0]?.content || "You are a helpful tutor.",
      messages.slice(1).map(m => m.content).join("\n\n"),
      session.user.id
    );

    return NextResponse.json({ content: response });
  } catch (error) {
    console.error("Quiz chat error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
