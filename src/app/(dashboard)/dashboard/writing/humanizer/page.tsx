"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import { cn } from "@/lib/utils";
import {
  Wand2, Loader2, Copy, Check, RefreshCw, Sparkles, ArrowRightLeft,
  FileText, X, ShieldCheck, Trash2, ChevronDown, Eye, EyeOff, Download, ClipboardPaste
} from "lucide-react";

const TONES = [
  { id: "natural", label: "Natural", desc: "Balanced & authentic", icon: "🌿" },
  { id: "casual", label: "Casual", desc: "Friendly & relaxed", icon: "💬" },
  { id: "formal", label: "Formal", desc: "Professional tone", icon: "👔" },
  { id: "academic", label: "Academic", desc: "Scholarly writing", icon: "🎓" },
  { id: "creative", label: "Creative", desc: "Expressive style", icon: "🎨" },
];

const INTENSITIES = [
  { id: "light", label: "Light", desc: "Subtle changes", score: "~30%" },
  { id: "balanced", label: "Balanced", desc: "Moderate rewrite", score: "~50%" },
  { id: "heavy", label: "Heavy", desc: "Full humanization", score: "~80%", recommended: true },
];

interface InitialData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
}

export default function HumanizerPage({ initialData }: { initialData?: InitialData } = {}) {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [inputText, setInputText] = usePersistedState("humanizer-input", (initialData?.inputData?.inputText as string) || "");
  const [tone, setTone] = usePersistedState("humanizer-tone", (initialData?.settings?.tone as string) || "natural");
  const [intensity, setIntensity] = usePersistedState("humanizer-intensity", (initialData?.settings?.intensity as string) || "heavy");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("humanizer-model", (initialData?.settings?.model as ModelType) || "fast");
  
  // Result states
  const [result, setResult] = usePersistedState("humanizer-result", (initialData?.outputData?.result as string) || "");
  const [htmlResult, setHtmlResult] = usePersistedState("humanizer-html", (initialData?.outputData?.htmlResult as string) || "");
  // aiScore removed - Sapling is only used for offline testing
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [showTones, setShowTones] = useState(false);
  const [showIntensities, setShowIntensities] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("humanizer");

  useEffect(() => setMounted(true), []);

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

  const wordCount = (str: string) => str.split(/\s+/).filter(Boolean).length;
  const hasResult = !!result;

  const handleHumanize = async () => {
    if (inputText.trim().length < 50) {
      toast({ title: "Need at least 50 characters", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult("");
    setHtmlResult("");

    try {
      const response = await fetch("/api/ai/humanize-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          tone,
          intensity,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json();
          toast({
            title: "Insufficient Credits",
            description: `You need ${data.creditsNeeded} credits but have ${data.creditsRemaining} remaining.`,
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed");
      }

      const data = await response.json();
      setHtmlResult(data.html);
      setResult(data.plain);
      saveProject({
        inputData: { inputText },
        outputData: { result: data.plain, htmlResult: data.html },
        settings: { tone, intensity, model: selectedModel },
        inputPreview: inputText.slice(0, 200),
      });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInputToClipboard = () => {
    navigator.clipboard.writeText(inputText);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch {
      toast({ title: "Failed to paste", variant: "destructive" });
    }
  };

  const exportResult = () => {
    const content = `Original:\n${inputText}\n\n---\n\nHumanized (${tone}, ${intensity}):\n${result}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `humanized_${Date.now()}.txt`;
    a.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setInputText(e.target?.result as string);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => {
    setInputText("");
    setResult("");
    setHtmlResult("");
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-200 px-3 lg:px-6 py-2 lg:py-0 lg:h-14 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-base lg:text-lg font-semibold text-gray-900">Content Humanizer</h1>
          <div className="h-4 w-px bg-gray-200 hidden lg:block" />
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
            {/* Tone Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowTones(!showTones); setShowIntensities(false); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span>{TONES.find(t => t.id === tone)?.icon}</span>
                <span className="font-medium">{TONES.find(t => t.id === tone)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showTones && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-[180px]">
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => { setTone(t.id); setShowTones(false); }}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors", tone === t.id && "bg-blue-50")}
                    >
                      <span>{t.icon}</span>
                      <div className="text-left flex-1">
                        <p className={cn("font-medium", tone === t.id && "text-blue-600")}>{t.label}</p>
                        <p className="text-xs text-gray-400">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Intensity Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowIntensities(!showIntensities); setShowTones(false); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="font-medium">{INTENSITIES.find(i => i.id === intensity)?.label}</span>
                <span className="text-xs text-gray-400">{INTENSITIES.find(i => i.id === intensity)?.score}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showIntensities && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-[200px]">
                  {INTENSITIES.map(i => (
                    <button
                      key={i.id}
                      onClick={() => { setIntensity(i.id); setShowIntensities(false); }}
                      className={cn(
                        "w-full p-2.5 text-left hover:bg-gray-50 transition-colors rounded-lg",
                        intensity === i.id && "bg-blue-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={cn("text-sm font-medium", intensity === i.id && "text-blue-600")}>
                          {i.label}
                        </span>
                        <span className="text-xs text-gray-400">{i.score}</span>
                      </div>
                      <p className="text-xs text-gray-500">{i.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="px-2">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleHumanize}
            disabled={isLoading || inputText.trim().length < 50}
            className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-1.5" /> Humanize</>}
          </Button>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left - Input */}
        <div className="flex-1 min-h-[35vh] lg:min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-3 lg:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Original Text</span>
              {inputText && (
                <span className="text-xs text-gray-400">{wordCount(inputText)} words</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {inputText && (
                <button
                  onClick={copyInputToClipboard}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Copy input"
                >
                  {copiedInput ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Upload file"
              >
                <FileText className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              {inputText && (
                <button
                  onClick={reset}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 p-3 lg:p-6 overflow-y-auto relative">
            {!inputText && (
              <button
                onClick={handlePaste}
                className="absolute inset-0 flex items-center justify-center z-10 bg-white hover:bg-gray-50 transition-colors group"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <ClipboardPaste className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Click to paste</span>
                </div>
              </button>
            )}
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your AI-generated text here to humanize it..."
              className="h-full resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 bg-transparent transition-none"
              style={{ transition: 'none' }}
            />
          </div>
        </div>

        {/* Right - Output */}
        <div className="flex-1 min-h-[35vh] lg:min-h-0 flex flex-col bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-3 lg:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Humanized Text</span>
              {result && (
                <>
                  <span className="text-xs text-gray-400">{wordCount(result)} words</span>
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Humanized
                  </span>
                </>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className={cn("p-1.5 rounded-lg transition-colors", showDiff ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}
                  title={showDiff ? "Hide diff" : "Show diff"}
                >
                  {showDiff ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Copy"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={exportResult}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleHumanize}
                  disabled={isLoading}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors disabled:opacity-50"
                  title="Re-humanize"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-3 lg:p-6 overflow-y-auto">
            {result || htmlResult ? (
              <div className="space-y-4">
                {/* Diff Legend */}
                {showDiff && htmlResult && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 pb-2 border-b border-gray-100">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">Original</span>
                    <ArrowRightLeft className="w-3 h-3 text-gray-300" />
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Changed</span>
                  </div>
                )}

                {/* Result */}
                <div className="text-[15px] leading-relaxed text-gray-900">
                  {showDiff && htmlResult ? (
                    <div dangerouslySetInnerHTML={{ __html: htmlResult }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{result}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-600 font-medium">Humanizing your text...</p>
                    <p className="text-xs text-gray-400 mt-1">Transforming your text to sound natural...</p>
                  </div>
                ) : (
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                      <Wand2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Humanized text will appear here</p>
                    <p className="text-xs text-gray-400 mt-2">Changes will be highlighted in <span className="text-green-600 font-medium">green</span></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
