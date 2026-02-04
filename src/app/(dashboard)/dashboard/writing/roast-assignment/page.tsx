"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import { 
  Flame, Loader2, Sparkles, Target, ThumbsUp, ThumbsDown, AlertTriangle,
  CheckCircle, Zap, TrendingUp, Download, Copy, Check, MessageSquare,
  Send, X, RefreshCw, FileText, ChevronDown, Share2, BarChart3, Award,
  BookOpen, Lightbulb, PenTool, GraduationCap, History, Volume2, VolumeX,
  Bookmark, BookmarkCheck, Star, Clock, FileUp, Printer, ChevronRight,
  Eye, Brain, Hash, AlignLeft
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
  priority?: "high" | "medium" | "low";
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
  { id: "undergraduate", label: "Undergrad" },
  { id: "graduate", label: "Graduate" },
  { id: "professional", label: "Pro" },
];

const ROAST_INTENSITIES = [
  { id: "gentle", label: "Gentle", emoji: "😊" },
  { id: "balanced", label: "Balanced", emoji: "🤔" },
  { id: "brutal", label: "Brutal", emoji: "🔥" },
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
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  // Feature states
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [history, setHistory] = usePersistedState<RoastHistory[]>("roast-history", []);
  const [isGeneratingImproved, setIsGeneratingImproved] = useState(false);
  const [improvedVersion, setImprovedVersion] = useState("");
  
  // New feature states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [expandedWeakness, setExpandedWeakness] = useState<number | null>(null);
  const [gradeImprovement, setGradeImprovement] = useState(0);
  const [activeSection, setActiveSection] = useState<"feedback" | "improved" | "compare">("feedback");
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  
  useEffect(() => {
    const chatContainer = chatEndRef.current?.parentElement;
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [chatMessages]);

  // Prevent parent scrolling for fit-view
  useEffect(() => {
    const parent = document.querySelector('main > div') as HTMLElement;
    const html = document.documentElement;
    const body = document.body;
    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = body.style.overflow;
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
      html.style.overflow = origHtmlOverflow;
      body.style.overflow = origBodyOverflow;
      if (parent && origParentClass) {
        parent.className = origParentClass;
        parent.style.removeProperty('overflow');
        parent.style.removeProperty('padding');
      }
    };
  }, []);

  const hasResult = !!result;

  // Text statistics
  const wordCount = text.trim().split(/\s+/).filter(w => w).length;
  const charCount = text.length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const paragraphCount = text.split(/\n\n+/).filter(p => p.trim()).length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

  const handleRoast = async () => {
    if (text.trim().length < 100) {
      toast({ title: "Enter at least 100 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setImprovedVersion("");
    setGradeImprovement(0);

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
      
      // Calculate potential grade improvement
      const potentialImprovement = Math.min(20, Math.round((100 - data.overallScore) * 0.6));
      setGradeImprovement(potentialImprovement);
      
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

  // Feature: Speak feedback
  const speakFeedback = () => {
    if (!result) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = `Your grade is ${result.overallGrade}, with a score of ${result.overallScore} percent. ${result.verdict}. Main strengths: ${result.strengths.slice(0, 2).join(". ")}. Areas to improve: ${result.weaknesses.slice(0, 2).map(w => w.issue).join(". ")}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Feature: Copy feedback
  const copyFeedback = () => {
    if (!result) return;
    let feedbackText = `Grade: ${result.overallGrade} (${result.overallScore}%)\n\n`;
    feedbackText += `Verdict: ${result.verdict}\n\n`;
    feedbackText += `Strengths:\n${result.strengths.map(s => `- ${s}`).join("\n")}\n\n`;
    feedbackText += `Weaknesses:\n${result.weaknesses.map(w => `- ${w.issue}: ${w.fix}`).join("\n")}\n\n`;
    feedbackText += `Quick Fixes:\n${result.quickFixes.map(f => `- ${f}`).join("\n")}`;
    navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Feature: Print feedback
  const printFeedback = () => {
    if (!result) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Assignment Feedback</title>
    <style>body{font-family:system-ui;max-width:700px;margin:40px auto;padding:20px;line-height:1.6}
    .grade{font-size:48px;font-weight:bold;margin-bottom:8px}.score{color:#666;font-size:18px}
    h2{margin-top:24px;color:#333}ul{padding-left:20px}li{margin:8px 0}
    .strength{color:#16a34a}.weakness{color:#dc2626}.fix{color:#d97706}</style></head><body>
    <h1>Assignment Feedback Report</h1>
    <div class="grade">${result.overallGrade}</div>
    <div class="score">${result.overallScore}% Overall Score</div>
    <p><em>${result.verdict}</em></p>
    <h2 class="strength">Strengths</h2><ul>${result.strengths.map(s => `<li>${s}</li>`).join("")}</ul>
    <h2 class="weakness">Areas for Improvement</h2><ul>${result.weaknesses.map(w => `<li><strong>${w.issue}</strong>: ${w.fix}</li>`).join("")}</ul>
    <h2 class="fix">Quick Fixes</h2><ul>${result.quickFixes.map(f => `<li>${f}</li>`).join("")}</ul>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  // Feature: Share results
  const shareResults = async () => {
    if (!result) return;
    const shareData = {
      title: `Assignment Feedback - ${result.overallGrade}`,
      text: `I got ${result.overallGrade} (${result.overallScore}%) on my assignment! ${result.verdict}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        toast({ title: "Copied to clipboard!" });
      }
    } catch {
      toast({ title: "Couldn't share", variant: "destructive" });
    }
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
        toast({ title: "PDF imported" });
      } catch {
        toast({ title: "Failed to parse PDF", variant: "destructive" });
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target?.result as string);
        toast({ title: "File imported" });
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600 bg-green-50";
    if (grade.startsWith("B")) return "text-blue-600 bg-blue-50";
    if (grade.startsWith("C")) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const reset = () => {
    setResult(null);
    setImprovedVersion("");
    setChatMessages([]);
    setBookmarked(false);
    setActiveSection("feedback");
  };

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {!hasResult ? (
        /* INPUT STATE - Fit View */
        <div className="h-full flex overflow-hidden">
          {/* Main Input Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900 text-sm">Roast My Assignment</h1>
                  <p className="text-[10px] text-gray-400">Get brutally honest feedback</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 4 credits
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Text Input */}
              <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your essay, paper, or assignment here..."
                  className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm resize-none p-4"
                />
                
                {/* Stats Bar */}
                {showStats && text.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-500 shrink-0">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {wordCount} words</span>
                    <span className="flex items-center gap-1"><AlignLeft className="w-3 h-3" /> {paragraphCount} paragraphs</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.ceil(wordCount / 200)} min read</span>
                    <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> {avgWordsPerSentence} words/sentence</span>
                  </div>
                )}
              </div>

              {/* Options Row */}
              <div className="mt-3 flex items-center gap-2 shrink-0">
                {/* Assignment Type */}
                <div className="relative">
                  <button
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs hover:border-gray-300"
                  >
                    {(() => { const t = ASSIGNMENT_TYPES.find(t => t.id === type); return t ? <><t.icon className="w-3.5 h-3.5 text-gray-500" /><span>{t.label}</span></> : null; })()}
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                  {showTypeDropdown && (
                    <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 min-w-[160px]">
                      {ASSIGNMENT_TYPES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => { setType(t.id); setShowTypeDropdown(false); }}
                          className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50", type === t.id && "bg-blue-50 text-blue-600")}
                        >
                          <t.icon className="w-3.5 h-3.5" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Grade Level Pills */}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {GRADE_LEVELS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLevel(l.id)}
                      className={cn(
                        "px-2 py-1 text-[10px] font-medium rounded-md transition-all",
                        level === l.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                {/* Intensity Pills */}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {ROAST_INTENSITIES.map(i => (
                    <button
                      key={i.id}
                      onClick={() => setIntensity(i.id)}
                      className={cn(
                        "px-2 py-1 text-[10px] font-medium rounded-md transition-all flex items-center gap-1",
                        intensity === i.id 
                          ? i.id === "brutal" ? "bg-red-500 text-white" : "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500"
                      )}
                    >
                      <span>{i.emoji}</span>
                      {i.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1" />

                {/* File Upload */}
                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <FileUp className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,application/pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />

                {/* Model Selector */}
                <div className="px-2 py-1 bg-white border border-gray-200 rounded-lg">
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>

                {/* Roast Button */}
                <Button
                  onClick={handleRoast}
                  disabled={isLoading || text.trim().length < 100}
                  className="h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Flame className="w-4 h-4 mr-1" /> Roast</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - History */}
          {history.length > 0 && (
            <div className="w-56 bg-white border-l border-gray-100 flex flex-col shrink-0">
              <div className="h-12 border-b border-gray-100 flex items-center px-3">
                <History className="w-4 h-4 text-gray-400 mr-2" />
                <span className="text-xs font-medium text-gray-700">History</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {history.slice(0, 10).map(h => (
                  <div key={h.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold", getGradeColor(h.grade))}>
                      {h.grade}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-700 truncate">{h.preview}</p>
                      <p className="text-[10px] text-gray-400">{h.score}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* RESULTS STATE - 3-Column Fit View */
        <div className="h-full flex bg-white overflow-hidden">
          {/* LEFT - Grade & Summary */}
          <div className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 overflow-hidden">
            {/* Grade Card */}
            <div className="p-4 border-b border-gray-100 shrink-0">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-3", getGradeColor(result.overallGrade))}>
                {result.overallGrade}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", getScoreBarColor(result.overallScore))} style={{ width: `${result.overallScore}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-700">{result.overallScore}%</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{result.verdict}</p>
              
              {/* Potential Improvement */}
              {gradeImprovement > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-[10px] font-medium text-green-700">Potential +{gradeImprovement}%</p>
                    <p className="text-[9px] text-green-600">with fixes applied</p>
                  </div>
                </div>
              )}
            </div>

            {/* Rubric Scores */}
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-[10px] font-medium text-gray-400 mb-2">RUBRIC SCORES</p>
              <div className="space-y-2">
                {result.rubric.map((item, i) => (
                  <div key={i} className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-gray-700 truncate">{item.category}</span>
                      <span className={cn("text-[10px] font-bold", item.score >= 70 ? "text-green-600" : item.score >= 50 ? "text-amber-600" : "text-red-600")}>
                        {item.score}%
                      </span>
                    </div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", getScoreBarColor(item.score))} style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 border-t border-gray-100 shrink-0">
              <div className="grid grid-cols-5 gap-1">
                <button onClick={() => setBookmarked(!bookmarked)} className={cn("flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[8px]", bookmarked ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}>
                  {bookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button onClick={speakFeedback} className={cn("flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[8px]", isSpeaking ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}>
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {isSpeaking ? "Stop" : "Speak"}
                </button>
                <button onClick={copyFeedback} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-[8px]">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
                <button onClick={printFeedback} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-[8px]">
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button onClick={shareResults} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-[8px]">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* CENTER - Feedback Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header with Tabs */}
            <div className="h-10 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={reset} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <div className="flex bg-gray-100 rounded-lg p-0.5 ml-2">
                  {[
                    { id: "feedback", label: "Feedback", icon: Target },
                    { id: "improved", label: "Improved", icon: Sparkles },
                    { id: "compare", label: "Compare", icon: Eye },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSection(tab.id as any)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-md transition-all",
                        activeSection === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                      )}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowChat(!showChat)}
                className={cn("p-1.5 rounded-lg", showChat ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeSection === "feedback" && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {/* Strengths */}
                  <div className="bg-white border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold text-green-800 text-sm">Strengths</h3>
                    </div>
                    <div className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-[12px] text-green-700 bg-green-50 p-2 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weaknesses with Priority */}
                  <div className="bg-white border border-red-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      <h3 className="font-semibold text-red-800 text-sm">Areas to Improve</h3>
                      <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{result.weaknesses.length} issues</span>
                    </div>
                    <div className="space-y-2">
                      {result.weaknesses.map((w, i) => (
                        <div
                          key={i}
                          className={cn("border border-red-100 rounded-lg overflow-hidden cursor-pointer", expandedWeakness === i && "bg-red-50")}
                          onClick={() => setExpandedWeakness(expandedWeakness === i ? null : i)}
                        >
                          <div className="p-2 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-medium text-red-700">{w.issue}</p>
                              {expandedWeakness === i && (
                                <div className="mt-2 p-2 bg-white rounded-lg border border-red-100">
                                  <p className="text-[11px] text-gray-600"><strong>Fix:</strong> {w.fix}</p>
                                </div>
                              )}
                            </div>
                            <ChevronRight className={cn("w-3.5 h-3.5 text-red-400 transition-transform", expandedWeakness === i && "rotate-90")} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Fixes */}
                  <div className="bg-white border border-amber-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <h3 className="font-semibold text-amber-800 text-sm">Quick Fixes</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {result.quickFixes.map((fix, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg text-[11px] text-amber-700">
                          <TrendingUp className="w-3 h-3 shrink-0 mt-0.5" />
                          {fix}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "improved" && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-gray-900 text-sm">AI-Improved Version</h3>
                      </div>
                      <Button
                        onClick={generateImprovedVersion}
                        disabled={isGeneratingImproved}
                        size="sm"
                        className="h-7 rounded-lg text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        {isGeneratingImproved ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" /> Generate</>}
                      </Button>
                    </div>
                    {improvedVersion ? (
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{improvedVersion}</p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Click generate to create an improved version</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "compare" && (
                <div className="max-w-3xl mx-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-red-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <X className="w-4 h-4 text-red-500" />
                        <h3 className="font-semibold text-red-700 text-sm">Original</h3>
                        <span className="text-[10px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{result.overallScore}%</span>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg max-h-64 overflow-y-auto">
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{text}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-green-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <h3 className="font-semibold text-green-700 text-sm">Improved</h3>
                        {gradeImprovement > 0 && (
                          <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">+{gradeImprovement}%</span>
                        )}
                      </div>
                      {improvedVersion ? (
                        <div className="p-3 bg-green-50 rounded-lg max-h-64 overflow-y-auto">
                          <p className="text-xs text-gray-600 whitespace-pre-wrap">{improvedVersion}</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg text-center py-12">
                          <p className="text-xs text-gray-400">Generate improved version first</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT - AI Chat */}
          {showChat && (
            <div className="w-64 bg-white border-l border-gray-100 flex flex-col shrink-0 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                    <MessageSquare className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-900">Writing Tutor</span>
                </div>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {chatMessages.length === 0 && (
                  <div className="space-y-1.5">
                    {["How to improve thesis?", "Explain this weakness", "Writing tips for intro"].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setChatInput(q)}
                        className="w-full text-left px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-[10px] text-gray-600 hover:border-blue-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[90%] px-2 py-1.5 rounded-xl text-[11px]", msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700")}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="bg-gray-100 px-2 py-1.5 rounded-xl w-fit">
                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-2 border-t border-gray-100 shrink-0">
                <div className="flex gap-1.5">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask..."
                    onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                    className="rounded-xl text-[11px] h-8"
                  />
                  <Button onClick={handleChatSubmit} size="sm" className="rounded-xl w-8 h-8 p-0 bg-blue-600">
                    <Send className="w-3 h-3" />
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
