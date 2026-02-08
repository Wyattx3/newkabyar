"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import { cn } from "@/lib/utils";
import {
  Video,
  Loader2,
  ChevronDown,
  RefreshCw,
  ClipboardPaste,
  Play,
  Sparkles,
  Volume2,
  Mic,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ExplainerData } from "@/components/remotion/types";

const RemotionPlayer = dynamic(
  () => import("@/components/remotion/RemotionPlayerWrapper"),
  { ssr: false }
);

const STYLES = [
  { value: "educational", label: "Educational", icon: "📚", desc: "Thorough explanation" },
  { value: "quick-overview", label: "Quick Overview", icon: "⚡", desc: "Fast & concise" },
  { value: "deep-dive", label: "Deep Dive", icon: "🔬", desc: "Comprehensive detail" },
];

interface InitialData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
}

export default function VideoExplainerPage({ initialData }: { initialData?: InitialData } = {}) {
  const [mounted, setMounted] = useState(false);

  const [topic, setTopic] = usePersistedState("video-explainer-topic", (initialData?.inputData?.topic as string) || "");
  const [style, setStyle] = usePersistedState("video-explainer-style", (initialData?.settings?.style as string) || "educational");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("video-explainer-model", (initialData?.settings?.model as ModelType) || "fast");

  const [showStyle, setShowStyle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);

  const [videoData, setVideoData] = useState<ExplainerData | null>((initialData?.outputData as unknown as ExplainerData) || null);

  const { toast } = useToast();
  const { language } = useAILanguage();
  const { saveProject } = useAutoSaveProject("video-explainer");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fit view
  useEffect(() => {
    const parent = document.querySelector('main > div') as HTMLElement;
    const html = document.documentElement;
    const body = document.body;
    const origParentClass = parent?.className;
    html.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    if (parent) {
      parent.classList.remove('overflow-y-auto');
      parent.classList.add('overflow-hidden', 'p-0');
      parent.style.setProperty('overflow', 'hidden', 'important');
      parent.style.setProperty('padding', '0', 'important');
    }
    return () => {
      html.style.overflow = '';
      body.style.overflow = '';
      if (parent && origParentClass) {
        parent.className = origParentClass;
        parent.style.removeProperty('overflow');
        parent.style.removeProperty('padding');
      }
    };
  }, []);

  useEffect(() => {
    const handleClick = () => setShowStyle(false);
    if (showStyle) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [showStyle]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setTopic(text);
    } catch {
      toast({ title: "Paste failed", description: "Could not read clipboard", variant: "destructive" });
    }
  };

  const copyInputToClipboard = async () => {
    if (!topic) return;
    await navigator.clipboard.writeText(topic);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 1500);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Topic required", description: "Please enter a topic to explain", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setVideoData(null);

    try {
      const response = await fetch("/api/tools/explainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          style,
          model: selectedModel,
          language,
        }),
      });

      if (!response.ok) {
        let errMsg = "Something went wrong";
        try {
          const errorData = await response.json();
          errMsg = typeof errorData.error === "string" ? errorData.error : errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Preload all images before showing the player
        const imageUrls = (data.data.scenes || [])
          .map((s: { imageUrl?: string }) => s.imageUrl)
          .filter(Boolean) as string[];

        if (imageUrls.length > 0) {
          await Promise.allSettled(
            imageUrls.map(
              (url: string) =>
                new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => resolve();
                  img.onerror = () => resolve(); // don't block on failed images
                  img.src = url;
                  // Timeout after 5s so we don't wait forever
                  setTimeout(() => resolve(), 5000);
                })
            )
          );
        }

        setVideoData(data.data);
        saveProject({
          inputData: { topic },
          outputData: data.data,
          settings: { style, model: selectedModel },
          inputPreview: topic.slice(0, 200),
        });
        const hasAudio = data.data.audioUrls?.some((u: string | null) => u);
        toast({
          title: "Video ready!",
          description: hasAudio
            ? "Video with voice narration is ready to play"
            : "Video generated. Voice narration unavailable.",
        });
      } else {
        throw new Error("Invalid response");
      }
    } catch (error: unknown) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const currentStyle = STYLES.find((s) => s.value === style) || STYLES[0];
  const hasAudio = videoData?.audioUrls?.some(Boolean);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Video className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Video Explainer</h1>
              <p className="text-xs text-gray-400">Animated explainer with voice narration</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Style Selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStyle(!showStyle);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
              >
                <span>{currentStyle.icon}</span>
                <span className="text-gray-700">{currentStyle.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showStyle && (
                <div
                  className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {STYLES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => {
                        setStyle(s.value);
                        setShowStyle(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2",
                        style === s.value && "bg-blue-50"
                      )}
                    >
                      <span>{s.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-700">{s.label}</div>
                        <div className="text-xs text-gray-400">{s.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ModelSelector model={selectedModel} setModel={setSelectedModel} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input Section */}
        <div className="w-[380px] flex-shrink-0 border-r border-gray-100 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Topic
            </span>
            {topic && (
              <button
                onClick={copyInputToClipboard}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                {copiedInput ? "Copied!" : "Copy"}
              </button>
            )}
          </div>

          <div className="flex-1 relative">
            {!topic ? (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <button
                  onClick={handlePaste}
                  className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                >
                  <ClipboardPaste className="w-5 h-5 text-gray-300" />
                  <span className="text-xs text-gray-400">Paste topic</span>
                </button>
              </div>
            ) : null}
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter any topic you want to explain... e.g. 'How does photosynthesis work?', 'Blockchain technology explained', 'The water cycle'"
              className="h-full border-0 resize-none focus-visible:ring-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 transition-none p-4"
              style={{ transition: "none" }}
            />
          </div>

          {/* Features info */}
          <div className="px-4 py-3 border-t border-gray-50 space-y-2">
            <div className="text-xs text-gray-400 mb-2">Includes</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Voice Narration", icon: <Mic className="w-3 h-3" /> },
                { label: "Topic Images", icon: <span className="text-[10px]">🖼</span> },
                { label: "Dynamic Timing", icon: <span className="text-[10px]">⏱</span> },
                { label: "Varied Layouts", icon: <span className="text-[10px]">📐</span> },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-[10px] text-gray-500 font-medium"
                >
                  {f.icon}
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-100">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 text-sm font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating video & audio...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right - Video Player Section */}
        <div className="flex-1 flex flex-col bg-gray-50/30">
          {videoData ? (
            <>
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-gray-600">
                    {videoData.title}
                  </span>
                  <span className="text-xs text-gray-300">
                    · {videoData.scenes.length} scenes · {Math.round(videoData.totalDurationInFrames / 30)}s
                  </span>
                  {hasAudio && (
                    <span className="flex items-center gap-1 text-xs text-blue-500">
                      <Volume2 className="w-3 h-3" /> narrated
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="h-7 text-xs text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
                  Regenerate
                </Button>
              </div>

              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-[840px]">
                  <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
                    <RemotionPlayer data={videoData} />
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
                    {videoData.scenes.map((scene, i) => {
                      const typeColors: Record<string, string> = {
                        title: "bg-blue-100 text-blue-600",
                        bullets: "bg-green-100 text-green-600",
                        comparison: "bg-amber-100 text-amber-600",
                        timeline: "bg-purple-100 text-purple-600",
                        summary: "bg-rose-100 text-rose-600",
                      };
                      return (
                        <div
                          key={i}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1",
                            typeColors[scene.type] || "bg-gray-100 text-gray-600"
                          )}
                          title={scene.narration}
                        >
                          <span className="capitalize">{scene.type}</span>
                          {scene.imageUrl && <span>🖼</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  No video yet
                </h3>
                <p className="text-xs text-gray-400 max-w-[240px]">
                  Enter a topic and click Generate to create an animated explainer video with voice narration
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
