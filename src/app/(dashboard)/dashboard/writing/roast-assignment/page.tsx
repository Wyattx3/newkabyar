"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import { cn } from "@/lib/utils";
import { 
  Flame, Loader2, Sparkles, Target, ThumbsUp, ThumbsDown, AlertTriangle,
  CheckCircle, Zap, TrendingUp, Download, Copy, Check, MessageSquare,
  Send, X, RefreshCw, FileText, Share2, BarChart3,
  BookOpen, Lightbulb, PenTool, GraduationCap, Volume2, VolumeX,
  Bookmark, BookmarkCheck, Printer, ChevronRight, ChevronDown,
  Eye, Brain, Hash, AlignLeft, FileUp, Award, Gauge, ListChecks
} from "lucide-react";

interface RubricItem {
  category: string;
  score: number;
  feedback: string;
}

interface Weakness {
  issue: string;
  example?: string;
  fix: string;
}

interface RoastResult {
  overallGrade: string;
  overallScore: number;
  verdict: string;
  rubric: RubricItem[];
  strengths: string[];
  weaknesses: Weakness[];
  quickFixes: string[];
}

interface RoastHistory {
  id: string;
  preview: string;
  grade: string;
  score: number;
  timestamp: number;
}

const ASSIGNMENT_TYPES = [
  { id: "essay", label: "Essay", icon: PenTool },
  { id: "research", label: "Research", icon: BookOpen },
  { id: "report", label: "Report", icon: FileText },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "thesis", label: "Thesis", icon: GraduationCap },
];

const GRADE_LEVELS = ["highschool", "undergraduate", "graduate", "professional"];

const INTENSITIES = [
  { id: "gentle", emoji: "😊", label: "Gentle" },
  { id: "balanced", emoji: "🤔", label: "Balanced" },
  { id: "brutal", emoji: "🔥", label: "Brutal" },
];

interface InitialData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
}

export default function RoastAssignmentPage({ initialData }: { initialData?: InitialData } = {}) {
  const [mounted, setMounted] = useState(false);
  const [text, setText] = usePersistedState("roast-text", (initialData?.inputData?.text as string) || "");
  const [type, setType] = usePersistedState("roast-type", (initialData?.settings?.type as string) || "essay");
  const [level, setLevel] = usePersistedState("roast-level", (initialData?.settings?.level as string) || "undergraduate");
  const [intensity, setIntensity] = usePersistedState("roast-intensity", (initialData?.settings?.intensity as string) || "balanced");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("roast-model", (initialData?.settings?.model as ModelType) || "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>((initialData?.outputData as unknown as RoastResult) || null);
  const [copied, setCopied] = useState(false);
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [history, setHistory] = usePersistedState<RoastHistory[]>("roast-history", []);
  
  // Improved version
  const [improvedVersion, setImprovedVersion] = useState("");
  const [isGeneratingImproved, setIsGeneratingImproved] = useState(false);
  
  // New features
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showImproved, setShowImproved] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
  const [showRubricDetails, setShowRubricDetails] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("roast-assignment");

  useEffect(() => setMounted(true), []);
  
  useEffect(() => {
    const chatContainer = chatEndRef.current?.parentElement;
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [chatMessages]);

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
  const readTime = Math.ceil(wordCount / 200);

  const handleRoast = async () => {
    if (text.trim().length < 100) {
      toast({ title: "Enter at least 100 characters", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);
    setImprovedVersion("");

    try {
      const response = await fetch("/api/tools/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, assignmentType: type, gradeLevel: level, intensity, model: selectedModel, language: aiLanguage }),
      });

      if (!response.ok) {
        if (response.status === 402) { toast({ title: "Insufficient credits", variant: "destructive" }); return; }
        throw new Error("Failed");
      }

      const data = await response.json();
      setResult(data);
      saveProject({
        inputData: { text },
        outputData: data,
        settings: { type, level, intensity, model: selectedModel },
        inputPreview: text.slice(0, 200),
      });
      setHistory(prev => [{ id: Date.now().toString(), preview: text.substring(0, 40) + "...", grade: data.overallGrade, score: data.overallScore, timestamp: Date.now() }, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const generateImproved = async () => {
    if (!result || !text) return;
    setIsGeneratingImproved(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Improve this ${type}:\n\n${text}\n\nFix these issues:\n${result.weaknesses.map(w => `- ${w.issue}: ${w.fix}`).join("\n")}\n\nOnly output improved text.` }],
          feature: "answer", model: selectedModel, language: aiLanguage || "en",
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
        setImprovedVersion(content);
      }
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    finally { setIsGeneratingImproved(false); }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !result) return;
    const msg = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: msg }]);
    setIsChatLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You're a writing tutor. Student got ${result.overallGrade} (${result.overallScore}%). Help improve.` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: msg }
          ],
          feature: "answer", model: "fast", language: aiLanguage || "en",
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      let content = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      setChatMessages(prev => [...prev, { role: "assistant", content }]);
    } catch { setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't process." }]); }
    finally { setIsChatLoading(false); }
  };

  const speakFeedback = () => {
    if (!result) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(`Grade ${result.overallGrade}, ${result.overallScore}%. ${result.verdict}`);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const copyFeedback = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Grade: ${result.overallGrade} (${result.overallScore}%)\n${result.verdict}\n\nStrengths:\n${result.strengths.join("\n")}\n\nWeaknesses:\n${result.weaknesses.map(w => `${w.issue}: ${w.fix}`).join("\n")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printFeedback = () => {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Feedback</title><style>body{font-family:system-ui;max-width:700px;margin:40px auto;padding:20px}h1{color:#ea580c}.grade{font-size:48px;font-weight:bold}</style></head><body><h1>Assignment Feedback</h1><div class="grade">${result.overallGrade}</div><p>${result.overallScore}%</p><p><em>${result.verdict}</em></p><h2>Strengths</h2><ul>${result.strengths.map(s => `<li>${s}</li>`).join("")}</ul><h2>Weaknesses</h2><ul>${result.weaknesses.map(w => `<li><b>${w.issue}</b>: ${w.fix}</li>`).join("")}</ul></body></html>`);
    w.document.close();
    w.print();
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
        setText(pdfText.substring(0, 5000));
        toast({ title: "PDF imported" });
      } catch { toast({ title: "Failed", variant: "destructive" }); }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => { setText(e.target?.result as string); toast({ title: "Imported" }); };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getGradeStyle = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-500 text-white";
    if (grade.startsWith("B")) return "bg-blue-500 text-white";
    if (grade.startsWith("C")) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  const getScoreBar = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const reset = () => { setResult(null); setImprovedVersion(""); setChatMessages([]); setShowImproved(false); };

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {!result ? (
        /* INPUT STATE - Centered Card Design */
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div className="w-full max-w-2xl flex flex-col h-full max-h-[600px]">
            {/* Header */}
            <div className="text-center mb-4 shrink-0">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 mb-3">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Roast My Assignment</h1>
              <p className="text-sm text-gray-500">Get brutally honest feedback</p>
            </div>

            {/* Main Card */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Textarea */}
              <div className="flex-1 relative">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your essay, paper, or assignment here..."
                  className="absolute inset-0 border-0 rounded-none shadow-none focus-visible:ring-0 text-sm resize-none p-4"
                />
              </div>

              {/* Stats */}
              {text.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-4 text-[10px] text-gray-500 shrink-0">
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{wordCount} words</span>
                  <span className="flex items-center gap-1"><AlignLeft className="w-3 h-3" />{charCount} chars</span>
                  <span className="flex items-center gap-1"><Brain className="w-3 h-3" />~{readTime}min read</span>
                </div>
              )}

              {/* Options */}
              <div className="p-3 border-t border-gray-100 space-y-3 shrink-0">
                {/* Type Selection */}
                <div className="flex gap-1">
                  {ASSIGNMENT_TYPES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={cn("flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all",
                        type === t.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Level & Intensity */}
                <div className="flex gap-2">
                  <div className="flex-1 flex bg-gray-100 rounded-lg p-0.5">
                    {GRADE_LEVELS.map(l => (
                      <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={cn("flex-1 py-1.5 text-[10px] font-medium rounded-md capitalize", level === l ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}
                      >
                        {l === "highschool" ? "High School" : l === "undergraduate" ? "Undergrad" : l === "graduate" ? "Grad" : "Pro"}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    {INTENSITIES.map(i => (
                      <button
                        key={i.id}
                        onClick={() => setIntensity(i.id)}
                        className={cn("px-3 py-1.5 text-[10px] font-medium rounded-md flex items-center gap-1",
                          intensity === i.id ? (i.id === "brutal" ? "bg-red-500 text-white" : "bg-white shadow-sm text-gray-900") : "text-gray-500"
                        )}
                      >
                        {i.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white rounded-lg text-gray-500 border border-gray-200 bg-white">
                    <FileUp className="w-4 h-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={handleFile} className="hidden" />
                  <div className="px-2 py-1 bg-white border border-gray-200 rounded-lg">
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>
                </div>
                <Button onClick={handleRoast} disabled={isLoading || text.length < 100} className="h-9 px-6 rounded-xl bg-orange-500 hover:bg-orange-600">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Flame className="w-4 h-4 mr-1.5" />Roast</>}
                </Button>
              </div>
            </div>

            {/* Credits */}
            <p className="text-center text-[10px] text-gray-400 mt-3 shrink-0">
              <Sparkles className="w-3 h-3 inline mr-1" />4 credits per roast
            </p>
          </div>
        </div>
      ) : (
        /* RESULTS STATE - Horizontal Split Layout */
        <div className="h-full flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={reset} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex items-center gap-2">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg", getGradeStyle(result.overallGrade))}>
                  {result.overallGrade}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{result.overallScore}% Score</p>
                  <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{result.verdict}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[
                { icon: bookmarked ? BookmarkCheck : Bookmark, action: () => setBookmarked(!bookmarked), active: bookmarked },
                { icon: isSpeaking ? VolumeX : Volume2, action: speakFeedback, active: isSpeaking },
                { icon: copied ? Check : Copy, action: copyFeedback, active: copied },
                { icon: Printer, action: printFeedback, active: false },
                { icon: Share2, action: () => navigator.share?.({ title: "Feedback", text: `${result.overallGrade} - ${result.verdict}` }), active: false },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action} className={cn("p-2 rounded-lg", btn.active ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}>
                  <btn.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Horizontal Split */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - Feedback */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-100">
              {/* Tabs */}
              <div className="h-10 border-b border-gray-100 flex items-center px-4 gap-1 shrink-0">
                <button
                  onClick={() => setShowImproved(false)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5", !showImproved ? "bg-orange-50 text-orange-600" : "text-gray-500 hover:bg-gray-50")}
                >
                  <Target className="w-3.5 h-3.5" />Feedback
                </button>
                <button
                  onClick={() => setShowImproved(true)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5", showImproved ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50")}
                >
                  <Sparkles className="w-3.5 h-3.5" />Improved
                </button>
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={cn("ml-auto px-2 py-1 rounded-lg text-[10px]", focusMode ? "bg-purple-50 text-purple-600" : "text-gray-400 hover:bg-gray-50")}
                >
                  <Eye className="w-3 h-3" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {!showImproved ? (
                  <div className={cn("space-y-4", focusMode && "max-w-xl mx-auto")}>
                    {/* Rubric Summary */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-gray-600" />
                          <h3 className="font-semibold text-gray-900 text-sm">Rubric Scores</h3>
                        </div>
                        <button onClick={() => setShowRubricDetails(!showRubricDetails)} className="text-[10px] text-blue-600">
                          {showRubricDetails ? "Hide" : "Details"}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {result.rubric.map((r, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-600">{r.category}</span>
                              <span className={cn("font-bold", r.score >= 70 ? "text-green-600" : r.score >= 50 ? "text-amber-600" : "text-red-600")}>{r.score}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", getScoreBar(r.score))} style={{ width: `${r.score}%` }} />
                            </div>
                            {showRubricDetails && <p className="text-[10px] text-gray-500 mt-1">{r.feedback}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ThumbsUp className="w-4 h-4 text-green-600" />
                        <h3 className="font-semibold text-green-800 text-sm">Strengths</h3>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{result.strengths.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {result.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-green-700">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{s}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weaknesses */}
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ThumbsDown className="w-4 h-4 text-red-600" />
                        <h3 className="font-semibold text-red-800 text-sm">Issues</h3>
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{result.weaknesses.length}</span>
                      </div>
                      <div className="space-y-2">
                        {result.weaknesses.map((w, i) => (
                          <div
                            key={i}
                            onClick={() => setExpandedIssue(expandedIssue === i ? null : i)}
                            className={cn("border border-red-100 rounded-lg p-2 cursor-pointer bg-white", expandedIssue === i && "ring-1 ring-red-200")}
                          >
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="flex-1 text-xs font-medium text-red-700">{w.issue}</span>
                              <ChevronRight className={cn("w-3.5 h-3.5 text-red-400 transition-transform", expandedIssue === i && "rotate-90")} />
                            </div>
                            {expandedIssue === i && (
                              <div className="mt-2 pt-2 border-t border-red-100">
                                <p className="text-[11px] text-gray-600"><strong className="text-red-600">Fix:</strong> {w.fix}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Fixes */}
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-amber-600" />
                        <h3 className="font-semibold text-amber-800 text-sm">Quick Fixes</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.quickFixes.map((f, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 rounded-lg text-[10px] text-amber-700">
                            <TrendingUp className="w-3 h-3" />{f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Improved Version */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-gray-900 text-sm">AI-Improved Version</h3>
                      </div>
                      <Button onClick={generateImproved} disabled={isGeneratingImproved} size="sm" className="h-7 text-xs rounded-lg bg-blue-600">
                        {isGeneratingImproved ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" />Generate</>}
                      </Button>
                    </div>
                    {improvedVersion ? (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{improvedVersion}</p>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <Sparkles className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Click generate to create improved version</p>
                      </div>
                    )}

                    {/* Comparison */}
                    {improvedVersion && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                          <p className="text-[10px] font-medium text-red-600 mb-2 flex items-center gap-1"><X className="w-3 h-3" />Original</p>
                          <p className="text-[11px] text-gray-600 line-clamp-6">{text}</p>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                          <p className="text-[10px] font-medium text-green-600 mb-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Improved</p>
                          <p className="text-[11px] text-gray-600 line-clamp-6">{improvedVersion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Chat */}
            <div className="w-72 bg-white flex flex-col shrink-0 overflow-hidden">
              <div className="h-10 border-b border-gray-100 flex items-center px-3 gap-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-orange-500 flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-900">Writing Tutor</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatMessages.length === 0 && (
                  <div className="space-y-1.5">
                    {["How to strengthen thesis?", "Explain this issue", "Tips for conclusion"].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)} className="w-full text-left px-2.5 py-2 bg-gray-50 rounded-lg text-[11px] text-gray-600 hover:bg-gray-100">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] px-3 py-2 rounded-2xl text-xs", m.role === "user" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700")}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && <div className="bg-gray-100 px-3 py-2 rounded-2xl w-fit"><Loader2 className="w-3 h-3 animate-spin" /></div>}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-gray-100 shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about feedback..."
                    onKeyDown={(e) => e.key === "Enter" && handleChat()}
                    className="text-xs h-9 rounded-xl"
                  />
                  <Button onClick={handleChat} size="sm" className="h-9 w-9 p-0 rounded-xl bg-orange-500 hover:bg-orange-600">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
