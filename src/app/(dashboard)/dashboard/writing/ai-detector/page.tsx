"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Sparkles, Scan,
  FileText, X, Trash2, Target, Lightbulb, Zap, Copy, Check, Download,
  History, MessageSquare, Send, RefreshCw, Eye, BarChart3, Wand2
} from "lucide-react";

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

interface DetectionHistory {
  id: string;
  preview: string;
  aiScore: number;
  humanScore: number;
  timestamp: number;
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
  
  // Feature states
  const [history, setHistory] = usePersistedState<DetectionHistory[]>("detect-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [showIndicators, setShowIndicators] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasResult = !!result;

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

      // Save to history
      const historyItem: DetectionHistory = {
        id: Date.now().toString(),
        preview: text.substring(0, 50) + "...",
        aiScore: data.aiScore,
        humanScore: data.humanScore,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      const words = text.split(/\s+/).length;
      const credits = Math.max(3, Math.ceil(words / 1000) * 3);
      window.dispatchEvent(new CustomEvent("credits-updated", { detail: { amount: credits } }));
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
            { role: "system", content: `You are an AI detection expert. Help the user understand AI detection and how to make their writing more human-like. Current text AI score: ${result?.aiScore || "unknown"}%` },
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

  const getScoreColor = (score: number, isAI: boolean) => {
    if (isAI) {
      if (score >= 60) return { bg: "bg-red-500", text: "text-red-600", light: "bg-red-50" };
      if (score >= 40) return { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" };
      return { bg: "bg-green-500", text: "text-green-600", light: "bg-green-50" };
    }
    return { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" };
  };

  const reset = () => {
    setText("");
    setResult(null);
    setChatMessages([]);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">AI Detector</h1>
            <p className="text-xs text-gray-500">Analyze content for AI patterns</p>
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
            <Sparkles className="w-3 h-3" /> 3 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Input Text</span>
              <span className="text-xs text-gray-400">{wordCount} words</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-2 rounded-lg">
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              {text && (
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 rounded-lg text-gray-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 p-4">
            <Textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); }}
              placeholder="Paste your text here to check for AI-generated content...

Minimum 50 characters required."
              className="h-full resize-none border-0 shadow-none focus-visible:ring-0 text-base"
            />
          </div>
          <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              </div>
              <Button variant="outline" size="sm" onClick={handleHumanize} disabled={isHumanizing || !text.trim()} className="h-9 rounded-lg">
                {isHumanizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-1" /> Humanize</>}
              </Button>
            </div>
            <Button onClick={handleAnalyze} disabled={isLoading || text.trim().length < 50} className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Target className="w-4 h-4 mr-2" /> Analyze</>}
            </Button>
          </div>
        </div>

        {/* Right - Results */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Detection Results</span>
            {result && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={copyReport} className="h-7 px-2 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportReport} className="h-7 px-2 rounded-lg">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowIndicators(!showIndicators)} className={cn("h-7 px-2 rounded-lg", showIndicators && "bg-blue-50 text-blue-600")}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {result ? (
              <div className="space-y-6">
                {/* Score Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("p-5 rounded-2xl", getScoreColor(result.aiScore, true).light)}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={cn("w-4 h-4", getScoreColor(result.aiScore, true).text)} />
                      <span className="text-xs font-medium text-gray-600">AI Detected</span>
                    </div>
                    <p className={cn("text-4xl font-bold", getScoreColor(result.aiScore, true).text)}>{result.aiScore}%</p>
                    <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", getScoreColor(result.aiScore, true).bg)} style={{ width: `${result.aiScore}%` }} />
                    </div>
                  </div>
                  <div className={cn("p-5 rounded-2xl", getScoreColor(result.humanScore, false).light)}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-gray-600">Human Written</span>
                    </div>
                    <p className="text-4xl font-bold text-blue-600">{result.humanScore}%</p>
                    <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${result.humanScore}%` }} />
                    </div>
                  </div>
                </div>

                {/* Analysis */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Analysis</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.analysis}</p>
                </div>

                {/* Indicators */}
                {showIndicators && result.indicators && result.indicators.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">AI Indicators Found ({result.indicators.length})</span>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {result.indicators.map((ind, i) => (
                        <div key={i} className="p-3 bg-white rounded-lg">
                          <p className="text-sm text-red-700 font-medium">"{ind.text.substring(0, 50)}{ind.text.length > 50 ? "..." : ""}"</p>
                          <p className="text-xs text-gray-500 mt-1">{ind.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Improvement Suggestions</span>
                    </div>
                    <ul className="space-y-2">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                          <Zap className="w-3 h-3 mt-1 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleHumanize} disabled={isHumanizing} className="flex-1 rounded-xl">
                    {isHumanizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-2" /> Auto-Humanize</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setResult(null); }} className="flex-1 rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-2" /> Re-analyze
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Scan className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600 font-medium">Analyzing content...</p>
                    <p className="text-xs text-gray-400 mt-1">Checking for AI patterns</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Paste text and click Analyze</p>
                    <p className="text-xs text-gray-300 mt-1">Minimum 50 characters</p>
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
                      <span className={cn("text-xs font-bold", h.aiScore >= 50 ? "text-red-600" : "text-green-600")}>
                        {h.aiScore}% AI
                      </span>
                      <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{h.preview}</p>
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
              <span className="font-medium text-gray-900 text-sm">AI Detection Help</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Ask how to improve your score</p>
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
                  placeholder="How can I reduce AI score?"
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
