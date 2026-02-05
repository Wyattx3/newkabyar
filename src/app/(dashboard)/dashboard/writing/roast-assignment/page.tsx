"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Eye, Brain, Hash, AlignLeft, MoreHorizontal, Globe, Smile, Image,
  Link2, Calendar, MapPin, Users, Heart, MessageCircle, Repeat2, ExternalLink,
  Settings, HelpCircle, Bell, Search, Home, Grid3X3, Play, Pause, RotateCcw,
  Gauge, Shield, Quote, Palette, BookMarked, FileBarChart, Wand2
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
  { id: "professional", label: "Professional" },
];

const ROAST_INTENSITIES = [
  { id: "gentle", label: "Gentle", desc: "Encouraging feedback" },
  { id: "balanced", label: "Balanced", desc: "Fair critique" },
  { id: "brutal", label: "Brutal", desc: "No mercy" },
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
  const [showOptions, setShowOptions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
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
  const [gradeImprovement, setGradeImprovement] = useState(0);
  const [activeTab, setActiveTab] = useState<"feedback" | "improved" | "stats">("feedback");
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  
  // NEW FEATURES (10 additional)
  const [wordGoal, setWordGoal] = usePersistedState("roast-word-goal", 500);
  const [showWordGoal, setShowWordGoal] = useState(false);
  const [readabilityScore, setReadabilityScore] = useState<number | null>(null);
  const [toneAnalysis, setToneAnalysis] = useState<string | null>(null);
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [citationCount, setCitationCount] = useState(0);
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | "txt">("pdf");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<number[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  
  useEffect(() => {
    const chatContainer = chatEndRef.current?.parentElement;
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
  }, [chatMessages]);

  // Calculate text statistics
  const wordCount = text.trim().split(/\s+/).filter(w => w).length;
  const charCount = text.length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const paragraphCount = text.split(/\n\n+/).filter(p => p.trim()).length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
  const readingTime = Math.ceil(wordCount / 200);
  const wordGoalProgress = Math.min(100, Math.round((wordCount / wordGoal) * 100));

  // NEW: Calculate Flesch-Kincaid readability
  useEffect(() => {
    if (wordCount > 50) {
      const syllables = text.toLowerCase().replace(/[^a-z]/g, "").split("").filter((c, i, arr) => {
        const vowels = "aeiou";
        const isVowel = vowels.includes(c);
        const prevIsVowel = i > 0 && vowels.includes(arr[i - 1]);
        return isVowel && !prevIsVowel;
      }).length;
      const score = 206.835 - (1.015 * (wordCount / sentenceCount)) - (84.6 * (syllables / wordCount));
      setReadabilityScore(Math.round(Math.max(0, Math.min(100, score))));
    }
  }, [text, wordCount, sentenceCount]);

  // NEW: Count citations
  useEffect(() => {
    const citationPatterns = [
      /\([A-Z][a-z]+,?\s*\d{4}\)/g, // (Author, 2024)
      /\[\d+\]/g, // [1]
      /\([^)]*et al[^)]*\)/g, // (Author et al., 2024)
    ];
    let count = 0;
    citationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    });
    setCitationCount(count);
  }, [text]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter" && !isLoading && text.length >= 100) {
          e.preventDefault();
          handleRoast();
        }
        if (e.key === "k") {
          e.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [text, isLoading, showKeyboardShortcuts]);

  const hasResult = !!result;

  // NEW: Analyze tone
  const analyzeTone = async () => {
    if (text.length < 100) return;
    setIsAnalyzingTone(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Analyze the tone of this text in 2-3 words only (e.g., "Formal & Academic", "Casual & Friendly", "Professional & Persuasive"):\n\n${text.substring(0, 1000)}`
          }],
          feature: "answer",
          model: "fast",
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
      setToneAnalysis(content.trim().substring(0, 30));
    } catch {
      setToneAnalysis("Unable to analyze");
    } finally {
      setIsAnalyzingTone(false);
    }
  };

  // Drag and drop handler
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  const processFile = async (file: File) => {
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
  };

  const handleRoast = async () => {
    if (text.trim().length < 100) {
      toast({ title: "Please enter at least 100 characters", variant: "destructive" });
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
      
      const potentialImprovement = Math.min(20, Math.round((100 - data.overallScore) * 0.6));
      setGradeImprovement(potentialImprovement);
      
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

  const speakFeedback = () => {
    if (!result) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const spokenText = `Your grade is ${result.overallGrade}, with a score of ${result.overallScore} percent. ${result.verdict}. Main strengths: ${result.strengths.slice(0, 2).join(". ")}. Areas to improve: ${result.weaknesses.slice(0, 2).map(w => w.issue).join(". ")}.`;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const copyFeedback = () => {
    if (!result) return;
    let feedbackText = `Grade: ${result.overallGrade} (${result.overallScore}%)\n\n`;
    feedbackText += `Verdict: ${result.verdict}\n\n`;
    feedbackText += `Strengths:\n${result.strengths.map(s => `• ${s}`).join("\n")}\n\n`;
    feedbackText += `Weaknesses:\n${result.weaknesses.map(w => `• ${w.issue}: ${w.fix}`).join("\n")}\n\n`;
    feedbackText += `Quick Fixes:\n${result.quickFixes.map(f => `• ${f}`).join("\n")}`;
    navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Feedback copied to clipboard" });
  };

  // NEW: Export report
  const exportReport = () => {
    if (!result) return;
    const content = `
ASSIGNMENT FEEDBACK REPORT
==========================

Grade: ${result.overallGrade} (${result.overallScore}%)
${result.verdict}

STRENGTHS
---------
${result.strengths.map(s => `• ${s}`).join("\n")}

AREAS FOR IMPROVEMENT
--------------------
${result.weaknesses.map(w => `• ${w.issue}\n  Fix: ${w.fix}`).join("\n\n")}

QUICK FIXES
-----------
${result.quickFixes.map(f => `• ${f}`).join("\n")}

RUBRIC BREAKDOWN
----------------
${result.rubric.map(r => `${r.category}: ${r.score}%`).join("\n")}

---
Generated by Kay AI - Roast My Assignment
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assignment-feedback-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
    setShowExportMenu(false);
  };

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
        toast({ title: "Copied to clipboard" });
      }
    } catch {
      toast({ title: "Couldn't share", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-green-600";
    if (grade.startsWith("B")) return "text-blue-600";
    if (grade.startsWith("C")) return "text-amber-600";
    return "text-red-600";
  };

  const getGradeBg = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-50";
    if (grade.startsWith("B")) return "bg-blue-50";
    if (grade.startsWith("C")) return "bg-amber-50";
    return "bg-red-50";
  };

  const reset = () => {
    setResult(null);
    setImprovedVersion("");
    setChatMessages([]);
    setBookmarked(false);
    setActiveTab("feedback");
    setSelectedWeaknesses([]);
  };

  if (!mounted) return null;

  return (
    <div className={cn("min-h-screen bg-gray-50", focusMode && "bg-white")}>
      {/* Facebook-style Top Navigation */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-14 flex items-center justify-between">
            {/* Left - Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 text-base">Roast My Assignment</h1>
                <p className="text-xs text-gray-500">Get honest feedback on your work</p>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors",
                    showHistoryPanel ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-600"
                  )}
                >
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                  <span className="w-5 h-5 rounded-full bg-gray-200 text-xs flex items-center justify-center">{history.length}</span>
                </button>
              )}
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  focusMode ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500"
                )}
                title="Focus Mode"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                title="Keyboard Shortcuts (Ctrl+K)"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { keys: "Ctrl + Enter", action: "Roast assignment" },
                { keys: "Ctrl + K", action: "Toggle shortcuts" },
                { keys: "Escape", action: "Close dialogs" },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">{shortcut.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {!hasResult ? (
          /* INPUT STATE - Clean Facebook-style Card */
          <div className="space-y-4">
            {/* Main Input Card */}
            <div 
              className={cn(
                "bg-white rounded-2xl shadow-sm border transition-all",
                isDragging ? "border-blue-400 ring-4 ring-blue-50" : "border-gray-200"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 text-sm">Paste your assignment here...</p>
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div className="p-4">
                <Textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Start typing or paste your essay, research paper, report, or any assignment you want feedback on..."
                  className="w-full min-h-[200px] border-0 shadow-none focus-visible:ring-0 text-base resize-none placeholder:text-gray-400"
                />

                {/* Drag overlay */}
                {isDragging && (
                  <div className="absolute inset-0 bg-blue-50/80 rounded-2xl flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <FileUp className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                      <p className="text-blue-600 font-medium">Drop file here</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              {text.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Hash className="w-4 h-4" />
                    <span className="font-medium text-gray-700">{wordCount}</span> words
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <AlignLeft className="w-4 h-4" />
                    <span className="font-medium text-gray-700">{paragraphCount}</span> paragraphs
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium text-gray-700">{readingTime}</span> min read
                  </div>
                  {citationCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Quote className="w-4 h-4" />
                      <span className="font-medium text-gray-700">{citationCount}</span> citations
                    </div>
                  )}
                  {readabilityScore !== null && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Gauge className="w-4 h-4" />
                      <span className="font-medium text-gray-700">{readabilityScore}</span> readability
                    </div>
                  )}
                  
                  {/* Word Goal Progress */}
                  <button
                    onClick={() => setShowWordGoal(!showWordGoal)}
                    className="ml-auto flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600"
                  >
                    <Target className="w-4 h-4" />
                    <span>{wordGoalProgress}% of goal</span>
                  </button>
                </div>
              )}

              {/* Word Goal Slider */}
              {showWordGoal && (
                <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-blue-700">Word Goal:</span>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="100"
                      value={wordGoal}
                      onChange={(e) => setWordGoal(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-blue-700 w-16 text-right">{wordGoal} words</span>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                {/* Left Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <FileUp className="w-5 h-5" />
                    <span className="text-sm hidden sm:inline">Upload</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                  
                  <button
                    onClick={analyzeTone}
                    disabled={isAnalyzingTone || text.length < 100}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {isAnalyzingTone ? <Loader2 className="w-5 h-5 animate-spin" /> : <Palette className="w-5 h-5" />}
                    <span className="text-sm hidden sm:inline">
                      {toneAnalysis || "Analyze Tone"}
                    </span>
                  </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                      showOptions ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-600"
                    )}
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm hidden sm:inline">Options</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showOptions && "rotate-180")} />
                  </button>

                  <div className="w-px h-6 bg-gray-200 hidden sm:block" />

                  <div className="bg-gray-100 rounded-lg px-2 py-1">
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>

                  <Button
                    onClick={handleRoast}
                    disabled={isLoading || text.trim().length < 100}
                    className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Flame className="w-5 h-5 mr-2" />
                        Roast It
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Options Panel */}
            {showOptions && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Assignment Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Assignment Type</label>
                    <div className="space-y-1">
                      {ASSIGNMENT_TYPES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setType(t.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                            type === t.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-600"
                          )}
                        >
                          <t.icon className="w-4 h-4" />
                          {t.label}
                          {type === t.id && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grade Level */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Academic Level</label>
                    <div className="space-y-1">
                      {GRADE_LEVELS.map(l => (
                        <button
                          key={l.id}
                          onClick={() => setLevel(l.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                            level === l.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-600"
                          )}
                        >
                          <GraduationCap className="w-4 h-4" />
                          {l.label}
                          {level === l.id && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Intensity */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Feedback Intensity</label>
                    <div className="space-y-1">
                      {ROAST_INTENSITIES.map(i => (
                        <button
                          key={i.id}
                          onClick={() => setIntensity(i.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                            intensity === i.id 
                              ? i.id === "brutal" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                              : "hover:bg-gray-50 text-gray-600"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Flame className={cn("w-4 h-4", i.id === "brutal" && "text-red-500")} />
                            <div className="text-left">
                              <div>{i.label}</div>
                              <div className="text-xs opacity-70">{i.desc}</div>
                            </div>
                          </div>
                          {intensity === i.id && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Panel */}
            {showHistoryPanel && history.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Recent Roasts</h3>
                  <button onClick={() => setHistory([])} className="text-sm text-red-500 hover:text-red-600">Clear all</button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {history.slice(0, 6).map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold", getGradeBg(h.grade), getGradeColor(h.grade))}>
                        {h.grade}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{h.preview}</p>
                        <p className="text-xs text-gray-400">{h.score}% • {new Date(h.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credits Info */}
            <div className="text-center text-sm text-gray-400">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Uses 4 credits per roast
              </span>
            </div>
          </div>
        ) : (
          /* RESULTS STATE - Clean Facebook-style Layout */
          <div className="space-y-4">
            {/* Result Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* Grade Badge */}
                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg", getGradeBg(result.overallGrade), getGradeColor(result.overallGrade))}>
                  {result.overallGrade}
                </div>

                {/* Score & Verdict */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          result.overallScore >= 80 ? "bg-green-500" : result.overallScore >= 60 ? "bg-blue-500" : result.overallScore >= 40 ? "bg-amber-500" : "bg-red-500"
                        )} 
                        style={{ width: `${result.overallScore}%` }} 
                      />
                    </div>
                    <span className="text-xl font-bold text-gray-700">{result.overallScore}%</span>
                  </div>
                  <p className="text-gray-600">{result.verdict}</p>
                  
                  {gradeImprovement > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Potential +{gradeImprovement}% improvement</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={reset}
                    className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    title="New roast"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setBookmarked(!bookmarked)}
                    className={cn("p-2.5 rounded-full transition-colors", bookmarked ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}
                    title="Bookmark"
                  >
                    {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={speakFeedback}
                    className={cn("p-2.5 rounded-full transition-colors", isSpeaking ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}
                    title={isSpeaking ? "Stop" : "Read aloud"}
                  >
                    {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={copyFeedback}
                    className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                      title="Export"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 w-40 z-10">
                        <button onClick={exportReport} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Export as TXT
                        </button>
                        <button onClick={shareResults} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="border-b border-gray-100">
                <div className="flex">
                  {[
                    { id: "feedback", label: "Feedback", icon: Target },
                    { id: "improved", label: "Improved Version", icon: Wand2 },
                    { id: "stats", label: "Detailed Stats", icon: BarChart3 },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors",
                        activeTab === tab.id 
                          ? "border-blue-600 text-blue-600" 
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === "feedback" && (
                  <div className="space-y-6">
                    {/* Strengths */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">What's Working Well</h3>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{result.strengths.length}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {result.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-green-800">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weaknesses */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Areas for Improvement</h3>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{result.weaknesses.length}</span>
                      </div>
                      <div className="space-y-3">
                        {result.weaknesses.map((w, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "p-4 rounded-xl border transition-all cursor-pointer",
                              selectedWeaknesses.includes(i) ? "bg-red-50 border-red-200" : "bg-white border-gray-200 hover:border-red-200"
                            )}
                            onClick={() => setSelectedWeaknesses(prev => 
                              prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 mb-1">{w.issue}</p>
                                {selectedWeaknesses.includes(i) && (
                                  <div className="mt-3 p-3 bg-white rounded-lg border border-red-100">
                                    <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                                      <Lightbulb className="w-3 h-3" /> How to fix:
                                    </div>
                                    <p className="text-sm text-gray-600">{w.fix}</p>
                                  </div>
                                )}
                              </div>
                              <ChevronRight className={cn("w-5 h-5 text-gray-400 transition-transform", selectedWeaknesses.includes(i) && "rotate-90")} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Fixes */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Quick Wins</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.quickFixes.map((fix, i) => (
                          <div key={i} className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full text-sm text-amber-800">
                            <TrendingUp className="w-4 h-4" />
                            {fix}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "improved" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">AI-Improved Version</h3>
                      </div>
                      <Button
                        onClick={generateImprovedVersion}
                        disabled={isGeneratingImproved}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                      >
                        {isGeneratingImproved ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                        ) : improvedVersion ? (
                          <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" /> Generate</>
                        )}
                      </Button>
                    </div>

                    {improvedVersion ? (
                      <div className="relative">
                        <div className="p-6 bg-blue-50 rounded-xl">
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{improvedVersion}</p>
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(improvedVersion);
                              toast({ title: "Copied improved version" });
                            }}
                            className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-gray-50 rounded-xl">
                        <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Generate an AI-improved version of your assignment</p>
                        <p className="text-sm text-gray-400">Based on the feedback, we'll rewrite your work to score higher</p>
                      </div>
                    )}

                    {/* Side-by-side comparison */}
                    {improvedVersion && (
                      <div className="grid md:grid-cols-2 gap-4 mt-6">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                          <div className="flex items-center gap-2 mb-3">
                            <X className="w-4 h-4 text-red-500" />
                            <span className="font-medium text-red-700">Original</span>
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{result.overallScore}%</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-6">{text}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="font-medium text-green-700">Improved</span>
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">+{gradeImprovement}%</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-6">{improvedVersion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "stats" && (
                  <div className="space-y-6">
                    {/* Rubric Breakdown */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Rubric Breakdown</h3>
                      <div className="space-y-3">
                        {result.rubric.map((item, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-700">{item.category}</span>
                              <span className={cn(
                                "font-bold",
                                item.score >= 80 ? "text-green-600" : item.score >= 60 ? "text-blue-600" : item.score >= 40 ? "text-amber-600" : "text-red-600"
                              )}>{item.score}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  item.score >= 80 ? "bg-green-500" : item.score >= 60 ? "bg-blue-500" : item.score >= 40 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${item.score}%` }}
                              />
                            </div>
                            <p className="text-sm text-gray-500">{item.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Text Statistics */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Text Analysis</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Words", value: wordCount, icon: Hash },
                          { label: "Sentences", value: sentenceCount, icon: AlignLeft },
                          { label: "Paragraphs", value: paragraphCount, icon: FileText },
                          { label: "Avg. Words/Sentence", value: avgWordsPerSentence, icon: Brain },
                          { label: "Reading Time", value: `${readingTime} min`, icon: Clock },
                          { label: "Citations", value: citationCount, icon: Quote },
                          { label: "Readability", value: readabilityScore || "N/A", icon: Gauge },
                          { label: "Characters", value: charCount, icon: Target },
                        ].map((stat, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl text-center">
                            <stat.icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-700">{stat.value}</div>
                            <div className="text-xs text-gray-500">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Tutor Chat */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <button
                onClick={() => setShowChat(!showChat)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">AI Writing Tutor</h3>
                    <p className="text-sm text-gray-500">Ask questions about your feedback</p>
                  </div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform", showChat && "rotate-180")} />
              </button>

              {showChat && (
                <div className="border-t border-gray-100">
                  <div className="h-64 overflow-y-auto p-4 space-y-3">
                    {chatMessages.length === 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          "How can I improve my thesis?",
                          "Explain my weaknesses",
                          "Tips for better writing",
                          "How to fix grammar issues?"
                        ].map((q, i) => (
                          <button
                            key={i}
                            onClick={() => setChatInput(q)}
                            className="p-3 bg-gray-50 rounded-xl text-sm text-gray-600 text-left hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[80%] px-4 py-3 rounded-2xl text-sm",
                          msg.role === "user" ? "bg-blue-600 text-white rounded-br-md" : "bg-gray-100 text-gray-700 rounded-bl-md"
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md w-fit">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask a question..."
                        onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                        className="rounded-xl"
                      />
                      <Button onClick={handleChatSubmit} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
