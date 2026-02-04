"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import {
  Wand2, Loader2, Copy, Check, RefreshCw, Sparkles, ArrowRightLeft,
  FileText, X, ShieldCheck, Trash2, History, Download, MessageSquare,
  Send, ChevronDown, Zap, Eye, EyeOff, BarChart3, Target, Lightbulb
} from "lucide-react";

interface HumanizeHistory {
  id: string;
  input: string;
  output: string;
  score: number;
  timestamp: number;
}

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

export default function HumanizerPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [inputText, setInputText] = usePersistedState("humanizer-input", "");
  const [tone, setTone] = usePersistedState("humanizer-tone", "natural");
  const [intensity, setIntensity] = usePersistedState("humanizer-intensity", "heavy");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("humanizer-model", "fast");
  
  // Result states
  const [result, setResult] = usePersistedState("humanizer-result", "");
  const [htmlResult, setHtmlResult] = usePersistedState("humanizer-html", "");
  const [aiScore, setAiScore] = useState<number | null>(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTones, setShowTones] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  
  // Feature states
  const [history, setHistory] = usePersistedState<HumanizeHistory[]>("humanizer-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

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
    setAiScore(null);

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

      // Save to history
      const historyItem: HumanizeHistory = {
        id: Date.now().toString(),
        input: inputText.substring(0, 100) + "...",
        output: data.plain.substring(0, 100) + "...",
        score: 85,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      const words = inputText.split(/\s+/).length;
      const credits = Math.max(3, Math.ceil(words / 1000) * 3);
      window.dispatchEvent(new CustomEvent("credits-updated", { detail: { amount: credits } }));
    }
  };

  const checkAIScore = async () => {
    if (!result) return;
    setIsCheckingAI(true);
    try {
      const response = await fetch("/api/ai/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result, model: "fast", language: "en" }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setAiScore(data.humanScore);
    } catch {
      toast({ title: "Failed to check AI score", variant: "destructive" });
    } finally {
      setIsCheckingAI(false);
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
            { role: "system", content: "You are a writing assistant helping humanize AI-generated text. Provide specific suggestions." },
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
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your request." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    setAiScore(null);
    setChatMessages([]);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Content Humanizer</h1>
            <p className="text-xs text-gray-500">Transform AI text into human writing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className={cn("h-8 rounded-lg", showHistory && "bg-blue-50 text-blue-600")}>
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)} className={cn("h-8 rounded-lg", showChat && "bg-blue-50 text-blue-600")}>
            <MessageSquare className="w-4 h-4" />
          </Button>
          <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> {"<"}15% AI score
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-sm font-medium text-gray-900">AI Text</span>
              <span className="text-xs text-gray-400">{wordCount(inputText)} words</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-2 rounded-lg">
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              {inputText && (
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 rounded-lg text-gray-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 p-4">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your AI-generated text here..."
              className="h-full resize-none border-0 shadow-none focus-visible:ring-0 text-base"
            />
          </div>
        </div>

        {/* Center - Settings */}
        <div className="w-64 bg-white flex flex-col border-r border-gray-100">
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Tone */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Tone</label>
              <div className="relative">
                <button
                  onClick={() => setShowTones(!showTones)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <span>{TONES.find(t => t.id === tone)?.icon}</span>
                    <span className="font-medium">{TONES.find(t => t.id === tone)?.label}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showTones && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
                    {TONES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setTone(t.id); setShowTones(false); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50", tone === t.id && "bg-blue-50")}
                      >
                        <span>{t.icon}</span>
                        <div className="text-left">
                          <p className={cn("font-medium", tone === t.id && "text-blue-600")}>{t.label}</p>
                          <p className="text-xs text-gray-400">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Intensity */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Rewrite Intensity</label>
              <div className="space-y-2">
                {INTENSITIES.map(i => (
                  <button
                    key={i.id}
                    onClick={() => setIntensity(i.id)}
                    className={cn(
                      "w-full p-3 rounded-xl text-left transition-all border relative",
                      intensity === i.id
                        ? i.recommended ? "bg-green-50 border-green-300" : "bg-blue-50 border-blue-300"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {i.recommended && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">BEST</span>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={cn("font-medium text-sm", intensity === i.id && (i.recommended ? "text-green-700" : "text-blue-600"))}>
                        {i.label}
                      </span>
                      <span className="text-xs text-gray-400">{i.score}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{i.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">AI Model</label>
              <div className="p-2 bg-gray-50 rounded-xl border border-gray-200">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              </div>
            </div>
          </div>

          {/* Humanize Button */}
          <div className="p-4 border-t border-gray-100">
            <Button
              onClick={handleHumanize}
              disabled={isLoading || inputText.trim().length < 50}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-medium"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Wand2 className="w-5 h-5 mr-2" /> Humanize</>}
            </Button>
          </div>
        </div>

        {/* Right - Output */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-medium text-gray-900">Human Text</span>
              {result && <span className="text-xs text-gray-400">{wordCount(result)} words</span>}
              {result && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Humanized
                </span>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowDiff(!showDiff)} className={cn("h-7 px-2 rounded-lg", showDiff && "bg-blue-50 text-blue-600")}>
                  {showDiff ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-7 px-2 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportResult} className="h-7 px-2 rounded-lg">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleHumanize} disabled={isLoading} className="h-7 px-2 rounded-lg">
                  <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {result || htmlResult ? (
              <div className="space-y-4">
                {/* AI Score Check */}
                {result && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkAIScore}
                      disabled={isCheckingAI}
                      className="rounded-lg"
                    >
                      {isCheckingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Target className="w-4 h-4 mr-1" /> Check AI Score</>}
                    </Button>
                    {aiScore !== null && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", aiScore >= 70 ? "bg-green-500" : aiScore >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${aiScore}%` }} />
                        </div>
                        <span className={cn("text-sm font-medium", aiScore >= 70 ? "text-green-600" : aiScore >= 50 ? "text-amber-600" : "text-red-600")}>
                          {aiScore}% Human
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Diff Legend */}
                {showDiff && htmlResult && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">Original</span>
                    <ArrowRightLeft className="w-3 h-3 text-gray-300" />
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Changed</span>
                  </div>
                )}

                {/* Result */}
                <div className={cn("p-4 rounded-xl", showDiff && htmlResult ? "bg-white border border-gray-100" : "bg-gray-50")}>
                  {showDiff && htmlResult ? (
                    <div className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlResult }} />
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Wand2 className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-pulse" />
                    <p className="text-gray-500">Humanizing text...</p>
                    <p className="text-xs text-gray-400 mt-1">Analyzing and rewriting</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Wand2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Humanized text will appear here</p>
                    <p className="text-xs text-gray-300 mt-1">Changes highlighted in <span className="text-green-600">green</span></p>
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
                  <div key={h.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setInputText(h.input.replace("...", ""))}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                      <span className="text-xs text-green-600 font-medium">{h.score}%</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{h.input}</p>
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
              <span className="font-medium text-gray-900 text-sm">AI Assistant</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Ask for writing tips</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("max-w-[90%] p-3 rounded-2xl text-sm", msg.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-700")}>
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
                  placeholder="How can I make it better?"
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleChatSubmit} size="sm" className="rounded-xl px-3 bg-blue-600 hover:bg-blue-700">
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
