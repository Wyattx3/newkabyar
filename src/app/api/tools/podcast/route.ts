import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const podcastSchema = z.object({
  content: z.string().min(200, "Content must be at least 200 characters"),
  duration: z.enum(["short", "medium", "long"]).default("medium"),
  style: z.enum(["educational", "casual", "interview"]).default("educational"),
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
    const validatedData = podcastSchema.parse(body);

    const creditsNeeded = 8;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { content, duration, style, model, language } = validatedData;

    const durationGuide = {
      short: "5-7 minute podcast, approximately 600-800 words of dialogue",
      medium: "10-12 minute podcast, approximately 1200-1500 words of dialogue",
      long: "15-20 minute podcast, approximately 2000-2500 words of dialogue",
    };

    const styleGuide = {
      educational: "Two educators discussing the topic in depth, explaining concepts clearly",
      casual: "Two friends having a relaxed conversation about the topic",
      interview: "One host interviewing an expert on the topic",
    };

    const languageInstructions = language !== "en" 
      ? `Generate the script in ${language} language.` 
      : "";

    const systemPrompt = `You are a podcast script writer. Create an engaging two-person dialogue podcast script.

Duration: ${duration} - ${durationGuide[duration]}
Style: ${style} - ${styleGuide[style]}
${languageInstructions}

Your response MUST be valid JSON:
{
  "title": "Podcast episode title",
  "summary": "Brief episode summary",
  "speakers": {
    "host": {"name": "Alex", "role": "Host"},
    "guest": {"name": "Jordan", "role": "Expert/Co-host"}
  },
  "segments": [
    {
      "title": "Introduction",
      "dialogue": [
        {"speaker": "host", "text": "Welcome to..."},
        {"speaker": "guest", "text": "Thanks for having me..."}
      ]
    },
    {
      "title": "Main Topic 1",
      "dialogue": [
        {"speaker": "host", "text": "Let's dive into..."},
        {"speaker": "guest", "text": "Great point..."}
      ]
    }
  ],
  "keyTopics": ["Topic 1", "Topic 2"],
  "duration": "10 minutes"
}

Guidelines:
- Natural conversational flow
- Include questions and reactions
- Add examples and analogies
- Balance between speakers
- Include an intro and conclusion
- Make it engaging and educational

Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Create a podcast script from this content:\n\n${content.slice(0, 8000)}`,
      session.user.id
    );

    let script;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      script = {
        title: "Podcast Script",
        summary: "Generated podcast",
        speakers: { host: { name: "Alex" }, guest: { name: "Jordan" } },
        segments: [{ title: "Content", dialogue: [{ speaker: "host", text: result }] }],
        keyTopics: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "pdf-to-podcast");

    return NextResponse.json(script);
  } catch (error) {
    console.error("Podcast error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate podcast" }, { status: 500 });
  }
}
