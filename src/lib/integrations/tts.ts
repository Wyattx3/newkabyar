// Text-to-Speech Integration
// For PDF to Podcast and other audio features

export interface TTSOptions {
  voice?: string;
  speed?: number;  // 0.5 to 2.0
  pitch?: number;  // 0.5 to 2.0
}

export interface AudioResult {
  audioData: ArrayBuffer;
  format: string;
  duration?: number;
}

// OpenAI TTS API
export async function textToSpeechOpenAI(
  text: string,
  options: TTSOptions = {}
): Promise<AudioResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for TTS');
  }
  
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: options.voice || 'alloy',
      speed: options.speed || 1.0,
      response_format: 'mp3',
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI TTS failed: ${response.statusText}`);
  }
  
  const audioData = await response.arrayBuffer();
  
  return {
    audioData,
    format: 'mp3',
  };
}

// Available OpenAI voices
export const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm, conversational' },
  { id: 'fable', name: 'Fable', description: 'British, narrative' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly, youthful' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear, expressive' },
] as const;

// Generate podcast-style dialogue
export interface DialogueTurn {
  speaker: 'host' | 'guest';
  text: string;
}

export async function generatePodcastAudio(
  dialogue: DialogueTurn[],
  hostVoice: string = 'alloy',
  guestVoice: string = 'nova'
): Promise<AudioResult[]> {
  const results: AudioResult[] = [];
  
  for (const turn of dialogue) {
    const voice = turn.speaker === 'host' ? hostVoice : guestVoice;
    const audio = await textToSpeechOpenAI(turn.text, { voice });
    results.push(audio);
  }
  
  return results;
}

// Speech-to-Text with OpenAI Whisper
export async function speechToText(
  audioData: ArrayBuffer,
  language?: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for transcription');
  }
  
  const formData = new FormData();
  formData.append('file', new Blob([audioData]), 'audio.mp3');
  formData.append('model', 'whisper-1');
  if (language) {
    formData.append('language', language);
  }
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Whisper transcription failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.text;
}

// Transcribe with timestamps
export async function speechToTextWithTimestamps(
  audioData: ArrayBuffer,
  language?: string
): Promise<Array<{ text: string; start: number; end: number }>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for transcription');
  }
  
  const formData = new FormData();
  formData.append('file', new Blob([audioData]), 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  if (language) {
    formData.append('language', language);
  }
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Whisper transcription failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return (data.segments || []).map((segment: any) => ({
    text: segment.text,
    start: segment.start,
    end: segment.end,
  }));
}
