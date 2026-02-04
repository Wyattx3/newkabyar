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
  AlertCircle, Loader2, Sparkles, Copy, Check, FileText, Trash2, 
  Bug, Lightbulb, Code2, X, History, MessageSquare, Send, Zap,
  Terminal, BookOpen, ArrowRight, ChevronDown, ChevronUp, RefreshCw
} from "lucide-react";

interface ErrorHistory {
  id: string;
  errorPreview: string;
  language: string;
  timestamp: number;
}

interface ExplainedError {
  summary: string;
  cause: string;
  solution: string;
  codeExample?: string;
  preventionTips?: string[];
  relatedErrors?: string[];
}

const LANGUAGES = [
  { value: "auto", label: "Auto-Detect" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
];

const ERROR_TYPES = [
  { value: "runtime", label: "Runtime Error" },
  { value: "syntax", label: "Syntax Error" },
  { value: "type", label: "Type Error" },
  { value: "logic", label: "Logic Error" },
  { value: "network", label: "Network Error" },
  { value: "database", label: "Database Error" },
];

export default function ExplainErrorPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [errorMessage, setErrorMessage] = usePersistedState("error-message", "");
  const [codeContext, setCodeContext] = usePersistedState("error-context", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("error-model", "fast");
  const [language, setLanguage] = usePersistedState("error-lang", "auto");
  const [errorType, setErrorType] = useState("runtime");
  
  // Result states
  const [result, setResult] = useState<ExplainedError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // UI states
  const [showContext, setShowContext] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("all");
  
  // Feature states
  const [history, setHistory] = usePersistedState<ErrorHistory[]>("error-history", []);
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

  const handleExplain = async () => {
    if (!errorMessage.trim()) {
      toast({ title: "Please enter an error message", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: errorMessage,
          code: codeContext || undefined,
          language: language === "auto" ? undefined : language,
          errorType,
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
      const historyItem: ErrorHistory = {
        id: Date.now().toString(),
        errorPreview: errorMessage.substring(0, 60) + "...",
        language: language === "auto" ? "auto" : language,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Error explanation failed", variant: "destructive" });
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
            { role: "system", content: `You are a debugging expert. Help explain errors and provide solutions. Current error: ${errorMessage.substring(0, 300)}` },
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
      const content = e.target?.result as string;
      // Try to detect if it's an error log or code
      if (content.includes("Error") || content.includes("Exception") || content.includes("Traceback")) {
        setErrorMessage(content);
      } else {
        setCodeContext(content);
        setShowContext(true);
      }
      setResult(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copySolution = () => {
    if (!result) return;
    const text = `Error: ${result.summary}\n\nCause: ${result.cause}\n\nSolution: ${result.solution}${result.codeExample ? `\n\nCode Example:\n${result.codeExample}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setErrorMessage("");
    setCodeContext("");
    setResult(null);
    setChatMessages([]);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Bug className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Explain Error</h1>
            <p className="text-xs text-gray-500">Understand and fix any error</p>
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
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-900">Error Message</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-2 rounded-lg">
                  <FileText className="w-3.5 h-3.5" />
                </Button>
                <input ref={fileInputRef} type="file" accept=".txt,.log,.md" onChange={handleFileUpload} className="hidden" />
                {errorMessage && (
                  <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 rounded-lg text-gray-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              value={errorMessage}
              onChange={(e) => { setErrorMessage(e.target.value); setResult(null); }}
              placeholder="Paste your error message, stack trace, or exception here...

Example:
TypeError: Cannot read properties of undefined (reading 'map')
    at Component.render (./src/App.js:15:23)"
              className="min-h-[150px] resize-none border-gray-200 rounded-xl font-mono text-sm text-red-600 bg-red-50/50"
            />
          </div>

          {/* Code Context */}
          <div className="p-4 bg-white border-b border-gray-100">
            <button onClick={() => setShowContext(!showContext)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">Code Context</span>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              {showContext ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showContext && (
              <Textarea
                value={codeContext}
                onChange={(e) => setCodeContext(e.target.value)}
                placeholder="Paste the related code here for better context..."
                className="mt-3 min-h-[100px] resize-none border-gray-200 rounded-xl font-mono text-sm"
              />
            )}
          </div>

          {/* Options */}
          <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Language:</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Type:</span>
              <select value={errorType} onChange={(e) => setErrorType(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                {ERROR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Model:</span>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex-1" />
          <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setShowContext(!showContext)} className="h-8 rounded-lg">
              <Code2 className="w-4 h-4 mr-1" /> {showContext ? "Hide" : "Add"} Context
            </Button>
            <Button onClick={handleExplain} disabled={isLoading || !errorMessage.trim()} className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lightbulb className="w-4 h-4 mr-2" /> Explain</>}
            </Button>
          </div>
        </div>

        {/* Right - Results */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Explanation</span>
            {result && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={copySolution} className="h-7 px-2 rounded-lg">
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
                {/* Summary */}
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Error Summary</span>
                  </div>
                  <p className="text-sm text-red-700">{result.summary}</p>
                </div>

                {/* Cause */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">Root Cause</span>
                  </div>
                  <p className="text-sm text-amber-700">{result.cause}</p>
                </div>

                {/* Solution */}
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Solution</span>
                  </div>
                  <div className="text-sm text-green-700 prose prose-sm max-w-none">
                    <ReactMarkdown>{result.solution}</ReactMarkdown>
                  </div>
                </div>

                {/* Code Example */}
                {result.codeExample && (
                  <div className="p-4 bg-gray-900 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Code2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-gray-200">Fixed Code</span>
                    </div>
                    <pre className="text-sm text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{result.codeExample}</pre>
                  </div>
                )}

                {/* Prevention Tips */}
                {result.preventionTips && result.preventionTips.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">Prevention Tips</span>
                    </div>
                    <ul className="space-y-2">
                      {result.preventionTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                          <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related Errors */}
                {result.relatedErrors && result.relatedErrors.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-700">Related Errors</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.relatedErrors.map((err, i) => (
                        <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">{err}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Bug className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600 font-medium">Analyzing error...</p>
                    <p className="text-xs text-gray-400 mt-1">Finding solution</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Bug className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Paste error and click Explain</p>
                    <p className="text-xs text-gray-300 mt-1">Get instant solutions</p>
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
                      <span className="text-xs text-red-600 font-medium">{h.language}</span>
                      <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 font-mono">{h.errorPreview}</p>
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
              <span className="font-medium text-gray-900 text-sm">Debug Assistant</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Ask about the error</p>
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
                  placeholder="Why does this error happen?"
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
