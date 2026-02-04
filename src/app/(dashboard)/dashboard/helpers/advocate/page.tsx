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
  Scale, Loader2, Sparkles, Copy, Check, FileText, Trash2, 
  ThumbsDown, Lightbulb, X, History, MessageSquare, Send,
  ArrowRight, RefreshCw, Shield, AlertTriangle, Target,
  Swords, BookOpen, Zap, ChevronDown, BarChart3
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
  
  // UI states
  const [activeTab, setActiveTab] = useState<"counter" | "strengthen">("counter");
  const [showSettings, setShowSettings] = useState(false);
  
  // Feature states
  const [history, setHistory] = usePersistedState<AdvocateHistory[]>("advocate-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

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

      // Save to history
      const historyItem: AdvocateHistory = {
        id: Date.now().toString(),
        argumentPreview: argument.substring(0, 60) + "...",
        intensity,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Challenge failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new Event("credits-updated"));
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a devil's advocate and critical thinking expert. Help debate and strengthen arguments. Current argument: ${argument.substring(0, 300)}` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
          feature: "answer",
          model: "fast",
          language: aiLanguage || "en",
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      let content = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      setChatMessages(prev => [...prev, { role: "assistant", content }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't process your request." }]);
    } finally {
      setIsChatLoading(false);
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
    setChatMessages([]);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Devil's Advocate</h1>
            <p className="text-xs text-gray-500">Challenge and strengthen your arguments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className={cn("h-8 rounded-lg", showHistory && "bg-blue-50 text-blue-600")}>
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)} className={cn("h-8 rounded-lg", showChat && "bg-blue-50 text-blue-600")}>
            <MessageSquare className="w-4 h-4" />
          </Button>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 5 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-900">Your Argument</span>
                <span className="text-xs text-gray-400">{wordCount} words</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-2 rounded-lg">
                  <FileText className="w-3.5 h-3.5" />
                </Button>
                <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                {argument && (
                  <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 rounded-lg text-gray-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              value={argument}
              onChange={(e) => { setArgument(e.target.value); setResult(null); }}
              placeholder="Enter the argument, thesis, or position you want challenged...

Example:
'Remote work is more productive than office work because employees have fewer distractions and can work during their peak hours.'"
              className="min-h-[200px] resize-none border-gray-200 rounded-xl"
            />
          </div>

          {/* Intensity Selector */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Swords className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Challenge Intensity</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {INTENSITY_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => setIntensity(level.value)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    intensity === level.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p className={cn("text-sm font-medium", intensity === level.value ? "text-purple-700" : "text-gray-900")}>{level.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{level.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <button onClick={() => setShowSettings(!showSettings)} className="p-4 bg-white border-b border-gray-100 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Advanced Settings</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showSettings && "rotate-180")} />
          </button>
          {showSettings && (
            <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Type:</span>
                <select value={argumentType} onChange={(e) => setArgumentType(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                  {ARGUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Model:</span>
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex-1" />
          <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-end">
            <Button onClick={handleChallenge} disabled={isLoading || !argument.trim()} className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Swords className="w-4 h-4 mr-2" /> Challenge</>}
            </Button>
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
          <div className="flex-1 overflow-y-auto p-6">
            {result ? (
              <div className="space-y-5">
                {activeTab === "counter" ? (
                  <>
                    {/* Summary */}
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-800">Analysis Summary</span>
                      </div>
                      <p className="text-sm text-purple-700">{result.summary}</p>
                    </div>

                    {/* Weaknesses */}
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-800">Key Weaknesses</span>
                      </div>
                      <ul className="space-y-2">
                        {result.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                            <ThumbsDown className="w-3 h-3 mt-1 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Counter Arguments */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Swords className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-800">Counter-Arguments</span>
                      </div>
                      {result.counterArguments.map((ca, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-sm font-semibold text-gray-900 mb-2">{ca.title}</p>
                          <p className="text-sm text-gray-700 mb-2">{ca.argument}</p>
                          {ca.evidence && (
                            <p className="text-xs text-blue-600 mb-2 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" /> {ca.evidence}
                            </p>
                          )}
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> How to defend: {ca.weakness}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Blind Spots */}
                    {result.blindSpots && result.blindSpots.length > 0 && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800">Blind Spots</span>
                        </div>
                        <ul className="space-y-2">
                          {result.blindSpots.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                              <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                              {b}
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
                      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-800">Strengthened Argument</span>
                        </div>
                        <div className="text-sm text-green-700 prose prose-sm max-w-none">
                          <ReactMarkdown>{result.strengthenedVersion}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Additional Considerations */}
                    {result.additionalConsiderations && result.additionalConsiderations.length > 0 && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">Additional Points to Consider</span>
                        </div>
                        <ul className="space-y-2">
                          {result.additionalConsiderations.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                              <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* How to defend */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-800">Defense Strategies</span>
                      </div>
                      <div className="space-y-2">
                        {result.counterArguments.map((ca, i) => (
                          <div key={i} className="p-3 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Against: {ca.title}</p>
                            <p className="text-sm text-gray-700">{ca.weakness}</p>
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
                    <Scale className="w-12 h-12 text-purple-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600 font-medium">Analyzing argument...</p>
                    <p className="text-xs text-gray-400 mt-1">Finding counter-points</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Scale className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Enter argument and click Challenge</p>
                    <p className="text-xs text-gray-300 mt-1">Get counter-arguments instantly</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="w-64 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">History</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No history yet</p>
              ) : (
                history.map(h => (
                  <div key={h.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-purple-600 font-medium">{h.intensity}</span>
                      <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{h.argumentPreview}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">Debate Assistant</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Scale className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Discuss your argument</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("max-w-[90%] p-3 rounded-2xl text-sm", msg.role === "user" ? "ml-auto bg-purple-600 text-white" : "bg-gray-100 text-gray-700")}>
                  {msg.content}
                </div>
              ))}
              {isChatLoading && <div className="bg-gray-100 p-3 rounded-2xl w-fit"><Loader2 className="w-4 h-4 animate-spin" /></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="How can I defend this?"
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Button onClick={handleChatSubmit} size="sm" className="rounded-xl px-3 bg-purple-600 hover:bg-purple-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
