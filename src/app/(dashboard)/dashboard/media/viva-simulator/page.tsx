"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import {
  MessageSquare,
  Loader2,
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle,
  XCircle,
  Lightbulb,
  User,
  Bot,
  RefreshCw,
  Play,
  Award,
  Target,
  Clock,
  Mic,
  MicOff,
  Timer,
  BookOpen,
  TrendingUp,
  Download,
  Trash2,
  Plus,
  ChevronRight,
  Star,
  Zap,
  Brain,
  GraduationCap,
  FileText,
  BarChart3,
  Settings,
  History,
  Pause,
  X,
  Check,
  Volume2,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import Link from "next/link";

interface QuestionHistory {
  question: string;
  translatedQuestion?: string;
  answer: string;
  feedback?: {
    score: number;
    strengths: string[];
    improvements: string[];
  };
  timestamp?: number;
}

interface VivaSession {
  id: string;
  topic: string;
  subject?: string;
  difficulty: string;
  history: QuestionHistory[];
  avgScore: number;
  createdAt: number;
  duration?: number;
}

interface VivaState {
  currentQuestion: string;
  translatedQuestion?: string;
  hint?: string;
  overallProgress?: string;
}

const EXAMINER_STYLES = [
  { id: "balanced", label: "Balanced", icon: Brain, desc: "Fair and thorough" },
  { id: "friendly", label: "Friendly", icon: Sparkles, desc: "Encouraging tone" },
  { id: "strict", label: "Strict", icon: GraduationCap, desc: "Challenging" },
];

const SUGGESTED_TOPICS = [
  { topic: "Photosynthesis", subject: "Biology" },
  { topic: "Data Structures", subject: "Computer Science" },
  { topic: "French Revolution", subject: "History" },
  { topic: "Thermodynamics", subject: "Physics" },
  { topic: "Macroeconomics", subject: "Economics" },
  { topic: "Cell Biology", subject: "Biology" },
];

export default function VivaSimulatorPage() {
  // Input state
  const [topic, setTopic] = usePersistedState("viva-topic", "");
  const [subject, setSubject] = usePersistedState("viva-subject", "");
  const [difficulty, setDifficulty] = usePersistedState("viva-difficulty", "intermediate");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("viva-model", "fast");
  const [examinerStyle, setExaminerStyle] = usePersistedState("viva-examiner", "balanced");

  // Session state
  const [sessions, setSessions] = usePersistedState<VivaSession[]>("viva-sessions", []);
  const [isLoading, setIsLoading] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [vivaState, setVivaState] = useState<VivaState | null>(null);
  const [history, setHistory] = useState<QuestionHistory[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Feature state
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timeLimit, setTimeLimit] = useState(60);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedSession, setSelectedSession] = useState<VivaSession | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLanguage, setTranslateLanguage] = usePersistedState("viva-translate-lang", "");
  const [translationError, setTranslationError] = useState(false);

  const LANGUAGES = [
    { code: "", label: "No Translation" },
    { code: "my", label: "မြန်မာ (Burmese)" },
    { code: "zh", label: "中文 (Chinese)" },
    { code: "ja", label: "日本語 (Japanese)" },
    { code: "ko", label: "한국어 (Korean)" },
    { code: "th", label: "ไทย (Thai)" },
    { code: "hi", label: "हिंदी (Hindi)" },
    { code: "es", label: "Español (Spanish)" },
    { code: "fr", label: "Français (French)" },
    { code: "de", label: "Deutsch (German)" },
    { code: "vi", label: "Tiếng Việt (Vietnamese)" },
  ];

  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("viva-simulator");

  useEffect(() => setMounted(true), []);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let extractedText = "";
      
      if (file.type === "application/pdf") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("toolId", "viva-simulator");
        const response = await fetch("/api/tools/parse-pdf", { method: "POST", body: formData });
        if (response.ok) {
          const data = await response.json();
          extractedText = data.text?.slice(0, 5000) || "";
        } else {
          toast({ title: "Failed to parse PDF", variant: "destructive" });
          return;
        }
      } else {
        extractedText = await file.text();
        extractedText = extractedText.slice(0, 5000);
      }

      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setUploadedFile({ name: file.name, content: extractedText });
      setTopic(fileName);
      toast({ title: "File uploaded successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to upload file", variant: "destructive" });
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setTopic("");
  };

  // Translate question
  const translateQuestion = async (question: string): Promise<string | undefined> => {
    const targetLang = translateLanguage || aiLanguage;
    if (!targetLang || targetLang === "en" || targetLang === "english") return undefined;
    
    setIsTranslating(true);
    setTranslationError(false);
    try {
      const response = await fetch("/api/tools/youtube/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: question,
          targetLanguage: targetLang,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTranslationError(false);
        return data.translatedText || data.translation;
      } else {
        setTranslationError(true);
      }
    } catch (e) {
      console.error("Translation error:", e);
      setTranslationError(true);
    } finally {
      setIsTranslating(false);
    }
    return undefined;
  };
  
  // Retry translation
  const retryTranslation = async () => {
    if (!vivaState?.currentQuestion) return;
    const translated = await translateQuestion(vivaState.currentQuestion);
    if (translated) {
      setVivaState(prev => prev ? { ...prev, translatedQuestion: translated } : null);
    }
  };

  // Auto-translate when language changes
  const currentTranslateLang = translateLanguage || "";
  useEffect(() => {
    if (!currentTranslateLang || !vivaStarted) return;
    
    const translateAll = async () => {
      // Translate current question
      if (vivaState?.currentQuestion) {
        const translated = await translateQuestion(vivaState.currentQuestion);
        if (translated) {
          setVivaState(prev => prev ? { ...prev, translatedQuestion: translated } : null);
        }
      }
      
      // Translate history questions that don't have translations
      if (history.length > 0) {
        const updatedHistory = [...history];
        for (let i = 0; i < updatedHistory.length; i++) {
          if (!updatedHistory[i].translatedQuestion && updatedHistory[i].question) {
            const translated = await translateQuestion(updatedHistory[i].question);
            if (translated) {
              updatedHistory[i] = { ...updatedHistory[i], translatedQuestion: translated };
            }
          }
        }
        setHistory(updatedHistory);
      }
    };
    
    translateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTranslateLang]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [history, vivaState]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      toast({ title: "Time's up! Submit your answer.", variant: "destructive" });
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timeRemaining, toast]);

  const startViva = async (customTopic?: string, customSubject?: string) => {
    const useTopic = customTopic || topic;
    const useSubject = customSubject || subject;
    const useContent = uploadedFile?.content || useTopic;

    if (useTopic.trim().length < 3) {
      toast({ title: "Topic must be at least 3 characters", variant: "destructive" });
      return;
    }

    setTopic(useTopic);
    if (useSubject) setSubject(useSubject);

    setIsLoading(true);
    setVivaStarted(true);
    setHistory([]);
    setSessionStartTime(Date.now());

    try {
      const response = await fetch("/api/tools/viva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: useTopic,
          content: useContent,
          subject: useSubject || undefined,
          difficulty,
          examinerStyle,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        setVivaStarted(false);
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        throw new Error("Failed");
      }

      const data = await response.json();
      
      // Show question immediately, translate in background
      setVivaState({
        currentQuestion: data.question,
        translatedQuestion: undefined,
        hint: data.hint,
      });
      
      // Translate in background (non-blocking)
      if (translateLanguage) {
        translateQuestion(data.question).then(translated => {
          if (translated) {
            setVivaState(prev => prev ? { ...prev, translatedQuestion: translated } : null);
          }
        });
      }

      if (timerEnabled) {
        setTimeRemaining(timeLimit);
        setIsTimerRunning(true);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
      setVivaStarted(false);
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim() || !vivaState) return;

    setIsLoading(true);
    setShowHint(false);
    setIsTimerRunning(false);

    try {
      const newHistory = [...history, { question: vivaState.currentQuestion, answer: currentAnswer, timestamp: Date.now() }];

      const response = await fetch("/api/tools/viva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          content: uploadedFile?.content || topic,
          subject: subject || undefined,
          difficulty,
          examinerStyle,
          answer: currentAnswer,
          questionHistory: newHistory,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        const errMsg = typeof errorData.error === "string" 
          ? errorData.error 
          : JSON.stringify(errorData.error) || "Failed";
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      const updatedHistory = [
        ...history,
        {
          question: vivaState.currentQuestion,
          translatedQuestion: vivaState.translatedQuestion,
          answer: currentAnswer,
          feedback: data.feedback,
          timestamp: Date.now(),
        },
      ];
      setHistory(updatedHistory);
      saveProject({
        inputData: { topic, subject, difficulty },
        outputData: { history: updatedHistory },
        settings: { examinerStyle, model: selectedModel },
        inputPreview: topic.slice(0, 200),
      });
      
      // Show next question immediately
      setVivaState({
        currentQuestion: data.followUpQuestion,
        translatedQuestion: undefined,
        hint: data.hint,
        overallProgress: data.overallProgress,
      });
      
      // Translate in background (non-blocking)
      if (translateLanguage) {
        translateQuestion(data.followUpQuestion).then(translated => {
          if (translated) {
            setVivaState(prev => prev ? { ...prev, translatedQuestion: translated } : null);
          }
        });
      }
      setCurrentAnswer("");

      if (timerEnabled) {
        setTimeRemaining(timeLimit);
        setIsTimerRunning(true);
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const endSession = () => {
    if (history.length > 0) {
      const avg = Math.round(history.reduce((acc, h) => acc + (h.feedback?.score || 0), 0) / history.length);
      const newSession: VivaSession = {
        id: `session_${Date.now()}`,
        topic,
        subject,
        difficulty,
        history,
        avgScore: avg,
        createdAt: Date.now(),
        duration: sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : undefined,
      };
      setSessions((prev) => [newSession, ...prev.slice(0, 19)]);
    }
    resetViva();
  };

  const resetViva = () => {
    setVivaStarted(false);
    setVivaState(null);
    setHistory([]);
    setCurrentAnswer("");
    setShowHint(false);
    setIsTimerRunning(false);
    setSessionStartTime(null);
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (selectedSession?.id === id) setSelectedSession(null);
  };

  const exportSession = (session: VivaSession) => {
    let content = `# Viva Session Report\n\n`;
    content += `**Topic:** ${session.topic}\n`;
    if (session.subject) content += `**Subject:** ${session.subject}\n`;
    content += `**Difficulty:** ${session.difficulty}\n`;
    content += `**Average Score:** ${session.avgScore}%\n`;
    content += `**Date:** ${new Date(session.createdAt).toLocaleDateString()}\n\n`;
    content += `---\n\n`;

    session.history.forEach((h, i) => {
      content += `## Question ${i + 1}\n`;
      content += `**Q:** ${h.question}\n\n`;
      content += `**A:** ${h.answer}\n\n`;
      if (h.feedback) {
        content += `**Score:** ${h.feedback.score}%\n`;
        content += `**Strengths:** ${h.feedback.strengths.join(", ")}\n`;
        content += `**Improvements:** ${h.feedback.improvements.join(", ")}\n`;
      }
      content += `\n---\n\n`;
    });

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viva-${session.topic.slice(0, 20)}.md`;
    a.click();
  };

  const avgScore = history.length > 0
    ? Math.round(history.reduce((acc, h) => acc + (h.feedback?.score || 0), 0) / history.length)
    : 0;

  const totalQuestions = sessions.reduce((acc, s) => acc + s.history.length, 0);
  const overallAvg = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + s.avgScore, 0) / sessions.length)
    : 0;

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h1 className="text-sm font-semibold text-gray-900">Viva Simulator</h1>
          <span className="text-[10px] text-gray-400">{sessions.length} sessions</span>
        </div>
        <div className="flex items-center gap-2">
          {!vivaStarted && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <Link href="/dashboard/media" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
            Media <ChevronRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[200px_1fr_220px] gap-2 overflow-hidden">
        {/* Left Sidebar - Sessions & Topics */}
        <div className="hidden lg:flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Quick Topics */}
          <div className="p-2 border-b border-gray-100">
            <span className="text-[10px] font-medium text-gray-500 px-1 mb-1 block">QUICK START</span>
            <div className="space-y-0.5">
              {SUGGESTED_TOPICS.slice(0, 4).map((t, i) => (
                <button
                  key={i}
                  onClick={() => startViva(t.topic, t.subject)}
                  disabled={vivaStarted}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="truncate">{t.topic}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Past Sessions */}
          <div className="flex-1 overflow-y-auto p-2">
            <span className="text-[10px] font-medium text-gray-500 px-1 mb-1 block">HISTORY</span>
            {sessions.length === 0 ? (
              <p className="text-[10px] text-gray-400 px-1">No sessions yet</p>
            ) : (
              <div className="space-y-1">
                {sessions.slice(0, 10).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                    className={`w-full p-2 rounded-lg text-left transition-all ${
                      selectedSession?.id === session.id ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-800 truncate">{session.topic}</span>
                      <span className={`text-[10px] font-bold ${
                        session.avgScore >= 80 ? "text-green-600" :
                        session.avgScore >= 60 ? "text-amber-600" : "text-red-500"
                      }`}>
                        {session.avgScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-gray-400">{session.history.length} Q</span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] text-gray-400 capitalize">{session.difficulty.slice(0, 3)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="p-2 border-t border-gray-100 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-base lg:text-lg font-bold text-gray-900">{totalQuestions}</p>
                <p className="text-[10px] text-gray-500">Total Qs</p>
              </div>
              <div className="text-center">
                <p className="text-base lg:text-lg font-bold text-blue-600">{overallAvg}%</p>
                <p className="text-[10px] text-gray-500">Avg Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col min-h-0">
          {!vivaStarted ? (
            /* Start Screen */
            <div className="h-full bg-white rounded-xl border border-gray-200 flex flex-col">
              {/* Settings Panel */}
              {showSettings && (
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Session Settings</span>
                    <button onClick={() => setShowSettings(false)} className="p-0.5 hover:bg-gray-200 rounded">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Timer */}
                    <div className="p-2 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500">Timer</span>
                        <button
                          onClick={() => setTimerEnabled(!timerEnabled)}
                          className={`w-8 h-4 rounded-full transition-all ${timerEnabled ? "bg-blue-500" : "bg-gray-200"}`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white shadow transition-all ${timerEnabled ? "ml-4" : "ml-0.5"}`} />
                        </button>
                      </div>
                      {timerEnabled && (
                        <select
                          value={timeLimit}
                          onChange={(e) => setTimeLimit(Number(e.target.value))}
                          className="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5"
                        >
                          <option value={30}>30 sec</option>
                          <option value={60}>1 min</option>
                          <option value={120}>2 min</option>
                          <option value={180}>3 min</option>
                        </select>
                      )}
                    </div>

                    {/* Examiner Style */}
                    <div className="p-2 bg-white rounded-lg border border-gray-200 col-span-2">
                      <span className="text-[10px] text-gray-500 mb-1 block">Examiner Style</span>
                      <div className="flex gap-1">
                        {EXAMINER_STYLES.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setExaminerStyle(style.id)}
                            className={`flex-1 py-1 rounded text-[10px] font-medium ${
                              examinerStyle === style.id
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-50 text-gray-600"
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Session View */}
              {selectedSession ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedSession.topic}</h3>
                      <p className="text-[10px] text-gray-500">
                        {selectedSession.subject} • {new Date(selectedSession.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => exportSession(selectedSession)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => deleteSession(selectedSession.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                      <button
                        onClick={() => setSelectedSession(null)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {selectedSession.history.map((h, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs font-medium text-gray-800">Q{i + 1}: {h.question}</p>
                          {h.feedback && (
                            <span className={`text-xs font-bold ${
                              h.feedback.score >= 80 ? "text-green-600" :
                              h.feedback.score >= 60 ? "text-amber-600" : "text-red-500"
                            }`}>
                              {h.feedback.score}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{h.answer}</p>
                        {h.feedback && (
                          <div className="space-y-1">
                            {h.feedback.strengths.map((s, j) => (
                              <p key={j} className="text-[10px] text-green-600 flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> {s}
                              </p>
                            ))}
                            {h.feedback.improvements.map((s, j) => (
                              <p key={j} className="text-[10px] text-amber-600 flex items-center gap-1">
                                <XCircle className="w-2.5 h-2.5" /> {s}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* New Session Form */
                <div className="flex-1 flex items-center justify-center p-3 lg:p-6">
                  <div className="w-full max-w-md">
                    <div className="text-center mb-4">
                      <GraduationCap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h2 className="text-base lg:text-lg font-bold text-gray-900">Start Viva Practice</h2>
                      <p className="text-xs text-gray-500">Practice oral exams with AI examiner</p>
                    </div>

                    <div className="space-y-3">
                      {/* File Upload */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.txt,.md,.doc,.docx"
                        className="hidden"
                      />

                      {uploadedFile ? (
                        /* Uploaded File Display */
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{uploadedFile.name}</p>
                                <p className="text-[10px] text-gray-500">{uploadedFile.content.length.toLocaleString()} chars</p>
                              </div>
                            </div>
                            <button
                              onClick={removeUploadedFile}
                              className="p-1 hover:bg-blue-100 rounded shrink-0"
                            >
                              <X className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Upload Button & Topic Input */
                        <>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full p-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                          >
                            <Upload className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">Upload PDF, DOC, or TXT file</span>
                          </button>

                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center">
                              <span className="bg-white px-2 text-[10px] text-gray-400">or enter topic</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Topic *</label>
                            <textarea
                              placeholder="e.g., Photosynthesis, Machine Learning, or paste content from your notes..."
                              value={topic}
                              onChange={(e) => setTopic(e.target.value)}
                              className="w-full h-20 px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 mb-1 block">Subject</label>
                          <Input
                            placeholder="e.g., Biology"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 mb-1 block">Difficulty</label>
                          <div className="flex bg-gray-100 rounded-lg p-0.5 h-9">
                            {["beginner", "intermediate", "advanced"].map((d) => (
                              <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`flex-1 text-[10px] font-medium rounded capitalize transition-all ${
                                  difficulty === d
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500"
                                }`}
                              >
                                {d.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex-1">
                          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                        </div>
                        <Button
                          onClick={() => startViva()}
                          disabled={isLoading || topic.trim().length < 5}
                          className="h-10 px-6 bg-blue-600 hover:bg-blue-700"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>Start <Play className="w-3.5 h-3.5 ml-1" /></>
                          )}
                        </Button>
                      </div>

                      <p className="text-[10px] text-gray-400 text-center">
                        2 credits per question
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Viva Session Chat */
            <div className="h-full bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="min-h-[3.5rem] py-2 px-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI Examiner</p>
                    <p className="text-[10px] text-gray-500 truncate max-w-[150px] lg:max-w-none">{topic} • {difficulty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {timerEnabled && isTimerRunning && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                      timeRemaining <= 10 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      <Timer className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">
                        {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}
                      </span>
                    </div>
                  )}
                  {/* Translate Language Selector */}
                  <div className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400">
                      <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                    </svg>
                    <select
                      value={translateLanguage}
                      onChange={(e) => setTranslateLanguage(e.target.value)}
                      className="text-[10px] bg-gray-100 border-0 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                    {isTranslating && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                  </div>
                  <button
                    onClick={endSession}
                    className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    End Session
                  </button>
                </div>
              </div>

              {/* Messages - Perplexity Style */}
              <div ref={chatRef} className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 lg:space-y-4">
                {history.map((item, i) => (
                  <div key={i} className="space-y-3">
                    {/* Question Card - Perplexity Style */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      {/* Question Header */}
                      <div className="px-3 lg:px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Bot className="w-3 h-3 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">Examiner</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                          Question {i + 1}
                        </span>
                      </div>
                      
                      {/* Question Content */}
                      <div className="p-3 lg:p-4">
                        <p className="text-sm text-gray-800 leading-relaxed">{item.question}</p>
                        
                        {/* Translation */}
                        {item.translatedQuestion && translateLanguage && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500">
                                <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                              </svg>
                              <span className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">
                                {LANGUAGES.find(l => l.code === translateLanguage)?.label || "Translation"}
                              </span>
                            </div>
                            <p className="text-sm text-blue-800 leading-relaxed">{item.translatedQuestion}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Answer Card */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 lg:p-4 ml-3 lg:ml-6">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-blue-900">Your Answer</span>
                          </div>
                          <p className="text-sm text-blue-800 leading-relaxed">{item.answer}</p>
                        </div>
                      </div>
                    </div>

                    {/* Feedback Card - Perplexity Style */}
                    {item.feedback && (
                      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm ml-3 lg:ml-6">
                        {/* Score Header with Expression */}
                        <div className={`p-3 lg:p-4 ${
                          item.feedback.score >= 80 ? "bg-gradient-to-r from-green-50 to-emerald-50" :
                          item.feedback.score >= 60 ? "bg-gradient-to-r from-amber-50 to-yellow-50" :
                          "bg-gradient-to-r from-red-50 to-orange-50"
                        }`}>
                          <div className="flex items-center gap-3 lg:gap-4">
                            {/* Expression SVG */}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                              item.feedback.score >= 80 ? "bg-green-100" :
                              item.feedback.score >= 60 ? "bg-amber-100" : "bg-red-100"
                            }`}>
                              {item.feedback.score >= 80 ? (
                                <svg viewBox="0 0 36 36" className="w-10 h-10">
                                  <circle cx="18" cy="18" r="16" fill="#22c55e" />
                                  <circle cx="12" cy="14" r="2" fill="white" />
                                  <circle cx="24" cy="14" r="2" fill="white" />
                                  <path d="M10 22 Q18 28 26 22" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                                  <text x="18" y="6" textAnchor="middle" fontSize="8" fill="#22c55e">✨</text>
                                </svg>
                              ) : item.feedback.score >= 60 ? (
                                <svg viewBox="0 0 36 36" className="w-10 h-10">
                                  <circle cx="18" cy="18" r="16" fill="#f59e0b" />
                                  <circle cx="12" cy="14" r="2" fill="white" />
                                  <circle cx="24" cy="14" r="2" fill="white" />
                                  <line x1="11" y1="23" x2="25" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 36 36" className="w-10 h-10">
                                  <circle cx="18" cy="18" r="16" fill="#ef4444" />
                                  <circle cx="12" cy="14" r="2" fill="white" />
                                  <circle cx="24" cy="14" r="2" fill="white" />
                                  <path d="M10 26 Q18 20 26 26" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                                </svg>
                              )}
                            </div>

                            {/* Score Display */}
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black ${
                                  item.feedback.score >= 80 ? "text-green-600" :
                                  item.feedback.score >= 60 ? "text-amber-600" : "text-red-500"
                                }`}>
                                  {item.feedback.score}
                                </span>
                                <span className="text-sm text-gray-500">/100</span>
                              </div>
                              <p className={`text-xs font-medium ${
                                item.feedback.score >= 80 ? "text-green-700" :
                                item.feedback.score >= 60 ? "text-amber-700" : "text-red-600"
                              }`}>
                                {item.feedback.score >= 80 ? "Excellent! Great understanding" :
                                 item.feedback.score >= 60 ? "Good attempt, room to improve" :
                                 "Needs more work on this topic"}
                              </p>
                            </div>

                            {/* Score Ring */}
                            <div className="relative w-14 h-14">
                              <svg className="w-14 h-14 -rotate-90">
                                <circle cx="28" cy="28" r="24" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                                <circle
                                  cx="28" cy="28" r="24" fill="none"
                                  stroke={item.feedback.score >= 80 ? "#22c55e" : item.feedback.score >= 60 ? "#f59e0b" : "#ef4444"}
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeDasharray={`${item.feedback.score * 1.5} 150`}
                                />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Feedback Content */}
                        <div className="p-3 lg:p-4 space-y-3">
                          {/* Strengths */}
                          {item.feedback.strengths.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-xs font-semibold text-green-700">Strengths</span>
                              </div>
                              <div className="space-y-1.5 pl-6">
                                {item.feedback.strengths.map((s, j) => (
                                  <div key={j} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                                    <p className="text-xs text-gray-600">{s}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Improvements */}
                          {item.feedback.improvements.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                                  <Lightbulb className="w-3 h-3 text-amber-600" />
                                </div>
                                <span className="text-xs font-semibold text-amber-700">To Improve</span>
                              </div>
                              <div className="space-y-1.5 pl-6">
                                {item.feedback.improvements.map((s, j) => (
                                  <div key={j} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                    <p className="text-xs text-gray-600">{s}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Current Question - Perplexity Style */}
                {vivaState && !isLoading && (
                  <div className="bg-white border-2 border-blue-200 rounded-2xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2">
                    {/* Question Header */}
                    <div className="px-3 lg:px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-blue-900">Examiner</span>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                          Q{history.length + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-medium text-green-700">Waiting for answer</span>
                      </div>
                    </div>
                    
                    {/* Question Content */}
                    <div className="p-3 lg:p-4">
                      <p className="text-sm text-gray-800 leading-relaxed">{vivaState.currentQuestion}</p>
                      
                      {/* Translation */}
                      {vivaState.translatedQuestion && translateLanguage && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500">
                              <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                            </svg>
                            <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">
                              {LANGUAGES.find(l => l.code === translateLanguage)?.label || "Translation"}
                            </span>
                          </div>
                          <p className="text-sm text-blue-800 leading-relaxed">
                            {vivaState.translatedQuestion}
                          </p>
                        </div>
                      )}
                      
                      {/* Translating indicator */}
                      {isTranslating && translateLanguage && !vivaState.translatedQuestion && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          <span className="text-xs text-gray-500">Translating...</span>
                        </div>
                      )}
                      
                      {/* Translation error with retry button */}
                      {translationError && translateLanguage && !vivaState.translatedQuestion && !isTranslating && (
                        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-red-600">Translation failed</span>
                          </div>
                          <button
                            onClick={retryTranslation}
                            className="flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                          </button>
                        </div>
                      )}

                      {/* Hint Button */}
                      {vivaState.hint && (
                        <div className="mt-4">
                          <button
                            onClick={() => setShowHint(!showHint)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              showHint 
                                ? "bg-amber-100 text-amber-700" 
                                : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                            }`}
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            {showHint ? "Hide Hint" : "Need a hint?"}
                          </button>
                          {showHint && (
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                              <div className="flex items-center gap-1.5 mb-1">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-500">
                                  <circle cx="12" cy="12" r="10" fill="currentColor" />
                                  <path d="M12 7v4M12 15h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span className="text-[10px] font-semibold text-amber-700">HINT</span>
                              </div>
                              <p className="text-xs text-amber-800">{vivaState.hint}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0 animate-pulse">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-900">Examiner</span>
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-3 bg-gray-200 rounded-full w-3/4 animate-pulse" />
                          <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <textarea
                    placeholder="Type your answer..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="flex-1 min-h-[40px] max-h-[100px] px-3 py-2 text-xs border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitAnswer();
                      }
                    }}
                  />
                  <Button
                    onClick={submitAnswer}
                    disabled={isLoading || !currentAnswer.trim()}
                    className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Stats */}
        <div className="hidden lg:flex flex-col gap-2 overflow-hidden">
          {/* Current Session Stats */}
          {vivaStarted && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-medium text-gray-500">CURRENT SESSION</span>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${
                    avgScore >= 80 ? "text-green-600" :
                    avgScore >= 60 ? "text-amber-600" :
                    avgScore > 0 ? "text-red-500" : "text-gray-300"
                  }`}>
                    {avgScore || "—"}%
                  </p>
                  <p className="text-[10px] text-gray-500">Avg Score</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{history.length}</p>
                    <p className="text-[10px] text-gray-500">Questions</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-blue-600">
                      {sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : 0}m
                    </p>
                    <p className="text-[10px] text-gray-500">Duration</p>
                  </div>
                </div>
              </div>

              {vivaState?.overallProgress && (
                <div className="bg-blue-50 rounded-xl border border-blue-100 p-3">
                  <p className="text-[10px] font-medium text-blue-800 mb-1">Progress Note</p>
                  <p className="text-xs text-blue-700">{vivaState.overallProgress}</p>
                </div>
              )}
            </>
          )}

          {/* Overall Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-medium text-gray-500">ALL TIME</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Sessions</span>
                <span className="text-xs font-bold text-gray-900">{sessions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Questions</span>
                <span className="text-xs font-bold text-gray-900">{totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Avg Score</span>
                <span className={`text-xs font-bold ${
                  overallAvg >= 80 ? "text-green-600" :
                  overallAvg >= 60 ? "text-amber-600" : "text-gray-900"
                }`}>
                  {overallAvg}%
                </span>
              </div>
            </div>
          </div>

          {/* Score Distribution */}
          {sessions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <span className="text-[10px] font-medium text-gray-500 mb-2 block">SCORE TREND</span>
              <div className="flex items-end gap-1 h-16">
                {sessions.slice(0, 10).reverse().map((s, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${
                      s.avgScore >= 80 ? "bg-green-400" :
                      s.avgScore >= 60 ? "bg-amber-400" : "bg-red-400"
                    }`}
                    style={{ height: `${Math.max(10, s.avgScore)}%` }}
                    title={`${s.topic}: ${s.avgScore}%`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
            <div className="flex items-center gap-1 mb-1">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-medium text-gray-600">TIP</span>
            </div>
            <p className="text-[10px] text-gray-500">
              {vivaStarted
                ? "Take your time to structure your answer before submitting."
                : "Start with familiar topics to build confidence."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
