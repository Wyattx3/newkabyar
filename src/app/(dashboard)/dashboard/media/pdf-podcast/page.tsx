"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { ContentInput } from "@/components/tools/content-input";
import { 
  Mic, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  Download,
  Play,
  User,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface DialogueLine {
  speaker: string;
  text: string;
}

interface Segment {
  title: string;
  dialogue: DialogueLine[];
}

interface PodcastScript {
  title: string;
  summary: string;
  speakers: {
    host: { name: string };
    guest: { name: string };
  };
  segments: Segment[];
  keyTopics: string[];
  duration?: string;
}

const durationOptions = [
  { value: "short", label: "5-7m" },
  { value: "medium", label: "10-12m" },
  { value: "long", label: "15-20m" },
];

const styleOptions = [
  { value: "educational", label: "📚 Edu" },
  { value: "casual", label: "☕ Casual" },
  { value: "interview", label: "🎙️ Interview" },
];

export default function PDFPodcastPage() {
  const [content, setContent] = usePersistedState("podcast-content", "");
  const [duration, setDuration] = usePersistedState("podcast-duration", "medium");
  const [style, setStyle] = usePersistedState("podcast-style", "educational");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("podcast-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (content.trim().length < 200) {
      toast({ title: "Min 200 characters required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setScript(null);

    try {
      const response = await fetch("/api/tools/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          duration,
          style,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        throw new Error("Failed");
      }

      const data = await response.json();
      setScript(data);
      setExpandedSegment(0);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const exportScript = () => {
    if (!script) return;
    let text = `# ${script.title}\n\n${script.summary}\n\n---\n\n`;
    script.segments.forEach(segment => {
      text += `## ${segment.title}\n\n`;
      segment.dialogue.forEach(line => {
        const speakerName = line.speaker === "host" ? script.speakers.host.name : script.speakers.guest.name;
        text += `**${speakerName}:** ${line.text}\n\n`;
      });
    });
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${script.title.replace(/\s+/g, "_")}_Script.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyScript = () => {
    if (!script) return;
    let text = "";
    script.segments.forEach(segment => {
      segment.dialogue.forEach(line => {
        const speakerName = line.speaker === "host" ? script.speakers.host.name : script.speakers.guest.name;
        text += `${speakerName}: ${line.text}\n\n`;
      });
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Mic className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">PDF to Podcast</h1>
            <p className="text-[10px] text-gray-500">Transform content into dialogue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/media" className="text-[10px] text-blue-600 hover:underline">Media</Link>
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />8
          </span>
        </div>
      </div>

      {/* Main Content - Full Height */}
      <div className="flex-1 min-h-0">
        {!script ? (
          /* Input View - Two Column */
          <div className="h-full grid lg:grid-cols-[1fr_300px] gap-3">
            {/* Left: Content Input */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-gray-700">Your Content</span>
                <span className="text-[10px] text-gray-400">{content.length} chars</span>
              </div>
              <div className="flex-1 p-3">
                <ContentInput
                  value={content}
                  onChange={setContent}
                  placeholder="Paste document content, article, or upload PDF..."
                  minHeight="100%"
                  color="blue"
                />
              </div>
            </div>

            {/* Right: Options Panel */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
              <div className="text-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <Mic className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Create Podcast</h2>
              </div>

              <div className="flex-1 space-y-4">
                {/* Duration */}
                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Duration</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {durationOptions.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDuration(d.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          duration === d.value
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Style</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {styleOptions.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStyle(s.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          style === s.value
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">AI Model</label>
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isLoading || content.trim().length < 200}
                className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-sm mt-4"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating...</>
                ) : (
                  <><Mic className="w-4 h-4 mr-1.5" />Generate</>
                )}
              </Button>
              <p className="text-center text-[10px] text-gray-400 mt-2">Min 200 characters</p>
            </div>
          </div>
        ) : (
          /* Script View - Full Screen Grid */
          <div className="h-full flex flex-col">
            {/* Back & Actions */}
            <div className="flex items-center justify-between mb-2 shrink-0">
              <button
                onClick={() => setScript(null)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> New
              </button>
              <div className="flex gap-2">
                <button onClick={copyScript} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 rounded-lg">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={exportScript} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 rounded-lg">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            </div>

            {/* Script Grid */}
            <div className="flex-1 grid lg:grid-cols-[280px_1fr] gap-3 min-h-0">
              {/* Left: Info Panel */}
              <div className="flex flex-col gap-3 overflow-y-auto">
                {/* Title Card */}
                <div className="bg-blue-600 rounded-xl p-4 text-white">
                  <h2 className="font-bold text-sm mb-1 line-clamp-2">{script.title}</h2>
                  <p className="text-[10px] text-blue-100 line-clamp-2">{script.summary}</p>
                  <div className="flex items-center gap-3 mt-3 text-[10px]">
                    {script.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {script.duration}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" /> {script.segments.length} parts
                    </span>
                  </div>
                </div>

                {/* Speakers */}
                <div className="bg-white rounded-xl border border-gray-100 p-3">
                  <h3 className="text-[10px] font-semibold text-gray-500 mb-2">SPEAKERS</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-900">{script.speakers.host.name}</span>
                      <span className="text-[10px] text-blue-600 ml-auto">Host</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-900">{script.speakers.guest.name}</span>
                      <span className="text-[10px] text-green-600 ml-auto">Guest</span>
                    </div>
                  </div>
                </div>

                {/* Topics */}
                {script.keyTopics && script.keyTopics.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-3">
                    <h3 className="text-[10px] font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> TOPICS
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {script.keyTopics.slice(0, 6).map((topic, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">{topic}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Script Content */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2 shrink-0">
                  <Play className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-900">Script</span>
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded">{script.segments.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {script.segments.map((segment, i) => (
                    <div key={i}>
                      <button
                        onClick={() => setExpandedSegment(expandedSegment === i ? null : i)}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="text-xs font-medium text-gray-900">{segment.title}</span>
                        </div>
                        {expandedSegment === i ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {expandedSegment === i && (
                        <div className="px-4 pb-3 space-y-2">
                          {segment.dialogue.map((line, j) => {
                            const isHost = line.speaker === "host";
                            const speakerName = isHost ? script.speakers.host.name : script.speakers.guest.name;
                            return (
                              <div key={j} className={`flex gap-2 p-2 rounded-lg ${isHost ? "bg-blue-50" : "bg-green-50"}`}>
                                <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${isHost ? "bg-blue-600" : "bg-green-600"}`}>
                                  <User className="w-3 h-3 text-white" />
                                </div>
                                <div>
                                  <span className={`text-[10px] font-semibold ${isHost ? "text-blue-600" : "text-green-600"}`}>
                                    {speakerName}
                                  </span>
                                  <p className="text-[11px] text-gray-700 mt-0.5">{line.text}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
