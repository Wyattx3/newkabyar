"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  Scale, Loader2, Copy, Check, FileText, Trash2, 
  ThumbsDown, Lightbulb, ArrowRight, RefreshCw, Shield, AlertTriangle,
  Swords, BookOpen, Zap, ChevronDown, ClipboardPaste
} from "lucide-react";

interface AdvocateHistory {
  id: string;
  argumentPreview: string;
  intensity: string;
  timestamp: number;
}

interface CounterArgument {
  title: string;
  argument: string;
  evidence?: string;
  weakness: string;
}

interface AdvocateResult {
  summary: string;
  weaknesses: string[];
  counterArguments: CounterArgument[];
  strengthenedVersion?: string;
  blindSpots?: string[];
  additionalConsiderations?: string[];
}

const INTENSITY_LEVELS = [
  { value: "gentle", label: "Gentle", desc: "Constructive feedback" },
  { value: "moderate", label: "Moderate", desc: "Balanced critique" },
  { value: "aggressive", label: "Aggressive", desc: "Tough challenge" },
  { value: "ruthless", label: "Ruthless", desc: "No mercy" },
];

const ARGUMENT_TYPES = [
  { value: "general", label: "General Argument" },
  { value: "business", label: "Business Proposal" },
  { value: "academic", label: "Academic Thesis" },
  { value: "debate", label: "Debate Position" },
  { value: "political", label: "Political Opinion" },
  { value: "scientific", label: "Scientific Claim" },
];

export default function DevilsAdvocatePage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [argument, setArgument] = usePersistedState("advocate-arg", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("advocate-model", "fast");
  const [intensity, setIntensity] = usePersistedState("advocate-intensity", "moderate");
  const [argumentType, setArgumentType] = useState("general");
  
  // Result states
  const [result, setResult] = useState<AdvocateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  
  // UI states
  const [activeTab, setActiveTab] = useState<"counter" | "strengthen">("counter");
  const [showSettings, setShowSettings] = useState(false);
  const [showIntensity, setShowIntensity] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

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

  const wordCount = argument.split(/\s+/).filter(Boolean).length;

  const handleChallenge = async () => {
    if (!argument.trim()) {
      toast({ title: "Please enter your argument", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/advocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          argument,
          intensity,
          type: argumentType,
          model: selectedModel,
          uiLanguage: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json();
          toast({
            title: "Insufficient Credits",
            description: `Need ${data.creditsNeeded} credits, have ${data.creditsRemaining}`,
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed");
      }

      const data = await response.json();
      setResult(data);

    } catch {
      toast({ title: "Challenge failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new Event("credits-updated"));
    }
  };

  const copyInputToClipboard = () => {
    navigator.clipboard.writeText(argument);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setArgument(text);
      setResult(null);
    } catch {
      toast({ title: "Failed to paste", variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setArgument(e.target?.result as string);
      setResult(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyResult = () => {
    if (!result) return;
    const text = `Devil's Advocate Analysis\n\nSummary: ${result.summary}\n\nWeaknesses:\n${result.weaknesses.map((w, i) => `${i + 1}. ${w}`).join("\n")}\n\nCounter-Arguments:\n${result.counterArguments.map((c, i) => `${i + 1}. ${c.title}: ${c.argument}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setArgument("");
    setResult(null);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Minimal Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Devil's Advocate</h1>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            {/* Intensity Selector */}
            <div className="relative">
              <button
                onClick={() => { setShowIntensity(!showIntensity); setShowSettings(false); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="font-medium">{INTENSITY_LEVELS.find(i => i.value === intensity)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showIntensity && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-[200px]">
                  {INTENSITY_LEVELS.map(i => (
                    <button
                      key={i.value}
                      onClick={() => { setIntensity(i.value); setShowIntensity(false); }}
                      className={cn(
                        "w-full p-2.5 text-left hover:bg-gray-50 transition-colors rounded-lg",
                        intensity === i.value && "bg-blue-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={cn("text-sm font-medium", intensity === i.value && "text-blue-600")}>
                          {i.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{i.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => { setShowSettings(!showSettings); setShowIntensity(false); }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showSettings && (
                <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 px-3 z-30 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">Type:</span>
                    <select 
                      value={argumentType} 
                      onChange={(e) => setArgumentType(e.target.value)} 
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 flex-1"
                    >
                      {ARGUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Model:</span>
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleChallenge}
            disabled={isLoading || !argument.trim()}
            className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Swords className="w-4 h-4 mr-1.5" /> Challenge</>}
          </Button>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Your Argument</span>
              {argument && (
                <span className="text-xs text-gray-400">{wordCount} words</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {argument && (
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
              {argument && (
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
          <div className="flex-1 p-6 overflow-y-auto relative">
            {!argument && (
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
              value={argument}
              onChange={(e) => { setArgument(e.target.value); setResult(null); }}
              placeholder="Enter the argument, thesis, or position you want challenged..."
              className="h-full resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 bg-transparent transition-none"
              style={{ transition: 'none' }}
            />
          </div>
        </div>

        {/* Right - Results */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            {result && (
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("counter")}
                  className={cn("px-4 py-2 text-sm font-medium rounded-lg", activeTab === "counter" ? "bg-purple-100 text-purple-700" : "text-gray-500 hover:bg-gray-100")}
                >
                  Counter-Arguments
                </button>
                <button
                  onClick={() => setActiveTab("strengthen")}
                  className={cn("px-4 py-2 text-sm font-medium rounded-lg", activeTab === "strengthen" ? "bg-purple-100 text-purple-700" : "text-gray-500 hover:bg-gray-100")}
                >
                  Strengthen
                </button>
              </div>
            )}
            {!result && <span className="text-sm font-medium text-gray-900">Analysis</span>}
            {result && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={copyResult} className="h-7 px-2 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="h-7 px-2 rounded-lg">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {result ? (
              <div className="space-y-6">
                {activeTab === "counter" ? (
                  <>
                    {/* Summary */}
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">Analysis Summary</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                    </div>

                    {/* Weaknesses */}
                    <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-semibold text-red-800">Key Weaknesses ({result.weaknesses.length})</span>
                      </div>
                      <ul className="space-y-3">
                        {result.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                            <ThumbsDown className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Counter Arguments */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">Counter-Arguments ({result.counterArguments.length})</span>
                      </div>
                      {result.counterArguments.map((ca, i) => (
                        <div key={i} className="p-5 bg-white rounded-xl border border-gray-200">
                          <p className="text-sm font-semibold text-gray-900 mb-3">{ca.title}</p>
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">{ca.argument}</p>
                          {ca.evidence && (
                            <div className="p-3 bg-blue-50 rounded-lg mb-3">
                              <p className="text-xs text-blue-700 flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" /> 
                                <span className="font-medium">Evidence:</span> {ca.evidence}
                              </p>
                            </div>
                          )}
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600 flex items-start gap-2">
                              <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" /> 
                              <span><span className="font-medium">How to defend:</span> {ca.weakness}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Blind Spots */}
                    {result.blindSpots && result.blindSpots.length > 0 && (
                      <div className="p-5 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Lightbulb className="w-5 h-5 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800">Blind Spots ({result.blindSpots.length})</span>
                        </div>
                        <ul className="space-y-3">
                          {result.blindSpots.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                              <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Strengthened Version */}
                    {result.strengthenedVersion && (
                      <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-800">Strengthened Argument</span>
                        </div>
                        <div className="text-sm text-green-700 prose prose-sm max-w-none leading-relaxed">
                          <ReactMarkdown>{result.strengthenedVersion}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Additional Considerations */}
                    {result.additionalConsiderations && result.additionalConsiderations.length > 0 && (
                      <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-2 mb-4">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">Additional Points to Consider ({result.additionalConsiderations.length})</span>
                        </div>
                        <ul className="space-y-3">
                          {result.additionalConsiderations.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                              <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Defense Strategies */}
                    <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">Defense Strategies</span>
                      </div>
                      <div className="space-y-3">
                        {result.counterArguments.map((ca, i) => (
                          <div key={i} className="p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 mb-2 font-medium">Against: {ca.title}</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{ca.weakness}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-600 font-medium">Analyzing argument...</p>
                    <p className="text-xs text-gray-400 mt-1">Finding counter-points and weaknesses</p>
                  </div>
                ) : (
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                      <Scale className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Analysis results will appear here</p>
                    <p className="text-xs text-gray-400 mt-2">Enter your argument and click Challenge to get counter-arguments</p>
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
