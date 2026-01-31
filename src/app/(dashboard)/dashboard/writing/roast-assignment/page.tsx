"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { ContentInput } from "@/components/tools/content-input";
import { 
  Flame, 
  Loader2, 
  Sparkles,
  Target,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

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

const assignmentTypes = [
  { value: "essay", label: "Essay" },
  { value: "research", label: "Research" },
  { value: "report", label: "Report" },
  { value: "analysis", label: "Analysis" },
];

const gradeLevels = [
  { value: "highschool", label: "High School" },
  { value: "undergraduate", label: "Undergrad" },
  { value: "graduate", label: "Graduate" },
];

export default function RoastAssignmentPage() {
  const [text, setText] = usePersistedState("roast-text", "");
  const [type, setType] = usePersistedState("roast-type", "essay");
  const [level, setLevel] = usePersistedState("roast-level", "undergraduate");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("roast-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleRoast = async () => {
    if (text.trim().length < 100) {
      toast({ title: "Enter at least 100 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          assignmentType: type,
          gradeLevel: level,
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
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-500";
    if (grade.startsWith("B")) return "bg-blue-500";
    if (grade.startsWith("C")) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  if (!mounted) return null;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Flame className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Roast My Assignment</h1>
            <p className="text-[10px] text-gray-500">Get brutally honest feedback</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-[10px] text-blue-600 hover:underline">Writing</Link>
          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />4
          </span>
        </div>
      </div>

      {/* Main Content - Full Height */}
      <div className="flex-1 min-h-0">
        {!result ? (
          /* Input View - Two Column Layout */
          <div className="h-full grid lg:grid-cols-[1fr_320px] gap-3">
            {/* Left: Text Input */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-medium text-gray-700">Your Assignment</span>
                <span className="text-[10px] text-gray-400">{text.length} chars</span>
              </div>
              <div className="flex-1 p-3">
                <ContentInput
                  value={text}
                  onChange={setText}
                  placeholder="Paste your essay, paper, or upload PDF..."
                  minHeight="100%"
                  color="blue"
                />
              </div>
            </div>

            {/* Right: Options Panel */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
              <div className="text-center mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <Flame className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Ready to roast?</h2>
              </div>

              <div className="flex-1 space-y-4">
                {/* Assignment Type */}
                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {assignmentTypes.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setType(t.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          type === t.value
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grade Level */}
                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Level</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {gradeLevels.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setLevel(l.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          level === l.value
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">AI Model</label>
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleRoast}
                disabled={isLoading || text.trim().length < 100}
                className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-sm mt-4"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Roasting...</>
                ) : (
                  <><Flame className="w-4 h-4 mr-1.5" />Roast It!</>
                )}
              </Button>
              <p className="text-center text-[10px] text-gray-400 mt-2">Min 100 characters</p>
            </div>
          </div>
        ) : (
          /* Results View - Bento Grid */
          <div className="h-full flex flex-col">
            {/* Back Button */}
            <button
              onClick={() => setResult(null)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            {/* Results Grid */}
            <div className="flex-1 grid grid-cols-4 grid-rows-3 gap-3 min-h-0">
              {/* Grade Card */}
              <div className={`row-span-2 ${getGradeColor(result.overallGrade)} rounded-xl p-4 text-white flex flex-col`}>
                <span className="text-[10px] font-medium opacity-80 mb-auto">Grade</span>
                <div className="text-center">
                  <p className="text-5xl font-black">{result.overallGrade}</p>
                  <p className="text-xl font-bold opacity-80">{result.overallScore}%</p>
                </div>
                <p className="text-[10px] text-center opacity-80 mt-auto line-clamp-2">{result.verdict}</p>
              </div>

              {/* Rubric */}
              <div className="col-span-2 row-span-2 bg-white rounded-xl border border-gray-100 p-3 flex flex-col overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-900">Rubric</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {result.rubric?.slice(0, 5).map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-gray-600 truncate">{item.category}</span>
                        <span className="text-[10px] font-bold text-gray-900">{item.score}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${getScoreColor(item.score)} rounded-full`} style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              <div className="row-span-2 bg-green-50 rounded-xl border border-green-100 p-3 flex flex-col overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800">Strengths</span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto">
                  {result.strengths?.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-green-700">
                      <CheckCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Fixes */}
              <div className="col-span-2 bg-amber-50 rounded-xl border border-amber-100 p-3 flex flex-col overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-800">Quick Fixes</span>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-1.5 overflow-y-auto">
                  {result.quickFixes?.slice(0, 4).map((fix, i) => (
                    <div key={i} className="flex items-start gap-1 p-1.5 bg-white rounded-lg text-[10px] text-amber-700">
                      <TrendingUp className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{fix}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="col-span-2 bg-red-50 rounded-xl border border-red-100 p-3 flex flex-col overflow-hidden">
                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">Weaknesses</span>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-1.5 overflow-y-auto">
                  {result.weaknesses?.slice(0, 4).map((w, i) => (
                    <div key={i} className="p-1.5 bg-white rounded-lg">
                      <div className="flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-red-700 line-clamp-2">{w.issue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
