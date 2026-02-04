"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import {
  BookOpen, Loader2, Sparkles, Copy, Check, FileText, Trash2, 
  Lightbulb, X, History, MessageSquare, Send, ArrowRight, RefreshCw,
  Zap, GraduationCap, Volume2, ArrowLeftRight, Star, Bookmark,
  ChevronDown, Download, Eye, RotateCcw
} from "lucide-react";

interface VocabHistory {
  id: string;
  textPreview: string;
  level: string;
  timestamp: number;
}

interface WordUpgrade {
  original: string;
  upgraded: string;
  definition?: string;
  example?: string;
  synonyms?: string[];
}

interface VocabResult {
  upgradedText: string;
  wordChanges: WordUpgrade[];
  readabilityScore?: {
    before: number;
    after: number;
  };
  newVocabCount: number;
}

const VOCABULARY_LEVELS = [
  { value: "academic", label: "Academic", desc: "University level" },
  { value: "professional", label: "Professional", desc: "Business/formal" },
  { value: "advanced", label: "Advanced", desc: "Sophisticated" },
  { value: "literary", label: "Literary", desc: "Artistic/poetic" },
];

const SUBJECT_AREAS = [
  { value: "general", label: "General" },
  { value: "science", label: "Science" },
  { value: "business", label: "Business" },
  { value: "law", label: "Law" },
  { value: "medicine", label: "Medicine" },
  { value: "technology", label: "Technology" },
  { value: "humanities", label: "Humanities" },
];

export default function VocabularyUpgraderPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [text, setText] = usePersistedState("vocab-text", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("vocab-model", "fast");
  const [level, setLevel] = usePersistedState("vocab-level", "academic");
  const [subject, setSubject] = useState("general");
  
  // Result states
  const [result, setResult] = useState<VocabResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // UI states
  const [showDiff, setShowDiff] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordUpgrade | null>(null);
  const [savedWords, setSavedWords] = usePersistedState<WordUpgrade[]>("vocab-saved", []);
  
  // Feature states
  const [history, setHistory] = usePersistedState<VocabHistory[]>("vocab-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showWordBook, setShowWordBook] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const handleUpgrade = async () => {
    if (!text.trim()) {
      toast({ title: "Please enter text to upgrade", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          level,
          subject,
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
      const historyItem: VocabHistory = {
        id: Date.now().toString(),
        textPreview: text.substring(0, 60) + "...",
        level,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Upgrade failed", variant: "destructive" });
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
            { role: "system", content: `You are a vocabulary and language expert. Help users understand advanced vocabulary and improve their writing. Current text: ${text.substring(0, 200)}` },
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
      setText(e.target?.result as string);
      setResult(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyUpgraded = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.upgradedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveWord = (word: WordUpgrade) => {
    if (!savedWords.find(w => w.original === word.original)) {
      setSavedWords(prev => [...prev, word]);
      toast({ title: `"${word.upgraded}" saved to word book` });
    }
  };

  const applyUpgraded = () => {
    if (result) {
      setText(result.upgradedText);
      setResult(null);
    }
  };

  const exportWordList = () => {
    if (!result) return;
    const content = result.wordChanges.map(w => 
      `${w.original} → ${w.upgraded}\n  Definition: ${w.definition || "N/A"}\n  Example: ${w.example || "N/A"}`
    ).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocabulary_${Date.now()}.txt`;
    a.click();
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
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Vocabulary Upgrader</h1>
            <p className="text-xs text-gray-500">Elevate your writing with advanced vocabulary</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowWordBook(!showWordBook)} className={cn("h-8 rounded-lg", showWordBook && "bg-blue-50 text-blue-600")}>
            <Bookmark className="w-4 h-4" />
            {savedWords.length > 0 && <span className="ml-1 text-xs">{savedWords.length}</span>}
          </Button>
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
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-gray-900">Original Text</span>
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
            <Textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); }}
              placeholder="Enter your text here to upgrade the vocabulary...

Example:
'The results were good and showed that our approach worked well. We found that the method was better than the old one.'"
              className="min-h-[200px] resize-none border-gray-200 rounded-xl"
            />
          </div>

          {/* Level Selector */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Vocabulary Level</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {VOCABULARY_LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all",
                    level === l.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p className={cn("text-sm font-medium", level === l.value ? "text-emerald-700" : "text-gray-900")}>{l.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <button onClick={() => setShowSettings(!showSettings)} className="p-4 bg-white border-b border-gray-100 flex items-center justify-between hover:bg-gray-50">
            <span className="text-sm font-medium text-gray-900">Advanced Settings</span>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showSettings && "rotate-180")} />
          </button>
          {showSettings && (
            <div className="p-4 bg-white border-b border-gray-100 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Subject:</span>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
                  {SUBJECT_AREAS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
            <Button onClick={handleUpgrade} disabled={isLoading || !text.trim()} className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-2" /> Upgrade</>}
            </Button>
          </div>
        </div>

        {/* Right - Results */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Enhanced Text</span>
              {result && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  +{result.newVocabCount} words upgraded
                </span>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowDiff(!showDiff)} className={cn("h-7 px-2 rounded-lg", showDiff && "bg-blue-50 text-blue-600")}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={copyUpgraded} className="h-7 px-2 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportWordList} className="h-7 px-2 rounded-lg">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={applyUpgraded} className="h-7 px-2 rounded-lg">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {result ? (
              <div className="p-6 space-y-6">
                {/* Readability Score */}
                {result.readabilityScore && (
                  <div className="flex gap-4">
                    <div className="flex-1 p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Before</p>
                      <p className="text-2xl font-bold text-gray-400">{result.readabilityScore.before}</p>
                    </div>
                    <div className="flex-1 p-4 bg-emerald-50 rounded-xl">
                      <p className="text-xs text-emerald-600 mb-1">After</p>
                      <p className="text-2xl font-bold text-emerald-600">{result.readabilityScore.after}</p>
                    </div>
                  </div>
                )}

                {/* Upgraded Text */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{result.upgradedText}</p>
                </div>

                {/* Word Changes */}
                {showDiff && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Star className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-gray-900">Word Upgrades ({result.wordChanges.length})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {result.wordChanges.map((wc, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedWord(selectedWord?.original === wc.original ? null : wc)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all",
                            selectedWord?.original === wc.original
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-100 hover:border-gray-200 bg-gray-50"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-400 line-through">{wc.original}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="text-sm font-semibold text-emerald-700">{wc.upgraded}</span>
                          </div>
                          {selectedWord?.original === wc.original && wc.definition && (
                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                              <p className="text-xs text-gray-600">{wc.definition}</p>
                              {wc.example && <p className="text-xs text-gray-500 italic">e.g., "{wc.example}"</p>}
                              {wc.synonyms && wc.synonyms.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {wc.synonyms.map((s, j) => (
                                    <span key={j} className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">{s}</span>
                                  ))}
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); saveWord(wc); }}
                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                              >
                                <Bookmark className="w-3 h-3" /> Save to Word Book
                              </button>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={applyUpgraded} className="flex-1 rounded-xl">
                    <ArrowLeftRight className="w-4 h-4 mr-2" /> Use This Version
                  </Button>
                  <Button variant="outline" onClick={() => setResult(null)} className="flex-1 rounded-xl">
                    <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                {isLoading ? (
                  <div className="text-center">
                    <BookOpen className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600 font-medium">Upgrading vocabulary...</p>
                    <p className="text-xs text-gray-400 mt-1">Finding better words</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <GraduationCap className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Enter text and click Upgrade</p>
                    <p className="text-xs text-gray-300 mt-1">Elevate your writing</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Word Book Panel */}
        {showWordBook && (
          <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">Word Book ({savedWords.length})</span>
              <button onClick={() => setShowWordBook(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {savedWords.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No saved words</p>
                  <p className="text-xs text-gray-300 mt-1">Click on upgrades to save</p>
                </div>
              ) : (
                savedWords.map((w, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-emerald-700">{w.upgraded}</span>
                      <button onClick={() => setSavedWords(prev => prev.filter(sw => sw.original !== w.original))} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">{w.original}</p>
                    {w.definition && <p className="text-xs text-gray-600 mt-1">{w.definition}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

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
                      <span className="text-xs text-emerald-600 font-medium">{h.level}</span>
                      <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{h.textPreview}</p>
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
              <span className="font-medium text-gray-900 text-sm">Vocabulary Helper</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Ask about vocabulary</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("max-w-[90%] p-3 rounded-2xl text-sm", msg.role === "user" ? "ml-auto bg-emerald-600 text-white" : "bg-gray-100 text-gray-700")}>
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
                  placeholder="What does 'elucidate' mean?"
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button onClick={handleChatSubmit} size="sm" className="rounded-xl px-3 bg-emerald-600 hover:bg-emerald-700">
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
