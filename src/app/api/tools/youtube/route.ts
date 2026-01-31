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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:POST_ENTRY',message:'YouTube API called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    const session = await auth();
    if (!session?.user?.id) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:AUTH_FAIL',message:'Unauthorized',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = youtubeSchema.parse(body);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:VALIDATED',message:'Request validated',data:{url:validatedData.url.slice(0,50),summaryType:validatedData.summaryType},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:NO_CREDITS',message:'Insufficient credits',data:{remaining:creditCheck.remaining},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { url, summaryType, model, language } = validatedData;

    // Get YouTube transcript
    let video;
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:TRANSCRIPT_START',message:'Fetching transcript',data:{url:url.slice(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      video = await getTranscript(url);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:TRANSCRIPT_SUCCESS',message:'Transcript fetched',data:{videoId:video.videoId,textLength:video.fullText?.length||0,method:video.transcriptionMethod||'youtube-captions'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:TRANSCRIPT_FAIL',message:'Transcript fetch failed',data:{error:String(error).slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      // Pass through the specific error message
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:AI_CALL_START',message:'Calling AI model',data:{model,transcriptLength:video.fullText?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    const result = await chatWithTier(
      model,
      systemPrompt,
      `Summarize this video transcript:\n\n${video.fullText.slice(0, 15000)}`, // Limit transcript length
      session.user.id
    );

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:AI_CALL_SUCCESS',message:'AI response received',data:{responseLength:result?.length||0,responsePreview:result?.slice(0,100)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    // Parse the response
    let summary;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:PARSE_SUCCESS',message:'JSON parsed successfully',data:{hasTitle:!!summary.title,hasKeyMoments:!!summary.keyMoments},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
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
    } catch (parseError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:PARSE_FAIL',message:'JSON parse failed',data:{error:String(parseError).slice(0,100)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      console.error("Parse error:", parseError);
      summary = {
        title: "Video Summary",
        summary: result,
        keyMoments: [],
        topics: [],
        takeaways: [],
      };
    }

    await deductCredits(session.user.id, creditsNeeded, "youtube-summarizer");

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:SUCCESS',message:'Summary complete',data:{videoId:video.videoId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      videoId: video.videoId,
      transcriptionMethod: video.transcriptionMethod || 'youtube-captions',
      ...summary,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube/route.ts:CATCH_ERROR',message:'Unhandled error',data:{error:String(error).slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    console.error("YouTube summarizer error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to summarize video" }, { status: 500 });
  }
}
