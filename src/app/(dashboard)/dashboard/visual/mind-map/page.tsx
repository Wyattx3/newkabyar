"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { MermaidRenderer } from "@/components/tools/mermaid-renderer";
import { 
  Network, 
  Loader2, 
  Sparkles,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Wand2,
  Upload,
  FileText,
  X,
  Type,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function MindMapPage() {
  const [inputMode, setInputMode] = useState<"topic" | "content">("topic");
  const [topic, setTopic] = usePersistedState("mindmap-topic", "");
  const [content, setContent] = usePersistedState("mindmap-content", "");
  const [depth, setDepth] = usePersistedState("mindmap-depth", "medium");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("mindmap-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [mermaidCode, setMermaidCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".txt")) {
      toast({ title: "Only PDF and TXT files are supported", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/utils/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      setContent(data.text);
      setUploadedFile(file.name);
      toast({ title: "File uploaded", description: `${data.characterCount.toLocaleString()} chars extracted` });
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to process file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setContent("");
  };

  const handleGenerate = async () => {
    if (inputMode === "topic" && topic.trim().length < 3) {
      toast({ title: "Enter a topic", variant: "destructive" });
      return;
    }
    if (inputMode === "content" && content.trim().length < 50) {
      toast({ title: "Content must be at least 50 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setMermaidCode("");

    try {
      const response = await fetch("/api/tools/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: inputMode === "topic" ? topic : undefined,
          content: inputMode === "content" ? content : undefined,
          depth,
          style: "hierarchical",
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
      setMermaidCode(data.mermaidCode || "");
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickTopics = [
    "Machine Learning",
    "Climate Change",
    "Web Development",
    "Quantum Physics",
    "World History",
  ];

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Compact Header Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 p-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Network className="w-7 h-7 text-amber-600" />

          {/* Mode Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setInputMode("topic")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                inputMode === "topic" ? "bg-amber-600 text-white shadow-sm" : "text-gray-600 hover:bg-amber-50"
              )}
            >
              <Type className="w-3.5 h-3.5" />
              Topic
            </button>
            <button
              onClick={() => setInputMode("content")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                inputMode === "content" ? "bg-amber-600 text-white shadow-sm" : "text-gray-600 hover:bg-amber-50"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              PDF/Text
            </button>
          </div>

          {/* Input based on mode */}
          {inputMode === "topic" ? (
            <div className="flex-1 relative">
              <Input
                placeholder="Enter a topic to visualize..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="h-12 pl-4 pr-32 text-base rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500/20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {["shallow", "medium", "deep"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                        depth === d
                          ? "bg-white text-amber-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || topic.trim().length < 3}
                  size="sm"
                  className="h-8 px-4 rounded-lg bg-amber-600 hover:bg-amber-700"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              {uploadedFile ? (
                <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{uploadedFile}</p>
                    <p className="text-xs text-gray-500">{content.length.toLocaleString()} chars</p>
                  </div>
                  <button onClick={clearFile} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1 flex items-center justify-center gap-2 h-12 px-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-amber-600" />
                      <span className="text-sm text-gray-600">Upload PDF or paste text below</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {["shallow", "medium", "deep"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-all capitalize ${
                      depth === d
                        ? "bg-white text-amber-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isLoading || content.trim().length < 50}
                size="sm"
                className="h-8 px-4 rounded-lg bg-amber-600 hover:bg-amber-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* Model & Credits */}
          <div className="flex items-center gap-3">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            <Link href="/dashboard/visual" className="text-xs text-amber-600 hover:underline hidden md:block">Visual</Link>
            <span className="px-2 py-1 bg-amber-50 text-amber-600 text-xs rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />4
            </span>
          </div>
        </div>

        {/* Content Textarea for PDF/Text mode */}
        {inputMode === "content" && !uploadedFile && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Textarea
              placeholder="Or paste your content here to generate a mind map from it..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        )}

        {/* Quick Topics - only for topic mode */}
        {inputMode === "topic" && !mermaidCode && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Try:</span>
            {quickTopics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1 text-xs bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-600 rounded-full transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className={`flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative ${
        isFullscreen ? "fixed inset-4 z-50" : ""
      }`}>
        {mermaidCode ? (
          <>
            {/* Canvas Controls */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <div className="flex items-center bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-100 p-1">
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-medium text-gray-600 min-w-[50px] text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-100 text-gray-600 hover:text-gray-900"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={copyCode}
                className="p-2 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-100 text-gray-600 hover:text-emerald-600"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Topic Badge */}
            <div className="absolute top-4 left-4 z-10">
              <div className="px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-900">{topic}</span>
              </div>
            </div>

            {/* Diagram */}
            <div 
              className="h-full flex items-center justify-center p-8 overflow-auto"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
            >
              <MermaidRenderer code={mermaidCode} />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Network className="w-12 h-12 text-emerald-600 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Create Mind Maps</h2>
              <p className="text-gray-500 mb-6">
                Enter any topic above and watch it transform into a beautiful, interactive mind map
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {quickTopics.slice(0, 3).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTopic(t); handleGenerate(); }}
                    className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium transition-colors"
                  >
                    Try "{t}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <Network className="w-10 h-10 text-emerald-600 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600 font-medium">Generating mind map...</p>
              <p className="text-xs text-gray-400 mt-1">Analyzing "{topic}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
