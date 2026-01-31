// YouTube Integration
// Extract transcripts from YouTube videos

// Note: Install youtube-transcript package
// npm install youtube-transcript
// npm install ytdl-core (for audio download fallback)

export interface TranscriptSegment {
  text: string;
  start: number;  // Start time in seconds
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

// Download YouTube audio using youtubei.js and transcribe with Groq Whisper
async function transcribeWithWhisper(videoId: string): Promise<YouTubeVideo> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:START',message:'Starting Whisper transcription via youtubei.js',data:{videoId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  const groqApiKey = process.env.GROQ_API_KEY;
  
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY not configured for audio transcription');
  }

  // Import youtubei.js
  const { Innertube } = await import('youtubei.js');
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:INNERTUBE_INIT',message:'Initializing Innertube',data:{videoId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  let youtube;
  try {
    youtube = await Innertube.create();
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:INNERTUBE_FAIL',message:'Failed to create Innertube',data:{error:String(err).slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    throw new Error('Could not initialize YouTube client.');
  }

  // Get full video info (includes deciphered stream URLs)
  let videoInfo;
  try {
    videoInfo = await youtube.getInfo(videoId);
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:VIDEO_INFO_FAIL',message:'Failed to get video info',data:{error:String(err).slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    throw new Error('Could not access video. It may be private or unavailable.');
  }

  const title = videoInfo.basic_info.title || 'YouTube Video';
  const duration = videoInfo.basic_info.duration || 0;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:VIDEO_INFO_SUCCESS',message:'Got video info',data:{title:title?.slice(0,50),duration},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // Limit to 30 minutes for Whisper API (25MB limit)
  if (duration > 1800) {
    throw new Error('Video is too long for audio transcription. Maximum 30 minutes supported.');
  }

  // Download audio using youtube.download (Innertube instance handles deciphering)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:DOWNLOADING',message:'Starting audio download via Innertube',data:{title:title?.slice(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  let audioBuffer: Buffer;
  try {
    // Use youtube.download directly from Innertube instance
    const stream = await youtube.download(videoId, { 
      type: 'audio', 
      quality: 'bestefficiency',
      format: 'mp4'
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:STREAM_STARTED',message:'Stream started',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    // Collect chunks from stream
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    audioBuffer = Buffer.concat(chunks);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:DOWNLOAD_COMPLETE',message:'Audio downloaded',data:{sizeKB:Math.round(audioBuffer.length/1024)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{})
    // #endregion

  } catch (err) {
    const errorStr = String(err);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:DOWNLOAD_FAIL',message:'Failed to download audio',data:{error:errorStr.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    // Provide specific error messages
    if (errorStr.includes('login required') || errorStr.includes('Sign in')) {
      throw new Error('This video requires YouTube login to access. Please try a different video that is publicly available.');
    } else if (errorStr.includes('age') || errorStr.includes('Age')) {
      throw new Error('This video is age-restricted. Please try a different video.');
    } else if (errorStr.includes('private')) {
      throw new Error('This video is private. Please try a public video.');
    }
    throw new Error('Could not download audio from video. Please try a different video.');
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:AUDIO_READY',message:'Audio downloaded, sending to Whisper',data:{sizeKB:Math.round(audioBuffer.length/1024)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // Check size limit (25MB for free tier)
  if (audioBuffer.length > 25 * 1024 * 1024) {
    throw new Error('Audio file too large. Try a shorter video (under 15 minutes).');
  }

  if (audioBuffer.length === 0) {
    throw new Error('No audio data received from video.');
  }

  // Create FormData for Whisper API
  const formData = new FormData();
  const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/mp4' });
  formData.append('file', blob, 'audio.m4a');
  formData.append('model', 'whisper-large-v3');
  formData.append('response_format', 'verbose_json');

  // Call Groq Whisper API
  const whisperResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
    },
    body: formData,
  });

  if (!whisperResponse.ok) {
    const errorText = await whisperResponse.text();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:WHISPER_FAIL',message:'Whisper API failed',data:{status:whisperResponse.status,error:errorText.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    throw new Error(`Whisper transcription failed: ${whisperResponse.status}`);
  }

  const whisperResult = await whisperResponse.json();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:transcribeWithWhisper:SUCCESS',message:'Whisper transcription complete',data:{textLength:whisperResult.text?.length||0,segmentCount:whisperResult.segments?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // Convert Whisper segments to our format
  const transcript: TranscriptSegment[] = (whisperResult.segments || []).map((seg: { text: string; start: number; end: number }) => ({
    text: seg.text,
    start: seg.start,
    duration: seg.end - seg.start,
  }));

  return {
    videoId,
    title: 'YouTube Video', // Cobalt doesn't give us the title
    transcript,
    fullText: whisperResult.text || transcript.map(t => t.text).join(' '),
    transcriptionMethod: 'whisper-ai',
  };
}

// Get transcript for a YouTube video (with Whisper fallback for videos without captions)
export async function getTranscript(videoIdOrUrl: string, useWhisperFallback: boolean = true): Promise<YouTubeVideo> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:getTranscript:ENTRY',message:'getTranscript called',data:{videoIdOrUrl:videoIdOrUrl.slice(0,60),useWhisperFallback},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // Extract video ID if URL provided
  const videoId = videoIdOrUrl.includes('youtube') || videoIdOrUrl.includes('youtu.be')
    ? extractVideoId(videoIdOrUrl)
    : videoIdOrUrl;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:getTranscript:VIDEO_ID',message:'Video ID extracted',data:{videoId,originalUrl:videoIdOrUrl.slice(0,60)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
    
  if (!videoId) {
    throw new Error('Invalid YouTube URL or video ID');
  }
  
  // Try YouTube captions first (fast and free)
  try {
    // Dynamic import to avoid bundling issues
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:getTranscript:CALLING_API',message:'Calling YoutubeTranscript.fetchTranscript',data:{videoId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:getTranscript:API_SUCCESS',message:'Transcript fetched successfully',data:{itemCount:transcriptItems?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    // Check if transcript is empty
    if (!transcriptItems || transcriptItems.length === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:getTranscript:EMPTY_TRANSCRIPT',message:'Transcript is empty',data:{useWhisperFallback},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      // Note: Whisper fallback temporarily disabled due to YouTube API restrictions
      // Most YouTube videos have auto-generated captions, so this affects few videos
      throw new Error('This video has no captions available. Please try a video with captions enabled (most videos have auto-generated captions).');
    }
    
    const transcript: TranscriptSegment[] = transcriptItems.map(item => ({
      text: item.text,
      start: item.offset / 1000, // Convert to seconds
      duration: item.duration / 1000,
    }));
    
    const fullText = transcript.map(t => t.text).join(' ');
    
    // Double-check fullText is not empty
    if (!fullText.trim()) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:getTranscript:EMPTY_TEXT',message:'Transcript text is empty, trying Whisper fallback',data:{useWhisperFallback},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      if (useWhisperFallback) {
        return await transcribeWithWhisper(videoId);
      }
      throw new Error('Video transcript is empty. Please try a different video.');
    }
    
    return {
      videoId,
      transcript,
      fullText,
      transcriptionMethod: 'youtube-captions',
    };
  } catch (captionError) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/094d5be5-28f2-4361-897e-ed72c06b5dc1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'youtube.ts:getTranscript:CAPTION_FAIL',message:'YouTube captions failed',data:{error:String(captionError).slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    // Provide specific error messages based on the error
    const errorMessage = String(captionError);
    if (errorMessage.includes('disabled')) {
      throw new Error('Captions are disabled on this video. Please try a video with captions enabled.');
    } else if (errorMessage.includes('not available')) {
      throw new Error('No captions available for this video. Please try a different video.');
    } else if (errorMessage.includes('private') || errorMessage.includes('unavailable')) {
      throw new Error('This video is private or unavailable.');
    }
    
    throw new Error('Could not fetch captions. Please try a video with captions enabled.');
  }
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
