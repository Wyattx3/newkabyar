import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";

const ttsSchema = z.object({
  narrations: z.array(z.string().min(1)).min(1).max(12),
});

async function generateSpeech(text: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "playai-tts",
        input: text,
        voice: "Fritz-PlayAI",
        response_format: "wav",
      }),
    });

    if (!response.ok) {
      console.error("[TTS] Groq TTS error:", response.status, await response.text().catch(() => ""));
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:audio/wav;base64,${base64}`;
  } catch (error) {
    console.error("[TTS] Failed:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { narrations } = ttsSchema.parse(body);

    // Generate all TTS in parallel (max 4 concurrent)
    const batchSize = 4;
    const audioUrls: (string | null)[] = [];

    for (let i = 0; i < narrations.length; i += batchSize) {
      const batch = narrations.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(generateSpeech));
      audioUrls.push(...results);
    }

    return NextResponse.json({
      success: true,
      audioUrls,
    });
  } catch (error: unknown) {
    console.error("[TTS] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
