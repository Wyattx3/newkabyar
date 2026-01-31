"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Youtube, 
  Loader2, 
  Sparkles,
  Clock,
  ExternalLink,
  BookOpen,
  Tag,
  Lightbulb,
  Play,
  List,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface KeyMoment {
  timestamp: string;
  title: string;
  summary: string;
  link: string;
}

interface Summary {
  title: string;
  duration: string;
  mainSummary: string;
  keyMoments: KeyMoment[];
  topics: string[];
  takeaways: string[];
  transcriptionMethod?: 'youtube-captions' | 'whisper-ai';
}

export default function YoutubeSummarizerPage() {
  const [url, setUrl] = usePersistedState("youtube-url", "");
  const [summaryType, setSummaryType] = usePersistedState("youtube-type", "detailed");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("youtube-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

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

    try {
      const response = await fetch("/api/tools/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          summaryType,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        // Display the specific error message from API
        const errorMsg = data?.error || "Could not summarize video";
        toast({ title: errorMsg, variant: "destructive" });
        return;
      }

      setSummary(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const videoId = getVideoId(url);

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Youtube className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">YouTube Summarizer</h1>
            <p className="text-xs text-gray-500">Get key insights from any video</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/media" className="text-xs text-red-600 hover:underline">Media</Link>
          <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />5 credits
          </span>
        </div>
      </div>

      {/* URL Input Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            <Input
              placeholder="Paste YouTube URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
              className="h-12 pl-12 pr-4 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500/20 text-base"
            />
          </div>
          <div className="flex bg-gray-100 rounded-xl p-1">
            {[
              { value: "brief", label: "Brief" },
              { value: "detailed", label: "Detailed" },
              { value: "study", label: "Study" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setSummaryType(t.value)}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                  summaryType === t.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          <Button
            onClick={handleSummarize}
            disabled={isLoading || !getVideoId(url)}
            className="h-12 px-6 rounded-xl bg-red-600 hover:bg-red-700"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Summarize"}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {summary ? (
          <div className="h-full grid lg:grid-cols-[400px_1fr] gap-4">
            {/* Video Preview */}
            <div className="space-y-4">
              {/* Video Embed */}
              <div className="bg-black rounded-2xl overflow-hidden aspect-video shadow-xl">
                {videoId && (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full h-full"
                    allowFullScreen
                  />
                )}
              </div>

              {/* Video Info */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h2 className="font-bold text-gray-900 mb-2 line-clamp-2">{summary.title}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {summary.duration}
                  </span>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-red-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" /> Watch
                  </a>
                  {/* Transcription Method Badge */}
                  {summary.transcriptionMethod && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      summary.transcriptionMethod === 'whisper-ai' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Sparkles className="w-3 h-3" />
                      {summary.transcriptionMethod === 'whisper-ai' ? 'Whisper AI' : 'YouTube Captions'}
                    </span>
                  )}
                </div>
              </div>

              {/* Topics */}
              {summary.topics && summary.topics.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900 text-sm">Topics Covered</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.topics.map((topic, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Summary Content */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-gray-900">Summary</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Main Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Overview</h3>
                  <p className="text-gray-700 leading-relaxed">{summary.mainSummary}</p>
                </div>

                {/* Key Moments */}
                {summary.keyMoments && summary.keyMoments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <List className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Key Moments</h3>
                    </div>
                    <div className="space-y-3">
                      {summary.keyMoments.map((moment, i) => (
                        <a
                          key={i}
                          href={moment.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex gap-3 p-3 bg-gray-50 hover:bg-purple-50 rounded-xl transition-colors group"
                        >
                          <div className="w-16 shrink-0">
                            <span className="flex items-center gap-1 text-xs font-mono text-purple-600 bg-purple-100 px-2 py-1 rounded">
                              <Play className="w-3 h-3" /> {moment.timestamp}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm group-hover:text-purple-700">{moment.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{moment.summary}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Takeaways */}
                {summary.takeaways && summary.takeaways.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-amber-800">Key Takeaways</h3>
                    </div>
                    <ul className="space-y-2">
                      {summary.takeaways.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                          <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Youtube className="w-12 h-12 text-red-500 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Summarize Any YouTube Video</h2>
              <p className="text-gray-500 mb-6">
                Paste a video URL above to get key moments, timestamps, and actionable takeaways
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {["Lectures", "Tutorials", "Podcasts", "Documentaries"].map((type) => (
                  <span key={type} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
          <div className="text-center">
            <Youtube className="w-10 h-10 text-red-500 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600 font-medium">Analyzing video...</p>
            <p className="text-xs text-gray-400 mt-1">Extracting transcript & key moments</p>
          </div>
        </div>
      )}
    </div>
  );
}
