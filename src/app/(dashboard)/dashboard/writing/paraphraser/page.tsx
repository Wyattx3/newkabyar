"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import { 
  RefreshCw, Loader2, Sparkles, Copy, Check, Wand2, ChevronDown,
  FileText, History, Download, Share2, Languages, Sliders, BookOpen,
  MessageSquare, Send, X, RotateCcw, Diff, ArrowLeftRight, Zap
} from "lucide-react";

interface ParaphraseHistory {
  id: string;
  original: string;
  paraphrased: string;
  style: string;
  timestamp: number;
}

const STYLES = [
  { id: "academic", label: "Academic", desc: "Formal & scholarly", icon: "🎓" },
  { id: "simple", label: "Simple", desc: "Easy to understand", icon: "✨" },
  { id: "creative", label: "Creative", desc: "Engaging & fresh", icon: "🎨" },
  { id: "formal", label: "Formal", desc: "Professional tone", icon: "👔" },
  { id: "casual", label: "Casual", desc: "Conversational", icon: "💬" },
  { id: "concise", label: "Concise", desc: "Shorter & direct", icon: "⚡" },
  { id: "elaborate", label: "Elaborate", desc: "More detailed", icon: "📝" },
  { id: "persuasive", label: "Persuasive", desc: "Convincing tone", icon: "🎯" },
];

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "my", label: "Myanmar" },
  { id: "zh", label: "Chinese" },
  { id: "ja", label: "Japanese" },
  { id: "ko", label: "Korean" },
  { id: "th", label: "Thai" },
];

export default function ParaphraserPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [text, setText] = usePersistedState("paraphrase-text", "");
  const [style, setStyle] = usePersistedState("paraphrase-style", "academic");
  const [preserveLength, setPreserveLength] = usePersistedState("paraphrase-length", true);
  const [targetLang, setTargetLang] = usePersistedState("paraphrase-lang", "en");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("paraphrase-model", "fast");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showLangs, setShowLangs] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
  // Feature states
  const [history, setHistory] = usePersistedState<ParaphraseHistory[]>("paraphrase-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const wordCount = (str: string) => str.split(/\s+/).filter(Boolean).length;
  const hasResult = !!result;

  const handleParaphrase = async () => {
    if (text.trim().length < 20) {
      toast({ title: "Enter at least 20 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult("");
    setVariations([]);

    try {
      const response = await fetch("/api/tools/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          style,
          preserveLength,
          targetLanguage: targetLang,
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

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let output = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        setResult(output);
      }

      // Save to history
      const historyItem: ParaphraseHistory = {
        id: Date.now().toString(),
        original: text.substring(0, 100) + "...",
        paraphrased: output.substring(0, 100) + "...",
        style,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const generateVariations = async () => {
    if (!text.trim()) return;
    setIsGeneratingVariations(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Generate 3 different paraphrased versions of this text. Each should be distinctly different in style. Number them 1, 2, 3. Only output the paraphrased versions, nothing else.

Text to paraphrase:
${text}`
          }],
          feature: "answer",
          model: "fast",
          language: targetLang,
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
      const parts = content.split(/\d+\.\s+/).filter(p => p.trim());
      setVariations(parts.slice(0, 3));
    } catch {
      toast({ title: "Failed to generate variations", variant: "destructive" });
    } finally {
      setIsGeneratingVariations(false);
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
            { role: "system", content: `You are a paraphrasing assistant. Help the user refine their paraphrased text or explain writing choices.` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage }
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

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportResult = () => {
    const content = `Original:\n${text}\n\n---\n\nParaphrased (${style}):\n${result}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paraphrased_${Date.now()}.txt`;
    a.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target?.result as string);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const useVariation = (v: string) => {
    setResult(v);
    setVariations([]);
  };

  const swapTexts = () => {
    const temp = text;
    setText(result);
    setResult(temp);
  };

  const reset = () => {
    setText("");
    setResult("");
    setVariations([]);
    setChatMessages([]);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Safe Paraphraser</h1>
            <p className="text-xs text-gray-500">Rewrite text while preserving meaning</p>
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
            <Sparkles className="w-3 h-3" /> 2 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Original */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Original Text</span>
              <span className="text-xs text-gray-400">{wordCount(text)} words</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-2 rounded-lg">
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              {text && (
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 rounded-lg text-gray-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 p-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type the text you want to paraphrase..."
              className="h-full resize-none border-0 shadow-none focus-visible:ring-0 text-base"
            />
          </div>
        </div>

        {/* Center Controls */}
        <div className="w-64 bg-white flex flex-col">
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {/* Style Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Writing Style</label>
              <div className="relative">
                <button
                  onClick={() => setShowStyles(!showStyles)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <span>{STYLES.find(s => s.id === style)?.icon}</span>
                    <span className="font-medium">{STYLES.find(s => s.id === style)?.label}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showStyles && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 max-h-[280px] overflow-y-auto">
                    {STYLES.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setStyle(s.id); setShowStyles(false); }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50", style === s.id && "bg-blue-50")}
                      >
                        <span>{s.icon}</span>
                        <div className="text-left">
                          <p className={cn("font-medium", style === s.id && "text-blue-600")}>{s.label}</p>
                          <p className="text-xs text-gray-400">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Language Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Output Language</label>
              <div className="relative">
                <button
                  onClick={() => setShowLangs(!showLangs)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{LANGUAGES.find(l => l.id === targetLang)?.label}</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showLangs && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
                    {LANGUAGES.map(l => (
                      <button
                        key={l.id}
                        onClick={() => { setTargetLang(l.id); setShowLangs(false); }}
                        className={cn("w-full px-3 py-2 text-sm text-left hover:bg-gray-50", targetLang === l.id && "bg-blue-50 text-blue-600")}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Length Preference */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Length</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreserveLength(true)}
                  className={cn("flex-1 py-2 rounded-xl text-xs font-medium border", preserveLength ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-gray-50 border-gray-200 text-gray-600")}
                >
                  Keep Length
                </button>
                <button
                  onClick={() => setPreserveLength(false)}
                  className={cn("flex-1 py-2 rounded-xl text-xs font-medium border", !preserveLength ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-gray-50 border-gray-200 text-gray-600")}
                >
                  Flexible
                </button>
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">AI Model</label>
              <div className="p-2 bg-gray-50 rounded-xl border border-gray-200">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              </div>
            </div>

            {/* Generate Variations */}
            <Button
              variant="outline"
              onClick={generateVariations}
              disabled={isGeneratingVariations || !text.trim()}
              className="w-full rounded-xl"
            >
              {isGeneratingVariations ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1" /> Generate Variations</>}
            </Button>
          </div>

          {/* Main Action */}
          <div className="p-4 border-t border-gray-100">
            <Button
              onClick={handleParaphrase}
              disabled={isLoading || text.trim().length < 20}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-medium"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Wand2 className="w-5 h-5 mr-2" /> Paraphrase</>}
            </Button>
          </div>
        </div>

        {/* Right Panel - Result */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Paraphrased</span>
              {result && <span className="text-xs text-gray-400">{wordCount(result)} words</span>}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={swapTexts} className="h-7 px-2 rounded-lg" title="Swap">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDiff(!showDiff)} className={cn("h-7 px-2 rounded-lg", showDiff && "bg-blue-50 text-blue-600")} title="Show Diff">
                  <Diff className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={copyResult} className="h-7 px-2 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportResult} className="h-7 px-2 rounded-lg">
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {result ? (
              <div className="space-y-4">
                <div className={cn("p-4 rounded-xl", showDiff ? "bg-green-50 border border-green-100" : "bg-white")}>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{result}</p>
                </div>
                
                {/* Variations */}
                {variations.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-500">Alternative Versions</p>
                    {variations.map((v, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700 mb-2">{v}</p>
                        <Button variant="ghost" size="sm" onClick={() => useVariation(v)} className="h-6 text-xs">
                          Use this version
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-spin" />
                    <p className="text-gray-500">Paraphrasing...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Wand2 className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Paraphrased text will appear here</p>
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
                  <div key={h.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setText(h.original.replace("...", "")); }}>
                    <p className="text-xs text-gray-500 mb-1">{h.style}</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{h.original}</p>
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
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Ask for specific rewrites</p>
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
                  placeholder="Make it more formal..."
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
