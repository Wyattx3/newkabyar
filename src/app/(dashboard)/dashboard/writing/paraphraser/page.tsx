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
  RefreshCw, Loader2, Sparkles, Copy, Check, Wand2, ChevronDown,
  FileText, Download, Mic, MicOff,
  RotateCcw, SplitSquareVertical,
  FileUp, Hash, AlignLeft, Gauge, Shield
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
  { id: "en", label: "English", flag: "🇺🇸" },
  { id: "my", label: "Myanmar", flag: "🇲🇲" },
  { id: "zh", label: "Chinese", flag: "🇨🇳" },
  { id: "ja", label: "Japanese", flag: "🇯🇵" },
  { id: "ko", label: "Korean", flag: "🇰🇷" },
  { id: "th", label: "Thai", flag: "🇹🇭" },
];

interface InitialData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
}

export default function ParaphraserPage({ initialData }: { initialData?: InitialData } = {}) {
  const [mounted, setMounted] = useState(false);
  const [text, setText] = usePersistedState("paraphrase-text", (initialData?.inputData?.text as string) || "");
  const [style, setStyle] = usePersistedState("paraphrase-style", (initialData?.settings?.style as string) || "academic");
  const [preserveLength, setPreserveLength] = usePersistedState("paraphrase-length", true);
  const [targetLang, setTargetLang] = usePersistedState("paraphrase-lang", "en");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("paraphrase-model", (initialData?.settings?.model as ModelType) || "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState((initialData?.outputData?.result as string) || "");
  const [copied, setCopied] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showLangs, setShowLangs] = useState(false);
  
  const [history, setHistory] = usePersistedState<ParaphraseHistory[]>("paraphrase-history", []);
  // New feature states
  const [isListening, setIsListening] = useState(false);
  const [sentenceMode, setSentenceMode] = useState(false);
  const [uniquenessScore, setUniquenessScore] = useState(0);
  const [formalityLevel, setFormalityLevel] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("paraphraser");

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

  // Stats
  const wordCount = text.trim().split(/\s+/).filter(w => w).length;
  const charCount = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const resultWordCount = result.trim().split(/\s+/).filter(w => w).length;

  // Calculate scores - called once after streaming completes
  const calculateScores = (originalText: string, resultText: string) => {
    if (resultText && originalText) {
      const words1 = originalText.toLowerCase().split(/\s+/);
      const words2 = resultText.toLowerCase().split(/\s+/);
      const common = words1.filter(w => words2.includes(w));
      const unique = Math.max(0, 100 - Math.round((common.length / words1.length) * 100));
      setUniquenessScore(unique);
      
      const formalWords = ['therefore', 'however', 'furthermore', 'consequently', 'nevertheless', 'moreover'];
      const formalCount = formalWords.filter(w => resultText.toLowerCase().includes(w)).length;
      setFormalityLevel(Math.min(100, formalCount * 20 + 40));
    }
  };

  const handleParaphrase = async () => {
    if (text.trim().length < 20) {
      toast({ title: "Enter at least 20 characters", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/tools/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, style, preserveLength, targetLanguage: targetLang, model: selectedModel, language: aiLanguage }),
      });

      if (!response.ok) {
        if (response.status === 402) { toast({ title: "Insufficient credits", variant: "destructive" }); return; }
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

      calculateScores(text, output);
      setHistory(prev => [{ id: Date.now().toString(), original: text.substring(0, 80), paraphrased: output.substring(0, 80), style, timestamp: Date.now() }, ...prev.slice(0, 19)]);
      saveProject({
        inputData: { text },
        outputData: { result: output },
        settings: { style, model: selectedModel },
        inputPreview: text.slice(0, 200),
      });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast({ title: "Speech recognition not supported", variant: "destructive" });
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: any) => setText(prev => prev + " " + e.results[0][0].transcript);
    recognition.start();
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportResult = (format: "txt" | "md") => {
    const content = format === "md" 
      ? `# Paraphrased Text\n\n**Style:** ${style}\n\n## Original\n${text}\n\n## Paraphrased\n${result}`
      : `Original:\n${text}\n\n---\n\nParaphrased (${style}):\n${result}`;
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `paraphrased.${format}`;
    a.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "application/pdf") {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/utils/parse-pdf", { method: "POST", body: formData });
        if (!res.ok) throw new Error();
        const { text: pdfText } = await res.json();
        setText(pdfText.substring(0, 3000));
        toast({ title: "PDF imported" });
      } catch { toast({ title: "Failed", variant: "destructive" }); }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => setText(e.target?.result as string);
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const reset = () => { setResult(""); };

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {!result ? (
        /* INPUT STATE */
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div className="w-full max-w-2xl flex flex-col h-full max-h-[580px]">
            {/* Header */}
            <div className="text-center mb-4 shrink-0">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 mb-3">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Safe Paraphraser</h1>
              <p className="text-sm text-gray-500">Rewrite text while preserving meaning</p>
            </div>

            {/* Main Card */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Textarea */}
              <div className="flex-1 relative">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste or type the text you want to paraphrase..."
                  className="absolute inset-0 border-0 rounded-none shadow-none focus-visible:ring-0 text-sm resize-none p-4"
                />
                {/* Voice Input Button */}
                <button
                  onClick={startListening}
                  className={cn("absolute bottom-3 right-3 p-2 rounded-xl", isListening ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Stats */}
              {text.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-4 text-[10px] text-gray-500 shrink-0">
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{wordCount} words</span>
                  <span className="flex items-center gap-1"><AlignLeft className="w-3 h-3" />{charCount} chars</span>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{sentences} sentences</span>
                </div>
              )}

              {/* Options */}
              <div className="p-3 border-t border-gray-100 space-y-3 shrink-0">
                {/* Style & Language Row */}
                <div className="flex gap-2">
                  {/* Style Dropdown */}
                  <div className="flex-1 relative">
                    <button onClick={() => { setShowStyles(!showStyles); setShowLangs(false); }} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-gray-300">
                      <span className="flex items-center gap-2">
                        <span>{STYLES.find(s => s.id === style)?.icon}</span>
                        <span className="font-medium text-gray-700">{STYLES.find(s => s.id === style)?.label}</span>
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {showStyles && (
                      <div className="absolute bottom-full mb-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 max-h-[240px] overflow-y-auto">
                        {STYLES.map(s => (
                          <button key={s.id} onClick={() => { setStyle(s.id); setShowStyles(false); }} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50", style === s.id && "bg-blue-50")}>
                            <span>{s.icon}</span>
                            <div className="text-left">
                              <p className={cn("font-medium", style === s.id && "text-blue-600")}>{s.label}</p>
                              <p className="text-[10px] text-gray-400">{s.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Language Dropdown */}
                  <div className="w-36 relative">
                    <button onClick={() => { setShowLangs(!showLangs); setShowStyles(false); }} className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-gray-300">
                      <span className="flex items-center gap-2">
                        <span>{LANGUAGES.find(l => l.id === targetLang)?.flag}</span>
                        <span className="font-medium text-gray-700">{LANGUAGES.find(l => l.id === targetLang)?.label}</span>
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {showLangs && (
                      <div className="absolute bottom-full mb-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
                        {LANGUAGES.map(l => (
                          <button key={l.id} onClick={() => { setTargetLang(l.id); setShowLangs(false); }} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50", targetLang === l.id && "bg-blue-50 text-blue-600")}>
                            <span>{l.flag}</span>{l.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Length & Sentence Mode */}
                <div className="flex gap-2">
                  <div className="flex-1 flex bg-gray-100 rounded-xl p-0.5">
                    <button onClick={() => setPreserveLength(true)} className={cn("flex-1 py-2 text-xs font-medium rounded-lg", preserveLength ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
                      Keep Length
                    </button>
                    <button onClick={() => setPreserveLength(false)} className={cn("flex-1 py-2 text-xs font-medium rounded-lg", !preserveLength ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
                      Flexible
                    </button>
                  </div>
                  <button onClick={() => setSentenceMode(!sentenceMode)} className={cn("px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1", sentenceMode ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-gray-50 border-gray-200 text-gray-600")}>
                    <SplitSquareVertical className="w-3.5 h-3.5" />Sentence
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white rounded-lg text-gray-500 border border-gray-200 bg-white">
                    <FileUp className="w-4 h-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf" onChange={handleFile} className="hidden" />
                  <div className="px-2 py-1 bg-white border border-gray-200 rounded-lg">
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>
                </div>
                <Button onClick={handleParaphrase} disabled={isLoading || text.length < 20} className="h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-1.5" />Paraphrase</>}
                </Button>
              </div>
            </div>

            <p className="text-center text-[10px] text-gray-400 mt-3 shrink-0">
              <Sparkles className="w-3 h-3 inline mr-1" />2 credits per paraphrase
            </p>
          </div>
        </div>
      ) : (
        /* RESULTS STATE */
        <div className="h-full flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={reset} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <RotateCcw className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-lg">{STYLES.find(s => s.id === style)?.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{STYLES.find(s => s.id === style)?.label} Style</p>
                  <p className="text-[10px] text-gray-500">{wordCount} → {resultWordCount} words</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Uniqueness & Formality */}
              <div className="flex items-center gap-2 mr-2 px-2 py-1 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-medium text-gray-600">{uniquenessScore}%</span>
                </div>
                <div className="w-px h-3 bg-gray-200" />
                <div className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-medium text-gray-600">{formalityLevel}%</span>
                </div>
              </div>

              {[
                { icon: copied ? Check : Copy, action: copyResult, active: copied },
                { icon: Download, action: () => exportResult("txt"), active: false },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action} className={cn("p-2 rounded-lg", btn.active ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}>
                  <btn.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left - Original */}
            <div className="flex-1 flex flex-col border-r border-gray-100 overflow-hidden">
              <div className="h-10 border-b border-gray-100 flex items-center px-4 shrink-0">
                <span className="text-xs font-medium text-gray-500">Original</span>
                <span className="ml-2 text-[10px] text-gray-400">{wordCount} words</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{text}</p>
              </div>
            </div>

            {/* Center - Result */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-10 border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">Paraphrased</span>
                  <span className="text-[10px] text-gray-400">{resultWordCount} words</span>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{result}</p>
                  </div>

                </div>
              </div>

              {/* Re-paraphrase bar */}
              <div className="p-3 border-t border-gray-100 shrink-0">
                <Button onClick={handleParaphrase} disabled={isLoading} variant="outline" className="w-full h-9 rounded-xl">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-1.5" />Re-paraphrase</>}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
