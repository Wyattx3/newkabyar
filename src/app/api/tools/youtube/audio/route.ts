import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const audioSchema = z.object({
  text: z.string().min(1).max(10000),
  voice: z.enum(["autumn", "diana", "hannah", "austin", "daniel", "troy"]).default("hannah"),
  style: z.enum(["summary", "teacher"]).default("teacher"),
});

// Remove markdown and special characters for clean speech
function cleanTextForSpeech(text: string): string {
  return text
    // Remove markdown headers
    .replace(/#{1,6}\s*/g, '')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove bullet points
    .replace(/^[\s]*[-*•]\s*/gm, '')
    // Remove numbered lists formatting
    .replace(/^\d+\.\s*/gm, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text, voice, style } = audioSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 500 });
    }

    // Clean the original text
    const cleanedText = cleanTextForSpeech(text);

    let speechText = cleanedText;

    // For teacher style, rephrase the content to be more conversational
    if (style === "teacher") {
      try {
        const rephrasePrompt = `You are a friendly teacher explaining a video to a student. 
        
Rephrase this summary in a natural, conversational way as if you're explaining it to someone in person:
- Use simple, clear language
- Add natural transitions like "So basically...", "The main point is...", "What's interesting is..."
- Make it sound like natural speech, not reading from a document
- Keep it concise but informative
- Do NOT include any markdown, bullet points, or special characters
- Do NOT read out loud things like "hashtag", "asterisk", "pound sign"
- Just speak naturally as a teacher would

Original summary:
${cleanedText.slice(0, 2000)}

Respond with ONLY the rephrased explanation, nothing else.`;

        const rephrasedContent = await chatWithTier(
          "fast",
          "You are a helpful teacher who explains things clearly and naturally.",
          rephrasePrompt,
          session.user.id
        );

        speechText = cleanTextForSpeech(rephrasedContent);
      } catch {
        // If rephrasing fails, use cleaned original text
        speechText = cleanedText;
      }
    }

    const requestBody = {
      model: "canopylabs/orpheus-v1-english",
      input: speechText.slice(0, 4000),
      voice: voice,
      response_format: "wav",
    };

    const ttsResponse = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("Groq TTS error:", ttsResponse.status, errorText);
      return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
    }

    await deductCredits(session.user.id, creditsNeeded, "youtube-audio");
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Content-Disposition": `attachment; filename="summary-audio.wav"`,
      },
    });
  } catch (error) {
    console.error("Audio generation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
  }
}
