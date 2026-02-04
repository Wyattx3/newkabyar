"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import { 
  Flame, Loader2, Sparkles, Target, ThumbsUp, ThumbsDown, AlertTriangle,
  CheckCircle, Zap, TrendingUp, Download, Copy, Check, MessageSquare,
  Send, X, RefreshCw, FileText, ChevronDown, Share2, BarChart3, Award,
  BookOpen, Lightbulb, PenTool, GraduationCap, History
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
  improvedVersion?: string;
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
  { id: "research", label: "Research Paper", icon: BookOpen },
  { id: "report", label: "Lab/Business Report", icon: FileText },
  { id: "analysis", label: "Case Analysis", icon: BarChart3 },
  { id: "thesis", label: "Thesis/Dissertation", icon: GraduationCap },
];

const GRADE_LEVELS = [
  { id: "highschool", label: "High School" },
  { id: "undergraduate", label: "Undergraduate" },
  { id: "graduate", label: "Graduate" },
  { id: "professional", label: "Professional" },
];

const ROAST_INTENSITIES = [
  { id: "gentle", label: "Gentle", desc: "Constructive feedback" },
  { id: "balanced", label: "Balanced", desc: "Honest but fair" },
  { id: "brutal", label: "Brutal", desc: "No mercy roast" },
];

export default function RoastAssignmentPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [text, setText] = usePersistedState("roast-text", "");
  const [type, setType] = usePersistedState("roast-type", "essay");
  const [level, setLevel] = usePersistedState("roast-level", "undergraduate");
  const [intensity, setIntensity] = usePersistedState("roast-intensity", "balanced");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("roast-model", "fast");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "rubric" | "fixes">("overview");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  // Feature states
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = usePersistedState<RoastHistory[]>("roast-history", []);
  const [isGeneratingImproved, setIsGeneratingImproved] = useState(false);
  const [improvedVersion, setImprovedVersion] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const hasResult = !!result;

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
        body: JSON.stringify({
          text,
          assignmentType: type,
          gradeLevel: level,
          intensity,
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

      const data = await response.json();
      setResult(data);
      
      // Add to history
      const historyItem: RoastHistory = {
        id: Date.now().toString(),
        preview: text.substring(0, 50) + "...",
        grade: data.overallGrade,
        score: data.overallScore,
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

  const generateImprovedVersion = async () => {
    if (!result || !text) return;
    setIsGeneratingImproved(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Improve this ${type} based on the following feedback. Keep the same topic and main ideas, but fix the issues mentioned.

Original text:
${text}

Issues to fix:
${result.weaknesses.map(w => `- ${w.issue}: ${w.fix}`).join("\n")}

Quick fixes needed:
${result.quickFixes.join("\n")}

Write an improved version that would score higher. Only output the improved text, nothing else.`
          }],
          feature: "answer",
          model: selectedModel,
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
        setImprovedVersion(content);
      }
    } catch {
      toast({ title: "Failed to generate improved version", variant: "destructive" });
    } finally {
      setIsGeneratingImproved(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !result) return;
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
            { role: "system", content: `You are a writing tutor helping improve a ${type}. The student got a ${result.overallGrade} (${result.overallScore}%). Help them understand the feedback and improve.` },
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
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your question." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyFeedback = () => {
    if (!result) return;
    let text = `Grade: ${result.overallGrade} (${result.overallScore}%)\n\n`;
    text += `Verdict: ${result.verdict}\n\n`;
    text += `Strengths:\n${result.strengths.map(s => `- ${s}`).join("\n")}\n\n`;
    text += `Weaknesses:\n${result.weaknesses.map(w => `- ${w.issue}: ${w.fix}`).join("\n")}\n\n`;
    text += `Quick Fixes:\n${result.quickFixes.map(f => `- ${f}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAsPDF = () => {
    if (!result) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Assignment Feedback - ${result.overallGrade}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.6}
    h1{color:#dc2626}h2{color:#374151;margin-top:24px}
    .grade{font-size:48px;font-weight:bold;color:#dc2626}.score{font-size:24px;color:#666}
    .section{margin:20px 0;padding:16px;border-radius:8px}
    .strength{background:#dcfce7;border-left:4px solid #22c55e}
    .weakness{background:#fee2e2;border-left:4px solid #ef4444}
    .fix{background:#fef3c7;border-left:4px solid #f59e0b}
    ul{margin:0;padding-left:20px}li{margin:8px 0}</style></head><body>
    <h1>Assignment Feedback</h1>
    <div class="grade">${result.overallGrade}</div>
    <div class="score">${result.overallScore}% Overall Score</div>
    <p><em>${result.verdict}</em></p>
    <h2>Rubric Scores</h2>`;
    result.rubric.forEach(r => {
      html += `<p><strong>${r.category}:</strong> ${r.score}% - ${r.feedback}</p>`;
    });
    html += `<h2>Strengths</h2><div class="section strength"><ul>${result.strengths.map(s => `<li>${s}</li>`).join("")}</ul></div>`;
    html += `<h2>Areas for Improvement</h2><div class="section weakness"><ul>${result.weaknesses.map(w => `<li><strong>${w.issue}:</strong> ${w.fix}</li>`).join("")}</ul></div>`;
    html += `<h2>Quick Fixes</h2><div class="section fix"><ul>${result.quickFixes.map(f => `<li>${f}</li>`).join("")}</ul></div>`;
    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type === "application/pdf") {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/utils/parse-pdf", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Failed");
        const { text: pdfText } = await response.json();
        setText(pdfText.substring(0, 5000));
        toast({ title: "PDF imported successfully" });
      } catch {
        toast({ title: "Failed to parse PDF", variant: "destructive" });
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target?.result as string);
        toast({ title: "File imported successfully" });
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "from-green-500 to-emerald-600";
    if (grade.startsWith("B")) return "from-blue-500 to-indigo-600";
    if (grade.startsWith("C")) return "from-amber-500 to-orange-600";
    return "from-red-500 to-rose-600";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const reset = () => {
    setResult(null);
    setImprovedVersion("");
    setChatMessages([]);
    setActiveTab("overview");
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* INITIAL STATE */}
      {!hasResult ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 mb-4">
                <Flame className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Roast My Assignment</h1>
              <p className="text-gray-500">Get brutally honest feedback and actionable improvements</p>
            </div>

            {/* Main Input Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Text Input */}
              <div className="p-6">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your essay, paper, or assignment here...

Or upload a file using the button below."
                  className="min-h-[200px] border-0 shadow-none focus-visible:ring-0 text-base resize-none"
                />
              </div>

              {/* Options */}
              <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 space-y-4">
                {/* Row 1: Type & Level */}
                <div className="flex gap-4">
                  {/* Assignment Type */}
                  <div className="flex-1 relative">
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Assignment Type</label>
                    <button
                      onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
                    >
                      <span className="flex items-center gap-2">
                        {(() => { const t = ASSIGNMENT_TYPES.find(t => t.id === type); return t ? <><t.icon className="w-4 h-4" />{t.label}</> : null; })()}
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    {showTypeDropdown && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20">
                        {ASSIGNMENT_TYPES.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setType(t.id); setShowTypeDropdown(false); }}
                            className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50", type === t.id && "bg-blue-50 text-blue-600")}
                          >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grade Level */}
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Grade Level</label>
                    <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
                      {GRADE_LEVELS.map(l => (
                        <button
                          key={l.id}
                          onClick={() => setLevel(l.id)}
                          className={cn(
                            "flex-1 px-2 py-1.5 text-xs font-medium rounded-lg",
                            level === l.id ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Intensity */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Roast Intensity</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROAST_INTENSITIES.map(i => (
                      <button
                        key={i.id}
                        onClick={() => setIntensity(i.id)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-left transition-all",
                          intensity === i.id
                            ? i.id === "brutal" ? "bg-red-50 border-2 border-red-300" : "bg-blue-50 border-2 border-blue-300"
                            : "bg-white border border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <p className={cn("text-sm font-medium", intensity === i.id && i.id === "brutal" ? "text-red-600" : intensity === i.id ? "text-blue-600" : "text-gray-700")}>{i.label}</p>
                        <p className="text-xs text-gray-500">{i.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-9 px-3 rounded-xl">
                    <FileText className="w-4 h-4 mr-1" /> Upload
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,application/pdf" onChange={handleFileUpload} className="hidden" />
                  
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-gray-200">
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="h-9 px-3 rounded-xl">
                    <History className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  onClick={handleRoast}
                  disabled={isLoading || text.trim().length < 100}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Flame className="w-4 h-4 mr-2" /> Roast It!</>}
                </Button>
              </div>
            </div>

            {/* History Panel */}
            {showHistory && history.length > 0 && (
              <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Roasts</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {history.slice(0, 10).map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm", h.grade.startsWith("A") ? "bg-green-500" : h.grade.startsWith("B") ? "bg-blue-500" : h.grade.startsWith("C") ? "bg-amber-500" : "bg-red-500")}>
                        {h.grade}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{h.preview}</p>
                        <p className="text-xs text-gray-400">{h.score}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credits */}
            <div className="text-center mt-6 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-full border border-gray-100">
                <Sparkles className="w-3 h-3" /> 4 credits per roast
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* RESULTS STATE */
        <div className="flex-1 flex overflow-hidden">
          {/* Main Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br text-white flex items-center justify-center font-bold text-lg", getGradeColor(result.overallGrade))}>
                  {result.overallGrade}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{result.overallScore}% Overall Score</p>
                  <p className="text-xs text-gray-500">{result.verdict}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={copyFeedback} className="h-8 rounded-lg">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportAsPDF} className="h-8 rounded-lg">
                  <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)} className={cn("h-8 rounded-lg", showChat && "bg-blue-50 text-blue-600")}>
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <div className="w-px h-5 bg-gray-200" />
                <Button variant="ghost" size="sm" onClick={reset} className="h-8 rounded-lg text-gray-500">
                  <RefreshCw className="w-4 h-4 mr-1" /> New
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-100 px-6">
              <div className="flex gap-4">
                {[
                  { id: "overview", label: "Overview", icon: BarChart3 },
                  { id: "rubric", label: "Rubric", icon: Target },
                  { id: "fixes", label: "Fixes & Improved", icon: Zap },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-all",
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div className="max-w-3xl mx-auto space-y-6">
                {activeTab === "overview" && (
                  <>
                    {/* Strengths & Weaknesses Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                        <div className="flex items-center gap-2 mb-4">
                          <ThumbsUp className="w-5 h-5 text-green-600" />
                          <h3 className="font-semibold text-green-800">Strengths</h3>
                        </div>
                        <ul className="space-y-2">
                          {result.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                        <div className="flex items-center gap-2 mb-4">
                          <ThumbsDown className="w-5 h-5 text-red-600" />
                          <h3 className="font-semibold text-red-800">Weaknesses</h3>
                        </div>
                        <ul className="space-y-3">
                          {result.weaknesses.slice(0, 4).map((w, i) => (
                            <li key={i} className="text-sm">
                              <div className="flex items-start gap-2 text-red-700 font-medium">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                {w.issue}
                              </div>
                              <p className="text-red-600/80 text-xs mt-1 ml-6">{w.fix}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Quick Fixes */}
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-amber-600" />
                        <h3 className="font-semibold text-amber-800">Quick Fixes</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2">
                        {result.quickFixes.map((fix, i) => (
                          <div key={i} className="flex items-start gap-2 p-3 bg-white rounded-xl text-sm text-amber-700">
                            <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
                            {fix}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "rubric" && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-6">Detailed Rubric Scores</h3>
                    <div className="space-y-4">
                      {result.rubric.map((item, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">{item.category}</span>
                            <span className={cn("text-sm font-bold", item.score >= 80 ? "text-green-600" : item.score >= 60 ? "text-blue-600" : item.score >= 40 ? "text-amber-600" : "text-red-600")}>
                              {item.score}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", getScoreColor(item.score))} style={{ width: `${item.score}%` }} />
                          </div>
                          <p className="text-sm text-gray-500">{item.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "fixes" && (
                  <>
                    {/* Generate Improved Version */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">AI-Improved Version</h3>
                        </div>
                        <Button
                          onClick={generateImprovedVersion}
                          disabled={isGeneratingImproved}
                          size="sm"
                          className="rounded-lg"
                        >
                          {isGeneratingImproved ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> Generate</>}
                        </Button>
                      </div>
                      {improvedVersion ? (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{improvedVersion}</p>
                          </div>
                          <Button variant="outline" onClick={() => setShowComparison(!showComparison)} className="w-full rounded-xl">
                            {showComparison ? "Hide" : "Show"} Comparison
                          </Button>
                          {showComparison && (
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="p-4 bg-red-50 rounded-xl">
                                <p className="text-xs font-medium text-red-600 mb-2">Original</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{text.substring(0, 500)}...</p>
                              </div>
                              <div className="p-4 bg-green-50 rounded-xl">
                                <p className="text-xs font-medium text-green-600 mb-2">Improved</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{improvedVersion.substring(0, 500)}...</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-8">Click generate to create an improved version based on the feedback</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="w-80 bg-white border-l border-gray-100 flex flex-col">
              <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4">
                <span className="font-medium text-gray-900 text-sm">Ask about feedback</span>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Ask questions about your feedback</p>
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
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="How can I improve...?"
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
      )}
    </div>
  );
}
