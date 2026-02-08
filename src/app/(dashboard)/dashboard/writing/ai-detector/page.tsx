"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Scan,
  FileText, Trash2, Copy, Check, Download, RefreshCw, Wand2, TrendingUp, TrendingDown
} from "lucide-react";
// Highlighting using regex - no external library needed

interface DetectionIndicator {
  text: string;
  reason: string;
}

interface DetectionResult {
  aiScore: number;
  humanScore: number;
  analysis: string;
  indicators?: DetectionIndicator[];
  suggestions?: string[];
}

export default function AIDetectorPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [text, setText] = usePersistedState("detect-text", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("detect-model", "fast");
  
  // Result states
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  // Highlighting helper

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

  // Circle Chart Component (Donut Chart)
  const CircleChart = ({ aiScore, humanScore }: { aiScore: number; humanScore: number }) => {
    const size = 220;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Calculate arc lengths
    const aiLength = (aiScore / 100) * circumference;
    const humanLength = (humanScore / 100) * circumference;
    
    const aiColor = aiScore >= 60 ? "#ef4444" : aiScore >= 40 ? "#f59e0b" : "#10b981";
    const humanColor = "#3b82f6";

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* AI Score Arc (starts at top) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={aiColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${aiLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          {/* Human Score Arc (continues from AI arc) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={humanColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${humanLength} ${circumference}`}
            strokeDashoffset={-aiLength}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className={cn(
            "text-5xl font-bold",
            aiScore >= 60 ? "text-red-600" :
            aiScore >= 40 ? "text-amber-600" :
            "text-green-600"
          )}>
            {aiScore}%
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">AI Detected</p>
          <p className="text-xs text-gray-400 mt-0.5">{humanScore}% Human</p>
        </div>
      </div>
    );
  };

  const handleAnalyze = async () => {
    if (text.trim().length < 50) {
      toast({ title: "Need at least 50 characters", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/ai/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model: selectedModel, language: aiLanguage }),
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
      setResult(data);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const handleHumanize = async () => {
    if (!text.trim()) return;
    setIsHumanizing(true);
    try {
      const response = await fetch("/api/ai/humanize-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tone: "natural", intensity: "heavy", model: selectedModel, language: aiLanguage }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setText(data.plain);
      setResult(null);
      toast({ title: "Text humanized! Run detection again." });
    } catch {
      toast({ title: "Humanization failed", variant: "destructive" });
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target?.result as string);
      setResult(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyReport = () => {
    if (!result) return;
    const report = `AI Detection Report\n\nAI Score: ${result.aiScore}%\nHuman Score: ${result.humanScore}%\n\nAnalysis: ${result.analysis}\n\nIndicators:\n${result.indicators?.map(i => `- "${i.text}": ${i.reason}`).join("\n") || "None"}\n\nSuggestions:\n${result.suggestions?.map(s => `- ${s}`).join("\n") || "None"}`;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportReport = () => {
    if (!result) return;
    const report = `# AI Detection Report\n\n## Scores\n- AI Score: ${result.aiScore}%\n- Human Score: ${result.humanScore}%\n\n## Analysis\n${result.analysis}\n\n## AI Indicators\n${result.indicators?.map(i => `- **"${i.text}"**: ${i.reason}`).join("\n") || "None found"}\n\n## Suggestions\n${result.suggestions?.map(s => `- ${s}`).join("\n") || "None"}`;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_detection_report_${Date.now()}.md`;
    a.click();
  };

  // Highlight detected phrases in text
  const highlightText = (originalText: string, indicators: DetectionIndicator[] = []): string => {
    if (!indicators || indicators.length === 0) return originalText;
    
    let highlighted = originalText;
    const sortedIndicators = [...indicators].sort((a, b) => b.text.length - a.text.length);
    
    for (const indicator of sortedIndicators) {
      const phrase = indicator.text.trim();
      if (phrase.length < 3) continue;
      
      // Escape special regex characters
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      
      // Replace with highlighted version
      highlighted = highlighted.replace(regex, (match) => {
        return `<mark class="bg-red-100 text-red-800 px-1 rounded font-medium" title="${indicator.reason}">${match}</mark>`;
      });
    }
    
    return highlighted;
  };

  const reset = () => {
    setText("");
    setResult(null);
  };

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Minimal Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">AI Content Detector</h1>
          <div className="h-4 w-px bg-gray-200" />
          <div className="px-2">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isLoading || text.trim().length < 50}
            className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Scan className="w-4 h-4 mr-1.5" /> Analyze</>}
          </Button>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Input Text</span>
              {text && (
                <span className="text-xs text-gray-400">{wordCount(text)} words</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Upload file"
              >
                <FileText className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              {text && (
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
          <div className="flex-1 p-6 overflow-y-auto">
            {result && result.indicators && result.indicators.length > 0 ? (
              <div 
                className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightText(text, result.indicators) }}
              />
            ) : (
              <Textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setResult(null); }}
                placeholder="Paste your text here to check for AI-generated content..."
                className="h-full resize-none border-0 shadow-none focus-visible:ring-0 text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 bg-transparent"
              />
            )}
          </div>
        </div>

        {/* Right - Results */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Detection Results</span>
              {result && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1",
                  result.aiScore >= 60 ? "bg-red-50 text-red-700" :
                  result.aiScore >= 40 ? "bg-amber-50 text-amber-700" :
                  "bg-green-50 text-green-700"
                )}>
                  <ShieldCheck className="w-3 h-3" />
                  {result.aiScore}% AI
                </span>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <button
                  onClick={copyReport}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Copy report"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={exportReport}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Download report"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleHumanize}
                  disabled={isHumanizing}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors disabled:opacity-50"
                  title="Humanize text"
                >
                  <Wand2 className={cn("w-4 h-4", isHumanizing && "animate-pulse")} />
                </button>
                <button
                  onClick={() => { setResult(null); handleAnalyze(); }}
                  disabled={isLoading}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors disabled:opacity-50"
                  title="Re-analyze"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {result ? (
              <div className="space-y-6">
                {/* Circle Chart */}
                <div className="flex flex-col items-center justify-center py-8">
                  <CircleChart aiScore={result.aiScore} humanScore={result.humanScore} />
                  
                  {/* Legend */}
                  <div className="flex items-center gap-6 mt-8">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-4 h-4 rounded-full",
                        result.aiScore >= 60 ? "bg-red-500" :
                        result.aiScore >= 40 ? "bg-amber-500" :
                        "bg-green-500"
                      )} />
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{result.aiScore}%</span> AI Detected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500" />
                      <span className="text-sm text-gray-700">
                        <span className="font-semibold">{result.humanScore}%</span> Human Written
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={cn(
                    "mt-4 px-4 py-2 rounded-full flex items-center gap-2",
                    result.aiScore >= 60 ? "bg-red-50 text-red-700" :
                    result.aiScore >= 40 ? "bg-amber-50 text-amber-700" :
                    "bg-green-50 text-green-700"
                  )}>
                    {result.aiScore >= 60 ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">High AI Probability</span>
                      </>
                    ) : result.aiScore >= 40 ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Moderate AI Probability</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Low AI Probability - Likely Human</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Analysis */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-semibold text-gray-900 block mb-3">Analysis</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.analysis}</p>
                </div>

                {/* Indicators */}
                {result.indicators && result.indicators.length > 0 && (
                  <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-semibold text-red-800">AI Indicators Found ({result.indicators.length})</span>
                    </div>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto">
                      {result.indicators.map((ind, i) => (
                        <div key={i} className="p-3 bg-white rounded-lg border border-red-100">
                          <p className="text-sm text-red-700 font-medium mb-1">
                            "{ind.text.substring(0, 80)}{ind.text.length > 80 ? "..." : ""}"
                          </p>
                          <p className="text-xs text-gray-600">{ind.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                    <span className="text-sm font-semibold text-green-800 block mb-3">Improvement Suggestions</span>
                    <ul className="space-y-2">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-600 font-medium">Analyzing your text...</p>
                    <p className="text-xs text-gray-400 mt-1">Checking for AI patterns</p>
                  </div>
                ) : (
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Detection results will appear here</p>
                    <p className="text-xs text-gray-400 mt-2">Paste your text and click Analyze to check for AI content</p>
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
