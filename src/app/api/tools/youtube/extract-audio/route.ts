import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkToolCredits, deductCredits } from "@/lib/credits";

const extractSchema = z.object({
  videoId: z.string().min(1),
});

// Brightdata Proxy Configuration
const BRIGHTDATA_PROXY = {
  host: 'brd.superproxy.io',
  port: 33335,
  username: 'brd-customer-hl_7f0bd2c4-zone-isp_proxy2',
  password: '1euiogb3kje9',
};

// Create proxy fetch function
async function createProxyFetch() {
  try {
    const { ProxyAgent, fetch: undiciFetch } = await import('undici');
    const proxyUrl = `http://${BRIGHTDATA_PROXY.username}:${BRIGHTDATA_PROXY.password}@${BRIGHTDATA_PROXY.host}:${BRIGHTDATA_PROXY.port}`;
    const proxyAgent = new ProxyAgent(proxyUrl);
    
    return (input: RequestInfo | URL, init?: RequestInit) => {
      return undiciFetch(input as any, {
        ...init as any,
        dispatcher: proxyAgent,
      }) as unknown as Promise<Response>;
    };
  } catch {
    return fetch;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoId: rawVideoId } = extractSchema.parse(body);
    
    // Clean video ID - remove any query parameters
    const videoId = rawVideoId.split('?')[0].split('&')[0];

    const creditsNeeded = 5;
    const creditCheck = await checkToolCredits(session.user.id, creditsNeeded);
    if (!creditCheck.hasCredits) {
      return NextResponse.json(
        { error: "Insufficient credits", creditsNeeded, creditsRemaining: creditCheck.remaining },
        { status: 402 }
      );
    }

    const { Innertube } = await import('youtubei.js');
    
    const proxyFetch = await createProxyFetch();
    const youtube = await Innertube.create({
      fetch: proxyFetch as any,
    });

    // Download audio stream
    const stream = await youtube.download(videoId, {
      type: 'audio',
      quality: 'bestefficiency',
      format: 'mp4',
    });

    // Collect chunks using reader
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: "Could not extract audio" }, { status: 400 });
    }

    if (audioBuffer.length > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio too large" }, { status: 400 });
    }

    await deductCredits(session.user.id, creditsNeeded, "youtube-extract-audio");

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mp4",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Content-Disposition": `attachment; filename="youtube-audio-${videoId}.m4a"`,
      },
    });
  } catch (error) {
    console.error("Audio extraction error:", error);
    const errMsg = String(error);
    if (errMsg.includes('login') || errMsg.includes('Sign in')) {
      return NextResponse.json({ error: "Video requires login" }, { status: 400 });
    }
    if (errMsg.includes('private')) {
      return NextResponse.json({ error: "Video is private" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to extract audio" }, { status: 500 });
  }
}
