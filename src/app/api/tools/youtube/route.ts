import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";
import { getTranscript, formatTimestamp, getTimestampLink } from "@/lib/integrations/youtube";

const youtubeSchema = z.object({
  url: z.string().url("Invalid URL"),
  summaryType: z.enum(["brief", "detailed", "keypoints"]).default("detailed"),
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
    const validatedData = youtubeSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { url, summaryType, model, language } = validatedData;

    // Get YouTube transcript
    let video;
    try {
      video = await getTranscript(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not fetch transcript. The video may not have captions available.";
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const summaryGuide = {
      brief: "Create a 2-3 paragraph summary covering the main points",
      detailed: "Create a comprehensive summary with sections for main topics discussed",
      keypoints: "Extract and list the key points and takeaways as bullet points",
    };

    const languageInstructions = language !== "en" 
      ? `Generate the summary in ${language} language.` 
      : "";

    const systemPrompt = `You are an expert at summarizing video content. Analyze the transcript and create a useful summary.

Summary Type: ${summaryType} - ${summaryGuide[summaryType]}
${languageInstructions}

Your output MUST be valid JSON with this structure:
{
  "title": "Inferred video title based on content",
  "duration": "Estimated duration from transcript",
  "summary": "The main summary text (use markdown formatting)",
  "keyMoments": [
    {
      "time": "timestamp in seconds (number)",
      "title": "Key moment title",
      "description": "Brief description"
    }
  ],
  "topics": ["topic1", "topic2", "topic3"],
  "takeaways": ["Key takeaway 1", "Key takeaway 2"]
}

Return ONLY valid JSON.`;

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Summarize this video transcript:\n\n${video.fullText.slice(0, 15000)}`,
      session.user.id
    );

    // Parse the response with robust JSON handling
    let summary;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        // Fix unescaped newlines and tabs
        jsonStr = jsonStr.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
        try {
          summary = JSON.parse(jsonStr);
        } catch {
          // More aggressive cleanup
          jsonStr = jsonMatch[0]
            .replace(/[\x00-\x1F\x7F]/g, ' ')
            .replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
          summary = JSON.parse(jsonStr);
        }
        // Add timestamp links
        if (summary.keyMoments) {
          summary.keyMoments = summary.keyMoments.map((moment: any) => ({
            ...moment,
            link: getTimestampLink(video.videoId, Number(moment.time)),
            formattedTime: formatTimestamp(Number(moment.time)),
          }));
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch {
      // Fallback: extract what we can
      const titleMatch = result.match(/"title"\s*:\s*"([^"]+)"/);
      const summaryMatch = result.match(/"summary"\s*:\s*"([\s\S]*?)(?:"|$)/);
      summary = {
        title: titleMatch ? titleMatch[1] : "Video Summary",
        summary: summaryMatch ? summaryMatch[1].replace(/\\n/g, '\n') : result.replace(/```json|```/g, '').trim(),
        keyMoments: [],
        topics: [],
        takeaways: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "youtube-summarizer");

    return NextResponse.json({
      videoId: video.videoId,
      transcriptionMethod: video.transcriptionMethod || 'youtube-captions',
      ...summary,
    });
  } catch (error) {
    console.error("YouTube summarizer error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to summarize video" }, { status: 500 });
  }
}
