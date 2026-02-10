"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Youtube, 
  Loader2, 
  Sparkles,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Play,
  ChevronRight,
  Lightbulb,
  Hash,
  FileText,
  Download,
  Languages,
  MessageCircle,
  Brain,
  BookOpen,
  Volume2,
  Send,
  X,
  RotateCcw,
  ChevronLeft,
  Pause,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
  Repeat,
  Music,
  Mic,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import Link from "next/link";
import mermaid from "mermaid";

interface KeyMoment {
  timestamp: string;
  formattedTime?: string;
  time?: number;
  title: string;
  description?: string;
  summary?: string;
  link: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Summary {
  title: string;
  duration: string;
  summary: string;
  mainSummary?: string;
  keyMoments: KeyMoment[];
  topics: string[];
  takeaways: string[];
  transcriptionMethod?: 'youtube-captions' | 'whisper-ai';
}

// Initialize mermaid with readable colors
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#ffffff',
      primaryTextColor: '#1f2937',
      primaryBorderColor: '#3b82f6',
      lineColor: '#3b82f6',
      secondaryColor: '#f0f9ff',
      tertiaryColor: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '14px',
      nodeBorder: '#3b82f6',
      mainBkg: '#ffffff',
      textColor: '#1f2937',
    },
    mindmap: {
      padding: 16,
      useMaxWidth: false,
    },
  });
}

export default function YoutubeSummarizerPage() {
  const [url, setUrl] = usePersistedState("youtube-url", "");
  const [summaryType, setSummaryType] = usePersistedState("youtube-type", "detailed");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("youtube-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("youtube-summarizer");

  // Feature States
  const [activeFeature, setActiveFeature] = useState<'translate' | 'chat' | 'flashcards' | 'mindmap' | 'audio' | null>(null);
  
  // Translate
  const [translateLang, setTranslateLang] = useState("my");
  const [translatedSummary, setTranslatedSummary] = useState<string | null>(null);
  const [translatedTakeaways, setTranslatedTakeaways] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [cardProgress, setCardProgress] = useState<boolean[]>([]);
  
  // Mindmap
  const [mermaidCode, setMermaidCode] = useState<string>("");
  const [isGeneratingMindmap, setIsGeneratingMindmap] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const mindmapContainerRef = useRef<HTMLDivElement>(null);
  const [mindmapZoom, setMindmapZoom] = useState(1);
  const [mindmapPos, setMindmapPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Audio
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("hannah");
  const [audioStyle, setAudioStyle] = useState<"summary" | "teacher">("teacher");
  const [isLooping, setIsLooping] = useState(false);
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);

  useEffect(() => setMounted(true), []);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Render mermaid diagram
  const renderMermaid = useCallback(async () => {
    if (mermaidRef.current && mermaidCode) {
      try {
        mermaidRef.current.innerHTML = '';
        const { svg } = await mermaid.render('mindmap-svg', mermaidCode);
        mermaidRef.current.innerHTML = svg;
      } catch (err) {
        console.error('Mermaid render error:', err);
        mermaidRef.current.innerHTML = '<p class="text-red-500 text-sm">Failed to render mind map</p>';
      }
    }
  }, [mermaidCode]);

  useEffect(() => {
    if (activeFeature === 'mindmap' && mermaidCode) {
      renderMermaid();
    }
  }, [activeFeature, mermaidCode, renderMermaid]);

  const getVideoId = (urlStr: string) => {
    const match = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const handleSummarize = async () => {
    if (!getVideoId(url)) {
      toast({ title: "Enter a valid YouTube URL", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setSummary(null);
    setActiveFeature(null);
    setTranslatedSummary(null);
    setTranslatedTakeaways([]);
    setChatMessages([]);
    setFlashcards([]);
    setMermaidCode("");
    setAudioUrl(null);
    setCardProgress([]);

    try {
      const response = await fetch("/api/tools/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          summaryType,
          model: selectedModel,
          language: typeof aiLanguage === "string" ? aiLanguage : (aiLanguage as any)?.language || "en",
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        toast({ title: data?.error || "Could not summarize video", variant: "destructive" });
        return;
      }

      setSummary(data);
      saveProject({
        inputData: { url, summaryType },
        outputData: data,
        settings: { model: selectedModel },
        inputPreview: url.slice(0, 200),
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = `${summary.title}\n\n${summary.summary || summary.mainSummary}\n\nKey Takeaways:\n${summary.takeaways?.map((t, i) => `${i + 1}. ${t}`).join('\n') || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleExport = () => {
    if (!summary) return;
    const text = `# ${summary.title}\n\nDuration: ${summary.duration}\n\n## Summary\n${summary.summary || summary.mainSummary}\n\n## Key Moments\n${summary.keyMoments?.map(m => `- [${m.formattedTime || m.timestamp}] ${m.title}: ${m.description || m.summary || ''}`).join('\n') || 'None'}\n\n## Topics\n${summary.topics?.join(', ') || 'None'}\n\n## Key Takeaways\n${summary.takeaways?.map((t, i) => `${i + 1}. ${t}`).join('\n') || 'None'}`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${summary.title?.slice(0, 30) || 'summary'}.md`;
    a.click();
  };

  // Feature 1: Translate Summary (full content)
  const handleTranslate = async () => {
    if (!summary) return;
    setIsTranslating(true);
    setTranslatedSummary(null);
    setTranslatedTakeaways([]);
    
    try {
      // Translate summary
      const summaryRes = await fetch("/api/tools/youtube/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: summary.summary || summary.mainSummary,
          targetLanguage: translateLang,
        }),
      });
      const summaryData = await summaryRes.json();
      if (summaryRes.ok) {
        setTranslatedSummary(summaryData.translatedText);
      }

      // Translate takeaways
      if (summary.takeaways && summary.takeaways.length > 0) {
        const takeawaysRes = await fetch("/api/tools/youtube/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: summary.takeaways.join('\n---\n'),
            targetLanguage: translateLang,
          }),
        });
        const takeawaysData = await takeawaysRes.json();
        if (takeawaysRes.ok) {
          setTranslatedTakeaways(takeawaysData.translatedText.split('---').map((t: string) => t.trim()).filter(Boolean));
        }
      }
    } catch {
      toast({ title: "Translation failed", variant: "destructive" });
    } finally {
      setIsTranslating(false);
    }
  };

  // Feature 2: Ask AI Questions
  const handleChat = async () => {
    if (!chatInput.trim() || !summary) return;
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      const response = await fetch("/api/tools/youtube/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          context: summary.summary || summary.mainSummary,
          title: summary.title,
          history: chatMessages.slice(-6),
        }),
      });
      const data = await response.json();
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.ok ? data.answer : "Sorry, I couldn't process that question." 
      }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Network error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Feature 3: Generate Flashcards
  const handleGenerateFlashcards = async () => {
    if (!summary) return;
    setIsGeneratingCards(true);
    try {
      const response = await fetch("/api/tools/youtube/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.summary || summary.mainSummary,
          takeaways: summary.takeaways,
          topics: summary.topics,
        }),
      });
      const data = await response.json();
      if (response.ok && data.flashcards) {
        setFlashcards(data.flashcards);
        setCardProgress(new Array(data.flashcards.length).fill(false));
        setCurrentCard(0);
        setIsFlipped(false);
      } else {
        toast({ title: data.error || "Failed to generate flashcards", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to generate flashcards", variant: "destructive" });
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const markCardKnown = () => {
    const newProgress = [...cardProgress];
    newProgress[currentCard] = true;
    setCardProgress(newProgress);
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(currentCard + 1);
      setIsFlipped(false);
    }
  };

  // Feature 4: Generate Mind Map (Mermaid.js)
  const handleGenerateMindmap = async () => {
    if (!summary) return;
    setIsGeneratingMindmap(true);
    try {
      const response = await fetch("/api/tools/youtube/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: summary.title,
          summary: summary.summary || summary.mainSummary,
          topics: summary.topics,
          takeaways: summary.takeaways,
          keyMoments: summary.keyMoments,
        }),
      });
      const data = await response.json();
      if (response.ok && data.mermaidCode) {
        setMermaidCode(data.mermaidCode);
      } else {
        toast({ title: data.error || "Failed to generate mind map", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to generate mind map", variant: "destructive" });
    } finally {
      setIsGeneratingMindmap(false);
    }
  };

  // Feature 5: Audio Summary (TTS)
  const handleGenerateAudio = async (voiceOverride?: string, styleOverride?: string) => {
    if (!summary) return;
    setIsGeneratingAudio(true);
    setAudioUrl(null);
    try {
      const response = await fetch("/api/tools/youtube/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${summary.title}. ${summary.summary || summary.mainSummary}. Key takeaways: ${summary.takeaways?.join('. ') || ''}`,
          voice: voiceOverride || selectedVoice,
          style: styleOverride || audioStyle,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        setAudioUrl(URL.createObjectURL(blob));
      } else {
        toast({ title: "Failed to generate audio", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to generate audio", variant: "destructive" });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Extract original YouTube audio
  const handleExtractOriginalAudio = async () => {
    if (!videoId) return;
    setIsExtractingAudio(true);
    setOriginalAudioUrl(null);
    try {
      const response = await fetch("/api/tools/youtube/extract-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        setOriginalAudioUrl(URL.createObjectURL(blob));
        toast({ title: "Audio extracted successfully" });
      } else {
        const data = await response.json();
        toast({ title: data.error || "Failed to extract audio", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to extract audio", variant: "destructive" });
    } finally {
      setIsExtractingAudio(false);
    }
  };

  // Download audio
  const handleDownloadAudio = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setAudioProgress(progress);
    }
  };

  const videoId = getVideoId(url);

  const languages = [
    { code: "my", name: "မြန်မာ" },
    { code: "zh", name: "中文" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
    { code: "th", name: "ไทย" },
    { code: "hi", name: "हिंदी" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
  ];

  const suggestedQuestions = [
    "What is the main point of this video?",
    "Can you explain this in simpler terms?",
    "What are the key takeaways?",
  ];

  return (
    <div className={`h-full flex flex-col transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Youtube className="w-4 h-4 text-blue-600" />
          </div>
          <h1 className="text-base font-semibold text-gray-900">YouTube Summarizer</h1>
        </div>
        <Link href="/dashboard/media" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          Media <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Paste YouTube video URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
            className="flex-1 min-w-0 h-10 rounded-lg border-gray-200 focus:border-blue-500 text-sm bg-gray-50"
          />
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {["brief", "detailed"].map((t) => (
              <button
                key={t}
                onClick={() => setSummaryType(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  summaryType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          <Button onClick={handleSummarize} disabled={isLoading || !videoId} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Summarize"}
          </Button>
        </div>
      </div>

      {/* Content - Side by Side Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {summary ? (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
            {/* Left Panel - Summary Content */}
            <div className="overflow-y-auto space-y-3 pr-1">
              {/* Video Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                  <div className="w-full sm:w-44 shrink-0">
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                      {videoId && (
                        <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 mb-1 line-clamp-2">{summary.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {summary.duration}</span>
                      {summary.transcriptionMethod && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          summary.transcriptionMethod === 'whisper-ai' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Sparkles className="w-3 h-3" />
                          {summary.transcriptionMethod === 'whisper-ai' ? 'AI' : 'Captions'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700">
                        <ExternalLink className="w-3 h-3" /> Watch
                      </a>
                      <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700">
                        {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />} Copy
                      </button>
                      <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700">
                        <Download className="w-3 h-3" /> Export
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900 text-sm">Summary</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {summary.summary || summary.mainSummary}
                </p>
              </div>

              {/* Key Moments */}
              {summary.keyMoments?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Play className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900 text-sm">Key Moments</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {summary.keyMoments.map((m, i) => (
                      <a key={i} href={m.link} target="_blank" rel="noopener noreferrer" className="shrink-0 w-48 p-3 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-lg transition-all">
                        <span className="flex items-center gap-1 text-xs font-mono text-blue-600 bg-blue-100 px-2 py-0.5 rounded w-fit mb-2">
                          <Play className="w-2.5 h-2.5" /> {m.formattedTime || m.timestamp}
                        </span>
                        <p className="font-medium text-gray-900 text-xs line-clamp-2">{m.title}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics & Takeaways */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.topics?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Hash className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900 text-sm">Topics</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.topics.map((t, i) => (
                        <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {summary.takeaways?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900 text-sm">Takeaways</span>
                    </div>
                    <ul className="space-y-1.5">
                      {summary.takeaways.slice(0, 4).map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] shrink-0 font-medium">{i + 1}</span>
                          <span className="leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Feature Tools */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              {/* Feature Tabs */}
              <div className="border-b border-gray-100 p-2">
                <div className="flex gap-1 overflow-x-auto flex-nowrap">
                  {[
                    { id: 'translate', icon: Languages, label: 'Translate' },
                    { id: 'chat', icon: MessageCircle, label: 'Ask AI' },
                    { id: 'flashcards', icon: BookOpen, label: 'Cards' },
                    { id: 'mindmap', icon: Brain, label: 'Map' },
                    { id: 'audio', icon: Volume2, label: 'Listen' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setActiveFeature(activeFeature === f.id ? null : f.id as any);
                        if (f.id === 'flashcards' && flashcards.length === 0) handleGenerateFlashcards();
                        if (f.id === 'mindmap' && !mermaidCode) handleGenerateMindmap();
                        if (f.id === 'audio' && !audioUrl) handleGenerateAudio();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                        activeFeature === f.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <f.icon className="w-3.5 h-3.5" />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Content */}
              <div className="flex-1 overflow-y-auto p-3 lg:p-4">
                {/* Translate */}
                {activeFeature === 'translate' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={translateLang}
                        onChange={(e) => setTranslateLang(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        {languages.map(lang => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                      <Button onClick={handleTranslate} disabled={isTranslating} className="bg-blue-600 hover:bg-blue-700 h-10">
                        {isTranslating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Languages className="w-4 h-4 mr-1" /> Translate</>}
                      </Button>
                    </div>
                    {translatedSummary && (
                      <div className="space-y-3">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-sm font-medium text-blue-800 mb-2">Translated Summary</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{translatedSummary}</p>
                        </div>
                        {translatedTakeaways.length > 0 && (
                          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-sm font-medium text-blue-800 mb-2">Translated Takeaways</p>
                            <ul className="space-y-2">
                              {translatedTakeaways.map((t, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                  <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs shrink-0 font-medium">{i + 1}</span>
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {!translatedSummary && !isTranslating && (
                      <div className="text-center py-12 text-gray-400">
                        <Languages className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Select a language and click translate</p>
                        <p className="text-xs mt-1">Summary and takeaways will be translated</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat */}
                {activeFeature === 'chat' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto space-y-3 mb-3">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-8">
                          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-4">Ask anything about the video</p>
                          <div className="space-y-2">
                            {suggestedQuestions.map((q, i) => (
                              <button
                                key={i}
                                onClick={() => { setChatInput(q); }}
                                className="block w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 rounded-lg text-xs text-gray-600 hover:text-blue-600 transition-colors"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-700 rounded-bl-md'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="px-4 py-2.5 bg-gray-100 rounded-2xl rounded-bl-md">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                        placeholder="Ask a question..."
                        className="text-sm rounded-xl"
                      />
                      <Button onClick={handleChat} disabled={isChatLoading || !chatInput.trim()} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Flashcards */}
                {activeFeature === 'flashcards' && (
                  <div>
                    {isGeneratingCards ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">Generating flashcards...</p>
                        </div>
                      </div>
                    ) : flashcards.length > 0 ? (
                      <div className="space-y-4">
                        {/* Progress */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{currentCard + 1} of {flashcards.length}</span>
                          <span className="text-xs text-green-600">{cardProgress.filter(Boolean).length} known</span>
                        </div>
                        <div className="flex gap-1">
                          {flashcards.map((_, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${
                              cardProgress[i] ? 'bg-green-500' : i === currentCard ? 'bg-blue-500' : 'bg-gray-200'
                            }`} />
                          ))}
                        </div>

                        {/* Card */}
                        <div
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="h-56 bg-gradient-to-br from-blue-50 to-white rounded-2xl border-2 border-blue-100 flex flex-col cursor-pointer hover:shadow-lg transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-3 right-3 text-xs text-blue-400 font-medium">
                            {isFlipped ? 'ANSWER' : 'QUESTION'}
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 pt-10 flex items-center justify-center">
                            <p className="text-center text-gray-800 font-medium leading-relaxed text-sm">
                              {isFlipped ? flashcards[currentCard]?.back : flashcards[currentCard]?.front}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-center text-gray-400">Click card to flip</p>

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setIsFlipped(false); }}
                            disabled={currentCard === 0}
                            className="p-2.5 hover:bg-gray-100 rounded-xl disabled:opacity-30 transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <div className="flex gap-2">
                            <button onClick={() => { setCurrentCard(0); setIsFlipped(false); setCardProgress(new Array(flashcards.length).fill(false)); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-medium flex items-center gap-1">
                              <RotateCcw className="w-3.5 h-3.5" /> Reset
                            </button>
                            <button onClick={markCardKnown} className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-xs font-medium flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> I know this
                            </button>
                          </div>
                          <button
                            onClick={() => { setCurrentCard(Math.min(flashcards.length - 1, currentCard + 1)); setIsFlipped(false); }}
                            disabled={currentCard === flashcards.length - 1}
                            className="p-2.5 hover:bg-gray-100 rounded-xl disabled:opacity-30 transition-colors"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center">
                          <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-3">Generate study flashcards</p>
                          <Button onClick={handleGenerateFlashcards} className="bg-blue-600 hover:bg-blue-700">
                            Generate Flashcards
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mind Map (Mermaid.js) with Zoom/Pan */}
                {activeFeature === 'mindmap' && (
                  <div className="h-full flex flex-col">
                    {isGeneratingMindmap ? (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">Generating mind map...</p>
                        </div>
                      </div>
                    ) : mermaidCode ? (
                      <div className="flex-1 flex flex-col">
                        {/* Controls */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setMindmapZoom(z => Math.min(2, z + 0.2))}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Zoom In"
                            >
                              <ZoomIn className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => setMindmapZoom(z => Math.max(0.3, z - 0.2))}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Zoom Out"
                            >
                              <ZoomOut className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => { setMindmapZoom(1); setMindmapPos({ x: 0, y: 0 }); }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Reset View"
                            >
                              <Maximize2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="text-xs text-gray-400 ml-2">{Math.round(mindmapZoom * 100)}%</span>
                          </div>
                          <button onClick={handleGenerateMindmap} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Regenerate
                          </button>
                        </div>
                        
                        {/* Mindmap Container with Pan/Zoom */}
                        <div
                          ref={mindmapContainerRef}
                          className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing relative"
                          style={{ minHeight: '320px' }}
                          onMouseDown={(e) => {
                            setIsDragging(true);
                            setDragStart({ x: e.clientX - mindmapPos.x, y: e.clientY - mindmapPos.y });
                          }}
                          onMouseMove={(e) => {
                            if (isDragging) {
                              setMindmapPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                            }
                          }}
                          onMouseUp={() => setIsDragging(false)}
                          onMouseLeave={() => setIsDragging(false)}
                          onWheel={(e) => {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            setMindmapZoom(z => Math.min(2, Math.max(0.3, z + delta)));
                          }}
                        >
                          <div
                            ref={mermaidRef}
                            className="absolute inset-0 flex items-center justify-center p-4"
                            style={{
                              transform: `translate(${mindmapPos.x}px, ${mindmapPos.y}px) scale(${mindmapZoom})`,
                              transformOrigin: 'center center',
                              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                            }}
                          />
                          {/* Drag hint */}
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
                            <Move className="w-3 h-3" /> Drag to pan, scroll to zoom
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center">
                          <Brain className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-3">Visualize video content</p>
                          <Button onClick={handleGenerateMindmap} className="bg-blue-600 hover:bg-blue-700">
                            Generate Mind Map
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio */}
                {activeFeature === 'audio' && (
                  <div className="space-y-4">
                    {/* Voice & Style Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Voice</label>
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <option value="hannah">Hannah (Female)</option>
                          <option value="diana">Diana (Female)</option>
                          <option value="autumn">Autumn (Female)</option>
                          <option value="austin">Austin (Male)</option>
                          <option value="daniel">Daniel (Male)</option>
                          <option value="troy">Troy (Male)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Style</label>
                        <select
                          value={audioStyle}
                          onChange={(e) => setAudioStyle(e.target.value as "summary" | "teacher")}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <option value="teacher">Teacher (Smooth)</option>
                          <option value="summary">Summary (Direct)</option>
                        </select>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      onClick={() => handleGenerateAudio()}
                      disabled={isGeneratingAudio}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isGeneratingAudio ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
                      ) : (
                        <><Mic className="w-4 h-4 mr-2" /> Generate AI Summary Audio</>
                      )}
                    </Button>

                    {/* AI Audio Player */}
                    {audioUrl && (
                      <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 p-4">
                        <p className="text-xs text-blue-600 font-medium mb-3 flex items-center gap-1">
                          <Mic className="w-3 h-3" /> AI Generated Summary
                        </p>
                        <audio
                          ref={audioRef}
                          src={audioUrl}
                          loop={isLooping}
                          onEnded={() => !isLooping && setIsPlaying(false)}
                          onTimeUpdate={handleAudioTimeUpdate}
                          className="hidden"
                        />
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => { if (audioRef.current) audioRef.current.currentTime -= 10; }}
                            className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                          >
                            <RotateCcw className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={toggleAudio}
                            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg"
                          >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                          </button>
                          <button
                            onClick={() => { if (audioRef.current) audioRef.current.currentTime += 10; }}
                            className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                          >
                            <RefreshCw className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                        {/* Progress */}
                        <div className="mt-4">
                          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all" style={{ width: `${audioProgress}%` }} />
                          </div>
                        </div>
                        {/* Controls */}
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <button
                            onClick={() => setIsLooping(!isLooping)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              isLooping ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <Repeat className="w-3 h-3" /> Loop
                          </button>
                          <button
                            onClick={() => handleDownloadAudio(audioUrl, 'ai-summary.wav')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Info text */}
                    <p className="text-xs text-center text-gray-400 mt-2">
                      AI will rephrase and explain the summary naturally
                    </p>
                  </div>
                )}

                {/* No Feature Selected */}
                {!activeFeature && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center py-12">
                      <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500">Select a tool above</p>
                      <p className="text-xs text-gray-400 mt-1">Translate, Ask AI, Flashcards, Mind Map, or Listen</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Youtube className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-2">Summarize Any Video</h2>
              <p className="text-sm text-gray-500 mb-4">Get key moments, flashcards, mind maps, and more</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Lectures", "Tutorials", "Podcasts"].map((type) => (
                  <span key={type} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs">{type}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <p className="text-gray-900 font-medium text-sm">Analyzing video...</p>
          </div>
        </div>
      )}
    </div>
  );
}
