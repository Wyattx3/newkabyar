// YouTube Integration
// Extract transcripts from YouTube videos using Supadata API

// Supadata API Configuration (supports YouTube, TikTok, Instagram, Facebook, X)
const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY || '';
const SUPADATA_BASE_URL = 'https://api.supadata.ai/v1';

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface YouTubeVideo {
  videoId: string;
  title?: string;
  transcript: TranscriptSegment[];
  fullText: string;
  transcriptionMethod?: 'youtube-captions' | 'whisper-ai';
}

// Extract video ID from various YouTube URL formats
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Fetch transcript using Supadata API (fastest & most reliable)
async function fetchTranscriptFromSupadata(videoId: string): Promise<{ transcript: TranscriptSegment[], fullText: string } | null> {
  try {
    const url = `${SUPADATA_BASE_URL}/youtube/transcript?videoId=${videoId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': SUPADATA_API_KEY,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    let fullText = '';
    let segments: any[] = [];

    // Handle content field - can be string or array
    if (data.content) {
      if (typeof data.content === 'string') {
        fullText = data.content;
      } else if (Array.isArray(data.content)) {
        segments = data.content;
        fullText = segments.map((s: any) => s.text || s.content || (typeof s === 'string' ? s : '')).join(' ');
      }
    }
    
    if (data.transcript && Array.isArray(data.transcript)) {
      segments = data.transcript;
      if (!fullText) {
        fullText = segments.map((s: any) => s.text || s.content || '').join(' ');
      }
    }

    if (typeof fullText !== 'string') {
      fullText = String(fullText || '');
    }

    if (!fullText.trim()) {
      return null;
    }

    const transcript: TranscriptSegment[] = segments.length > 0 
      ? segments.map((seg: any) => ({
          text: seg.text || seg.content || '',
          start: parseFloat(seg.start || seg.offset || 0),
          duration: parseFloat(seg.duration || seg.dur || 0),
        }))
      : [{ text: fullText, start: 0, duration: 0 }];

    return { transcript, fullText };
  } catch {
    return null;
  }
}

// Brightdata Proxy Configuration
const BRIGHTDATA_PROXY = {
  host: 'brd.superproxy.io',
  port: 33335,
  username: 'brd-customer-hl_7f0bd2c4-zone-isp_proxy2',
  password: '1euiogb3kje9',
};

// Create proxy fetch function using undici
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

// Download YouTube audio and transcribe with Groq Whisper
async function transcribeWithWhisper(videoId: string): Promise<YouTubeVideo> {
  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY not configured for audio transcription');
  }

  const { Innertube } = await import('youtubei.js');
  const proxyFetch = await createProxyFetch();
  
  const youtube = await Innertube.create({
    fetch: proxyFetch as any,
  });

  const videoInfo = await youtube.getInfo(videoId);
  const title = videoInfo.basic_info.title || 'YouTube Video';
  const duration = videoInfo.basic_info.duration || 0;

  if (duration > 1800) {
    throw new Error('Video is too long for audio transcription. Maximum 30 minutes supported.');
  }

  const stream = await youtube.download(videoId, { 
    type: 'audio', 
    quality: 'bestefficiency',
    format: 'mp4'
  });
  
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  const audioBuffer = Buffer.concat(chunks);

  if (audioBuffer.length > 25 * 1024 * 1024) {
    throw new Error('Audio file too large. Try a shorter video (under 15 minutes).');
  }

  if (audioBuffer.length === 0) {
    throw new Error('No audio data received from video.');
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/mp4' });
  formData.append('file', blob, 'audio.m4a');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'verbose_json');

  const whisperResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
    },
    body: formData,
  });

  if (!whisperResponse.ok) {
    throw new Error(`Whisper transcription failed: ${whisperResponse.status}`);
  }

  const whisperResult = await whisperResponse.json();

  const transcript: TranscriptSegment[] = (whisperResult.segments || []).map((seg: { text: string; start: number; end: number }) => ({
    text: seg.text,
    start: seg.start,
    duration: seg.end - seg.start,
  }));

  return {
    videoId,
    title,
    transcript,
    fullText: whisperResult.text || transcript.map(t => t.text).join(' '),
    transcriptionMethod: 'whisper-ai',
  };
}

// Get transcript for a YouTube video - Fast methods first, then fallbacks
export async function getTranscript(videoIdOrUrl: string, useWhisperFallback: boolean = true): Promise<YouTubeVideo> {
  const videoId = videoIdOrUrl.includes('youtube') || videoIdOrUrl.includes('youtu.be')
    ? extractVideoId(videoIdOrUrl)
    : videoIdOrUrl;
    
  if (!videoId) {
    throw new Error('Invalid YouTube URL or video ID');
  }

  // METHOD 1: Supadata API (fastest & works with disabled captions)
  const supadataResult = await fetchTranscriptFromSupadata(videoId);
  if (supadataResult) {
    return {
      videoId,
      transcript: supadataResult.transcript,
      fullText: supadataResult.fullText,
      transcriptionMethod: 'youtube-captions',
    };
  }

  // METHOD 2: Try youtube-transcript package (backup)
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcriptItems && transcriptItems.length > 0) {
      const transcript: TranscriptSegment[] = transcriptItems.map(item => ({
        text: item.text,
        start: item.offset / 1000,
        duration: item.duration / 1000,
      }));
      
      const fullText = transcript.map(t => t.text).join(' ');
      
      if (fullText.trim()) {
        return {
          videoId,
          transcript,
          fullText,
          transcriptionMethod: 'youtube-captions',
        };
      }
    }
  } catch {
    // Continue to next method
  }

  // METHOD 3: Innertube with proxy (for bot-detected scenarios)
  try {
    const { Innertube } = await import('youtubei.js');
    const proxyFetch = await createProxyFetch();
    
    const youtube = await Innertube.create({
      fetch: proxyFetch as any,
    });
    
    const videoInfo = await youtube.getInfo(videoId);
    const transcriptInfo = await videoInfo.getTranscript();
    
    if (transcriptInfo?.transcript?.content?.body?.initial_segments?.length > 0) {
      const segments = transcriptInfo.transcript.content.body.initial_segments;
      const transcript: TranscriptSegment[] = segments.map((seg: any) => ({
        text: seg.snippet?.text || '',
        start: parseFloat(seg.start_ms || '0') / 1000,
        duration: (parseFloat(seg.end_ms || '0') - parseFloat(seg.start_ms || '0')) / 1000,
      }));
      
      const fullText = transcript.map(t => t.text).join(' ');
      
      if (fullText.trim()) {
        return {
          videoId,
          title: videoInfo.basic_info.title,
          transcript,
          fullText,
          transcriptionMethod: 'youtube-captions',
        };
      }
    }
  } catch {
    // Continue to Whisper fallback
  }

  // METHOD 4: Whisper AI fallback (for videos without captions)
  if (useWhisperFallback) {
    try {
      return await transcribeWithWhisper(videoId);
    } catch (whisperError) {
      const errMsg = String(whisperError);
      if (errMsg.includes('too long')) {
        throw new Error('Video is too long for transcription (max 30 minutes)');
      }
      if (errMsg.includes('private') || errMsg.includes('unavailable')) {
        throw new Error('This video is private or unavailable');
      }
      if (errMsg.includes('login') || errMsg.includes('Sign in')) {
        throw new Error('This video requires login to access');
      }
    }
  }

  throw new Error('Could not get transcript. Please try a different video.');
}

// Format timestamp for display (e.g., 1:23:45 or 12:34)
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get YouTube timestamp link
export function getTimestampLink(videoId: string, seconds: number): string {
  return `https://youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`;
}

// Group transcript by time intervals (for key moments)
export function groupByInterval(
  transcript: TranscriptSegment[],
  intervalSeconds: number = 60
): Array<{
  startTime: number;
  endTime: number;
  text: string;
}> {
  const groups: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }> = [];
  
  let currentGroup = {
    startTime: 0,
    endTime: intervalSeconds,
    text: '',
  };
  
  for (const segment of transcript) {
    if (segment.start >= currentGroup.endTime) {
      if (currentGroup.text) {
        groups.push({ ...currentGroup });
      }
      currentGroup = {
        startTime: Math.floor(segment.start / intervalSeconds) * intervalSeconds,
        endTime: Math.floor(segment.start / intervalSeconds) * intervalSeconds + intervalSeconds,
        text: segment.text,
      };
    } else {
      currentGroup.text += ' ' + segment.text;
    }
  }
  
  if (currentGroup.text) {
    groups.push(currentGroup);
  }
  
  return groups;
}
