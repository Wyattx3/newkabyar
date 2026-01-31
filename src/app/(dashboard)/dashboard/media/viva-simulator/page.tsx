"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Play,
  Award,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface QuestionHistory {
  question: string;
  answer: string;
  feedback?: {
    score: number;
    strengths: string[];
    improvements: string[];
  };
}

interface VivaState {
  currentQuestion: string;
  hint?: string;
  overallProgress?: string;
}

export default function VivaSimulatorPage() {
  const [topic, setTopic] = usePersistedState("viva-topic", "");
  const [subject, setSubject] = usePersistedState("viva-subject", "");
  const [difficulty, setDifficulty] = usePersistedState("viva-difficulty", "intermediate");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("viva-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [vivaState, setVivaState] = useState<VivaState | null>(null);
  const [history, setHistory] = useState<QuestionHistory[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [history, vivaState]);

  const startViva = async () => {
    if (topic.trim().length < 10) {
      toast({ title: "Topic must be at least 10 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setVivaStarted(true);
    setHistory([]);

    try {
      const response = await fetch("/api/tools/viva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          subject: subject || undefined,
          difficulty,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        setVivaStarted(false);
        throw new Error("Failed");
      }

      const data = await response.json();
      setVivaState({
        currentQuestion: data.question,
        hint: data.hint,
      });
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

    try {
      const newHistory = [...history, { question: vivaState.currentQuestion, answer: currentAnswer }];

      const response = await fetch("/api/tools/viva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          subject: subject || undefined,
          difficulty,
          answer: currentAnswer,
          questionHistory: newHistory,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) throw new Error("Failed");

      const data = await response.json();
      setHistory([...history, {
        question: vivaState.currentQuestion,
        answer: currentAnswer,
        feedback: data.feedback,
      }]);
      setVivaState({
        currentQuestion: data.followUpQuestion,
        overallProgress: data.overallProgress,
      });
      setCurrentAnswer("");
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const resetViva = () => {
    setVivaStarted(false);
    setVivaState(null);
    setHistory([]);
    setCurrentAnswer("");
    setShowHint(false);
  };

  const avgScore = history.length > 0 
    ? Math.round(history.reduce((acc, h) => acc + (h.feedback?.score || 0), 0) / history.length)
    : 0;

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {!vivaStarted ? (
        /* Start Screen - Immersive Hero */
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg text-center">
            {/* Hero Icon */}
            <div className="relative mb-8 w-fit mx-auto">
              <MessageSquare className="w-14 h-14 text-purple-600" />
              <Sparkles className="w-5 h-5 text-amber-500 absolute -right-2 -top-1" />
            </div>

            <h1 className="text-3xl font-black text-gray-900 mb-2">Viva Simulator</h1>
            <p className="text-gray-500 mb-8">Practice your oral exams with an AI examiner</p>

            {/* Form */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 text-left space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Exam Topic *</label>
                <Input
                  placeholder="e.g., Photosynthesis, Data Structures, French Revolution"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Subject</label>
                  <Input
                    placeholder="e.g., Biology"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Difficulty</label>
                  <div className="flex bg-gray-100 rounded-xl p-1 h-10">
                    {["beginner", "intermediate", "advanced"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 text-xs font-medium rounded-lg capitalize transition-all ${
                          difficulty === d
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                <Button
                  onClick={startViva}
                  disabled={isLoading || topic.trim().length < 10}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Start Viva <Play className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              2 credits per question • <Link href="/dashboard/media" className="text-purple-600 hover:underline">Media Tools</Link>
            </p>
          </div>
        </div>
      ) : (
        /* Viva Session - Chat Interface */
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Main Chat */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">AI Examiner</p>
                  <p className="text-xs text-purple-200">{topic}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs capitalize">{difficulty}</span>
                <button onClick={resetViva} className="p-1.5 hover:bg-white/10 rounded-lg">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* History */}
              {history.map((item, i) => (
                <div key={i} className="space-y-3">
                  {/* Question Bubble */}
                  <div className="flex gap-3">
                    <Bot className="w-5 h-5 text-purple-600 shrink-0" />
                    <div className="bg-purple-50 rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-gray-800">{item.question}</p>
                    </div>
                  </div>

                  {/* Answer Bubble */}
                  <div className="flex gap-3 justify-end">
                    <div className="bg-blue-600 rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-white">{item.answer}</p>
                    </div>
                    <User className="w-5 h-5 text-blue-600 shrink-0" />
                  </div>

                  {/* Feedback */}
                  {item.feedback && (
                    <div className="mx-11 p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-lg font-bold ${
                          item.feedback.score >= 80 ? "text-green-600" :
                          item.feedback.score >= 60 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {item.feedback.score}%
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.feedback.score >= 80 ? "bg-green-500" :
                              item.feedback.score >= 60 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${item.feedback.score}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        {item.feedback.strengths.slice(0, 2).map((s, j) => (
                          <p key={j} className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {s}
                          </p>
                        ))}
                        {item.feedback.improvements.slice(0, 1).map((s, j) => (
                          <p key={j} className="text-xs text-amber-600 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {s}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Current Question */}
              {vivaState && !isLoading && (
                <div className="flex gap-3">
                  <Bot className="w-5 h-5 text-purple-600 shrink-0 mt-1" />
                  <div>
                    <div className="bg-purple-50 rounded-2xl rounded-tl-md px-4 py-3">
                      <p className="text-sm text-gray-800">{vivaState.currentQuestion}</p>
                    </div>
                    {vivaState.hint && (
                      <button
                        onClick={() => setShowHint(!showHint)}
                        className="mt-2 text-xs text-purple-600 flex items-center gap-1"
                      >
                        <Lightbulb className="w-3 h-3" />
                        {showHint ? "Hide hint" : "Need help?"}
                      </button>
                    )}
                    {showHint && vivaState.hint && (
                      <p className="mt-1 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">{vivaState.hint}</p>
                    )}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex gap-3">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin shrink-0 mt-1" />
                  <div className="bg-purple-50 rounded-2xl px-4 py-3">
                    <p className="text-sm text-gray-500">Thinking...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your answer..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  className="flex-1 min-h-[48px] max-h-[120px] rounded-xl border-gray-200 resize-none"
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
                  className="h-12 w-12 rounded-xl bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="w-64 shrink-0 space-y-4 hidden lg:block">
            {/* Score Card */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white">
              <Award className="w-8 h-8 mb-3 opacity-80" />
              <p className="text-3xl font-black">{avgScore || "—"}%</p>
              <p className="text-purple-200 text-sm">Average Score</p>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <Target className="w-6 h-6 text-blue-600 mb-3" />
              <p className="text-2xl font-bold text-gray-900">{history.length}</p>
              <p className="text-gray-500 text-sm">Questions Answered</p>
            </div>

            {/* Progress Note */}
            {vivaState?.overallProgress && (
              <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                <p className="text-xs font-medium text-amber-800 mb-1">Progress Note</p>
                <p className="text-sm text-amber-700">{vivaState.overallProgress}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
