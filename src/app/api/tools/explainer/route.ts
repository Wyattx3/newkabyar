import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";
import { chatWithTier } from "@/lib/ai-providers";

const explainerSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters"),
  style: z.enum(["educational", "quick-overview", "deep-dive"]).default("educational"),
  model: z.string().default("fast"),
  language: z.string().default("en"),
});

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  return text;
}

// Dynamic duration based on narration character count (Orpheus speaks ~14 chars/sec)
function calculateDuration(narration: string, contentCount: number, type: string): number {
  const charCount = narration.length;
  // Orpheus TTS speaks at roughly 14 chars/second → at 30fps that's ~2.14 frames/char
  // Add 25% buffer to ensure audio finishes before scene ends
  const narrationFrames = Math.ceil(charCount * 2.2 * 1.25);
  // Visual content needs time for staggered animation (each item ~20 frames apart)
  const contentFrames = contentCount * 22;
  const baseFrames = type === "title" ? 120 : 90;
  const totalFrames = Math.max(baseFrames, narrationFrames, contentFrames + 50);
  // Allow longer scenes (up to 15s) so audio doesn't get cut off
  return Math.max(120, Math.min(450, totalFrames));
}

const sceneDataSchema = z.object({
  title: z.string(),
  scenes: z.array(
    z.object({
      type: z.enum(["title", "bullets", "comparison", "timeline", "summary"]),
      title: z.string(),
      content: z.array(z.string()),
      narration: z.string(),
      imageKeyword: z.string().optional(),
    })
  ),
});

// Fetch topic images from Tavily
async function fetchTopicImages(topic: string, keywords: string[]): Promise<Map<string, string>> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return new Map();

  const imageMap = new Map<string, string>();

  try {
    // Search with specific keywords for each scene
    const queries = [topic, ...keywords.slice(0, 3)];
    const uniqueQueries = [...new Set(queries)];

    const results = await Promise.all(
      uniqueQueries.map(async (q) => {
        try {
          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: apiKey,
              query: `${q} photo illustration`,
              include_images: true,
              search_depth: "basic",
              max_results: 2,
            }),
          });
          if (!res.ok) return { query: q, images: [] };
          const data = await res.json();
          return { query: q, images: (data.images || []).slice(0, 2) };
        } catch {
          return { query: q, images: [] };
        }
      })
    );

    // Map keywords to images
    for (const r of results) {
      if (r.images.length > 0) {
        imageMap.set(r.query, r.images[0]);
      }
    }
  } catch (error) {
    console.error("[Explainer] Image fetch failed:", error);
  }

  return imageMap;
}

// Generate TTS audio via Groq Orpheus model
// Orpheus has a 200 character limit per call, so we chunk long text
async function generateSpeechChunk(text: string, apiKey: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "canopylabs/orpheus-v1-english",
        input: text.slice(0, 200),
        voice: "troy",
        response_format: "wav",
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[TTS] Groq error:", response.status, errText);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("[TTS] Chunk failed:", error);
    return null;
  }
}

// Split narration into <=200 char chunks at sentence boundaries
function splitNarration(text: string): string[] {
  if (text.length <= 200) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= 200) {
      chunks.push(remaining);
      break;
    }
    // Find best split point (sentence end, comma, or space before 200)
    let splitAt = -1;
    for (let i = Math.min(199, remaining.length - 1); i >= 100; i--) {
      if (remaining[i] === '.' || remaining[i] === '!' || remaining[i] === '?') {
        splitAt = i + 1;
        break;
      }
    }
    if (splitAt === -1) {
      for (let i = Math.min(199, remaining.length - 1); i >= 100; i--) {
        if (remaining[i] === ',' || remaining[i] === ';') {
          splitAt = i + 1;
          break;
        }
      }
    }
    if (splitAt === -1) {
      for (let i = Math.min(199, remaining.length - 1); i >= 100; i--) {
        if (remaining[i] === ' ') {
          splitAt = i + 1;
          break;
        }
      }
    }
    if (splitAt === -1) splitAt = 200;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks;
}

// Concatenate WAV buffers (all same format from Groq)
function concatWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 1) return buffers[0];

  // WAV header is 44 bytes, data follows
  const dataChunks = buffers.map((buf) => {
    const view = new Uint8Array(buf);
    return view.slice(44); // skip header, get raw PCM data
  });

  const totalDataSize = dataChunks.reduce((s, c) => s + c.length, 0);

  // Use first buffer's header as template
  const header = new Uint8Array(buffers[0]).slice(0, 44);
  const result = new Uint8Array(44 + totalDataSize);
  result.set(header, 0);

  // Update file size in header (bytes 4-7): totalDataSize + 36
  const fileSize = totalDataSize + 36;
  result[4] = fileSize & 0xff;
  result[5] = (fileSize >> 8) & 0xff;
  result[6] = (fileSize >> 16) & 0xff;
  result[7] = (fileSize >> 24) & 0xff;

  // Update data chunk size (bytes 40-43)
  result[40] = totalDataSize & 0xff;
  result[41] = (totalDataSize >> 8) & 0xff;
  result[42] = (totalDataSize >> 16) & 0xff;
  result[43] = (totalDataSize >> 24) & 0xff;

  let offset = 44;
  for (const chunk of dataChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}

async function generateSpeech(text: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !text.trim()) return null;

  try {
    const chunks = splitNarration(text.trim());
    const audioBuffers: ArrayBuffer[] = [];

    // Generate each chunk sequentially (to maintain order)
    for (const chunk of chunks) {
      const buf = await generateSpeechChunk(chunk, apiKey);
      if (buf) audioBuffers.push(buf);
    }

    if (audioBuffers.length === 0) return null;

    const combined = concatWavBuffers(audioBuffers);
    const base64 = Buffer.from(combined).toString("base64");
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
    const validatedData = explainerSchema.parse(body);

    const creditsNeeded = 3;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { topic, style, model, language } = validatedData;

    const styleInstructions: Record<string, string> = {
      educational: "Create 5-6 scenes: title, 2-3 bullet/content, 1 comparison or timeline, summary. 3-5 points per scene.",
      "quick-overview": "Create 4-5 scenes: title, 1-2 bullet scenes with 2-3 points each, summary. Keep narration concise.",
      "deep-dive": "Create 6-8 scenes: title, multiple bullets, comparisons, timelines, detailed summary. 4-6 points per scene.",
    };

    const languageInstruction = language !== "en"
      ? `Write ALL text content and narration in ${language} language.`
      : "";

    const systemPrompt = `You are an expert video script writer. Generate structured scene data for animated explainer videos.

NARRATION RULES (CRITICAL — audio must match what's on screen):
- The "narration" is spoken aloud BY A NARRATOR while the viewer reads the scene's title and content bullets.
- The narration MUST DIRECTLY DESCRIBE and EXPLAIN the exact points shown in that scene's "content" array.
- For "title" scenes: introduce the topic using the title. Keep it under 120 characters.
- For "bullets" scenes: walk through each bullet point shown on screen, briefly explaining them in order.
- For "comparison" scenes: describe the two sides being compared and what the viewer sees.
- For "timeline" scenes: narrate through each step in the order they appear on screen.
- For "summary" scenes: recap the key takeaways shown in the content bullets.
- NEVER talk about things NOT visible on screen. The narration must feel like a voiceover for what's displayed.
- Keep each narration under 180 characters (TTS limit). Be concise but match the visual.

Also suggest an "imageKeyword" (1-2 word search term) for scenes where a relevant photo would help. Only add imageKeyword where a real photo would enhance understanding (not for abstract concepts).

Available scene types:
- "title": Opening. content = [subtitle]. narration = introduces the topic shown.
- "bullets": Key points. content = 3-5 bullet phrases. narration = explains each bullet shown.
- "comparison": Two-sided. content = 4-6 items (first half=A, second=B). narration = describes the comparison shown.
- "timeline": Process/sequence. content = 3-5 steps. narration = walks through the steps shown.
- "summary": Takeaways. content = 3-5 takeaways. narration = wraps up the points shown.

CRITICAL RULES:
- Start with "title", end with "summary"
- Each content string: max 12 words
- Each narration: max 180 characters, MUST match that scene's content
- Choose scene types that BEST FIT the topic — do NOT use all types every time
- Vary the scene types — avoid using "bullets" for every middle scene
- ${styleInstructions[style]}
${languageInstruction}

Return ONLY valid JSON:
{
  "title": "string",
  "scenes": [
    {
      "type": "title"|"bullets"|"comparison"|"timeline"|"summary",
      "title": "string",
      "content": ["string",...],
      "narration": "string (max 180 chars, must describe what's shown in this scene)",
      "imageKeyword": "optional string"
    }
  ]
}`;

    const userPrompt = `Create an animated explainer video about: "${topic}"`;
    const tier = model === "smart" ? "normal" : model === "pro" ? "pro-smart" : "fast";

    // Step 1: Generate scene data
    const result = await chatWithTier(tier, systemPrompt, userPrompt, session.user.id);

    const jsonStr = extractJSON(result);
    let rawData;
    try {
      rawData = JSON.parse(jsonStr);
    } catch {
      console.error("[Explainer] JSON parse failed:", result.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to generate video data. Please try again." },
        { status: 500 }
      );
    }

    const validated = sceneDataSchema.safeParse(rawData);
    if (!validated.success) {
      if (rawData.scenes && Array.isArray(rawData.scenes)) {
        rawData.scenes = rawData.scenes.map((s: Record<string, unknown>) => ({
          type: s.type || "bullets",
          title: s.title || "Untitled",
          content: Array.isArray(s.content) ? s.content.map(String) : [String(s.content || "")],
          narration: String(s.narration || s.title || ""),
          imageKeyword: s.imageKeyword ? String(s.imageKeyword) : undefined,
        }));
      } else {
        return NextResponse.json(
          { error: "Failed to generate valid video data. Please try again." },
          { status: 500 }
        );
      }
    } else {
      rawData = validated.data;
    }

    // Step 2: Fetch images + generate TTS audio in parallel
    const imageKeywords = rawData.scenes
      .filter((s: { imageKeyword?: string }) => s.imageKeyword)
      .map((s: { imageKeyword?: string }) => s.imageKeyword as string);

    // Ensure narrations stay within 200 char TTS limit for single-chunk generation
    const narrations = rawData.scenes.map((s: { narration?: string; title: string }) => {
      let text = (s.narration || s.title).trim();
      // Truncate at sentence boundary if over 195 chars
      if (text.length > 195) {
        const truncated = text.slice(0, 195);
        const lastSentence = truncated.lastIndexOf('.');
        const lastComma = truncated.lastIndexOf(',');
        const cutAt = lastSentence > 100 ? lastSentence + 1 : lastComma > 100 ? lastComma : 195;
        text = truncated.slice(0, cutAt).trim();
      }
      return text;
    });

    // Run image fetch and ALL TTS generation in parallel
    const [imageMap, ...audioResults] = await Promise.all([
      fetchTopicImages(topic, imageKeywords),
      ...narrations.map((n: string) => generateSpeech(n)),
    ]);

    const audioUrls = audioResults as (string | null)[];

    // Step 3: Build final scene data with dynamic durations, images, and scene indices
    const scenes = rawData.scenes.map((scene: {
      type: string;
      title: string;
      content: string[];
      narration?: string;
      imageKeyword?: string;
    }, index: number) => {
      // Use the same truncated narration that was sent to TTS
      const narration = narrations[index] || scene.title;
      const duration = calculateDuration(narration, scene.content.length, scene.type);

      // Find image for this scene
      let imageUrl: string | undefined;
      if (scene.imageKeyword && imageMap instanceof Map) {
        imageUrl = imageMap.get(scene.imageKeyword) || imageMap.get(topic);
      }

      return {
        type: scene.type,
        title: scene.title,
        content: scene.content,
        narration,
        imageUrl,
        durationInFrames: duration,
        sceneIndex: index,
      };
    });

    const totalDurationInFrames = scenes.reduce(
      (sum: number, s: { durationInFrames: number }) => sum + s.durationInFrames,
      0
    );

    await deductCredits(session.user.id, creditsNeeded, "video-explainer");

    return NextResponse.json({
      success: true,
      data: {
        title: rawData.title,
        scenes,
        totalDurationInFrames,
        audioUrls,
      },
    });
  } catch (error: unknown) {
    console.error("[Explainer] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
