"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Loader2, 
  Plus,
  X,
  BarChart3,
  Target,
  Lightbulb,
  Calendar,
  BookOpen,
  Upload,
  FileText,
  Download,
  Copy,
  RefreshCw,
  Filter,
  Clock,
  ChevronRight,
  Sparkles,
  CheckCircle,
  AlertCircle,
  PieChart,
  List,
  Grid3X3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface TopicFreq {
  topic: string;
  frequency: number;
  percentage: number;
  trend: string;
}

interface Prediction {
  topic: string;
  probability: number;
  reason: string;
}

interface StudyRec {
  topic: string;
  priority: string;
  reason: string;
}

interface AnalysisResult {
  summary: string;
  topicFrequency: TopicFreq[];
  predictions: {
    highProbability: Prediction[];
    mediumProbability: Prediction[];
  };
  studyRecommendations: StudyRec[];
  patterns: string[];
}

interface PaperEntry {
  id: string;
  year: string;
  content: string;
}

export default function PastPaperPage() {
  const [papers, setPapers] = useState<PaperEntry[]>([{ id: "1", year: "", content: "" }]);
  const [subject, setSubject] = usePersistedState("pastpaper-subject", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("pastpaper-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "topics" | "predictions" | "study">("overview");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<string[]>([]);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleFileUpload = async (paperId: string, file: File) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".txt")) {
      toast({ title: "Only PDF and TXT files are supported", variant: "destructive" });
      return;
    }

    setUploadingId(paperId);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/utils/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse file");
      }

      const data = await response.json();
      updatePaper(paperId, "content", data.text);
      toast({ 
        title: "File uploaded", 
        description: `${data.characterCount.toLocaleString()} characters extracted` 
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to process file", variant: "destructive" });
    } finally {
      setUploadingId(null);
    }
  };

  const addPaper = () => {
    setPapers([...papers, { id: Date.now().toString(), year: "", content: "" }]);
  };

  const removePaper = (id: string) => {
    if (papers.length > 1) {
      setPapers(papers.filter(p => p.id !== id));
    }
  };

  const updatePaper = (id: string, field: "year" | "content", value: string) => {
    setPapers(papers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAnalyze = async () => {
    const validPapers = papers.filter(p => p.content && p.content.trim().length > 50);
    if (validPapers.length === 0) {
      toast({ title: "Add at least one paper with content (min 50 characters)", variant: "destructive" });
      return;
    }
    
    // Add default year if missing
    const papersWithYear = validPapers.map((p, i) => ({
      year: p.year || `Paper ${i + 1}`,
      content: p.content
    }));

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/past-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          papers: papersWithYear,
          subject: subject || undefined,
          model: selectedModel,
          language: typeof aiLanguage === "string" ? aiLanguage : (aiLanguage as any)?.language || "en",
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

  // Generate Practice Questions
  const generatePracticeQuestions = () => {
    if (!result) return;
    setGeneratingQuestions(true);
    
    setTimeout(() => {
      const highProbTopics = result.predictions.highProbability.slice(0, 3);
      const questions = highProbTopics.flatMap(topic => [
        `Explain the key concepts of ${topic.topic}.`,
        `Compare and contrast different approaches to ${topic.topic}.`,
        `Discuss the importance of ${topic.topic} with examples.`,
      ]);
      setPracticeQuestions(questions);
      setGeneratingQuestions(false);
      toast({ title: "Practice questions generated!" });
    }, 1000);
  };

  // Export Analysis
  const exportAnalysis = () => {
    if (!result) return;
    
    const content = `Past Paper Analysis Report
${subject ? `Subject: ${subject}` : ""}
Generated: ${new Date().toLocaleDateString()}

SUMMARY
${result.summary}

TOPIC FREQUENCY (Top 10)
${result.topicFrequency.slice(0, 10).map((t, i) => `${i+1}. ${t.topic} - ${t.percentage}% (${t.trend})`).join("\n")}

HIGH PROBABILITY PREDICTIONS
${result.predictions.highProbability.map(p => `• ${p.topic} (${p.probability}%) - ${p.reason}`).join("\n")}

MEDIUM PROBABILITY PREDICTIONS
${result.predictions.mediumProbability.map(p => `• ${p.topic} (${p.probability}%) - ${p.reason}`).join("\n")}

STUDY RECOMMENDATIONS
${result.studyRecommendations.map(r => `[${r.priority.toUpperCase()}] ${r.topic} - ${r.reason}`).join("\n")}

PATTERNS IDENTIFIED
${result.patterns.map(p => `• ${p}`).join("\n")}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `past-paper-analysis-${subject || "report"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported!" });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "high") return { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" };
    if (priority === "medium") return { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" };
    return { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" };
  };

  const filteredRecommendations = result?.studyRecommendations.filter(r => 
    priorityFilter === "all" || r.priority === priorityFilter
  ) || [];

  return (
    <div className={`h-full flex flex-col transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Past Paper Analyzer</h1>
            <p className="text-xs text-gray-500">Predict exam topics from trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/rag" className="text-xs text-blue-600 hover:underline">RAG Tools</Link>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">8 credits</span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!result ? (
            /* Input Mode */
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full grid lg:grid-cols-[1fr_280px] gap-4"
            >
              {/* Papers List */}
              <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900 text-sm">Past Papers</span>
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{papers.length}</span>
                  </div>
                  <button
                    onClick={addPaper}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Year
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {papers.map((paper, index) => (
                    <div key={paper.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="Year (e.g., 2023)"
                            value={paper.year}
                            onChange={(e) => updatePaper(paper.id, "year", e.target.value)}
                            className="w-28 h-8 px-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => fileInputRefs.current[paper.id]?.click()}
                            disabled={uploadingId === paper.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {uploadingId === paper.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3" />
                            )}
                            PDF
                          </button>
                          <input
                            ref={(el) => { fileInputRefs.current[paper.id] = el; }}
                            type="file"
                            accept=".pdf,.txt"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(paper.id, e.target.files[0])}
                            className="hidden"
                          />
                          {papers.length > 1 && (
                            <button
                              onClick={() => removePaper(paper.id)}
                              className="p-1 text-gray-400 hover:text-red-500 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        placeholder="Paste questions from this year's paper..."
                        value={paper.content}
                        onChange={(e) => updatePaper(paper.id, "content", e.target.value)}
                        className="w-full min-h-[80px] p-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-400"
                      />
                      {paper.content && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {paper.content.length.toLocaleString()} chars
                          </p>
                          {paper.content.length > 50 && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls Sidebar */}
              <div className="flex flex-col gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Subject (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={isLoading || papers.every(p => !p.content || p.content.trim().length < 50)}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                  ) : (
                    <><TrendingUp className="w-4 h-4 mr-2" />Analyze Trends</>
                  )}
                </Button>

                <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                  <p className="text-xs text-blue-700 font-medium mb-2">Tips for best results:</p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• Add 3+ years of papers</li>
                    <li>• Include full question text</li>
                    <li>• Specify the subject</li>
                  </ul>
                </div>

                {/* Papers Stats */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-3">Analysis Ready</p>
                  <div className="space-y-2">
                    {papers.map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{p.year || `Paper ${i + 1}`}</span>
                        {p.content.length > 50 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Need content
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Results Mode */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col"
            >
              {/* Stats Header */}
              <div className="grid grid-cols-5 gap-3 mb-4 shrink-0">
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{result.topicFrequency.length}</p>
                  <p className="text-xs text-gray-500">Topics</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.predictions.highProbability.length}</p>
                  <p className="text-xs text-gray-500">High Prob</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{result.predictions.mediumProbability.length}</p>
                  <p className="text-xs text-gray-500">Medium Prob</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{result.studyRecommendations.length}</p>
                  <p className="text-xs text-gray-500">Study Tips</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setResult(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="New analysis"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportAnalysis}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Export"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Feature Toolbar */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  {[
                    { id: "overview", label: "Overview", icon: PieChart },
                    { id: "topics", label: "Topics", icon: BarChart3 },
                    { id: "predictions", label: "Predictions", icon: Target },
                    { id: "study", label: "Study Plan", icon: BookOpen },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-1.5 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generatePracticeQuestions}
                    disabled={generatingQuestions}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                  >
                    {generatingQuestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Practice Questions
                  </button>
                  <button
                    onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === "overview" && (
                  <div className="grid lg:grid-cols-[1fr_320px] gap-4">
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Analysis Summary</h3>
                        <p className="text-sm text-gray-600">{result.summary}</p>
                      </div>

                      {/* Topic Chart */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          Topic Frequency
                        </h3>
                        <div className="space-y-3">
                          {result.topicFrequency.slice(0, 6).map((t, i) => (
                            <div key={i}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-gray-700">{t.topic}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs ${t.trend === "increasing" ? "text-green-600" : t.trend === "decreasing" ? "text-red-600" : "text-gray-500"}`}>
                                    {t.trend}
                                  </span>
                                  <span className="text-xs font-medium text-gray-900">{t.percentage}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${t.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                      {/* High Probability */}
                      <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Likely to Appear</span>
                        </div>
                        <div className="space-y-2">
                          {result.predictions.highProbability.slice(0, 4).map((p, i) => (
                            <div key={i} className="p-2 bg-white rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-green-800">{p.topic}</span>
                                <span className="text-xs font-bold text-green-600">{p.probability}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Patterns */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-gray-900">Patterns</span>
                        </div>
                        <ul className="space-y-2">
                          {result.patterns.slice(0, 4).map((p, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Practice Questions */}
                      {practiceQuestions.length > 0 && (
                        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">Practice Questions</span>
                          </div>
                          <div className="space-y-2">
                            {practiceQuestions.slice(0, 3).map((q, i) => (
                              <div key={i} className="p-2 bg-white rounded-lg flex items-start gap-2">
                                <span className="text-xs text-purple-600 font-bold">{i + 1}.</span>
                                <p className="text-xs text-purple-700 flex-1">{q}</p>
                                <button onClick={() => copyToClipboard(q)} className="text-purple-400 hover:text-purple-600">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "topics" && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-900">All Topics ({result.topicFrequency.length})</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Increasing</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Decreasing</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Stable</span>
                      </div>
                    </div>
                    <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-3" : "space-y-2"}>
                      {result.topicFrequency.map((t, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${
                          t.trend === "increasing" ? "bg-green-50 border-green-200" :
                          t.trend === "decreasing" ? "bg-red-50 border-red-200" :
                          "bg-gray-50 border-gray-200"
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{t.topic}</span>
                            <span className="text-xs font-bold text-gray-600">{t.percentage}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${
                              t.trend === "increasing" ? "text-green-600" :
                              t.trend === "decreasing" ? "text-red-600" :
                              "text-gray-500"
                            }`}>
                              {t.trend}
                            </span>
                            <span className="text-xs text-gray-400">{t.frequency}x appeared</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "predictions" && (
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                      <h3 className="text-sm font-medium text-green-800 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        High Probability ({result.predictions.highProbability.length})
                      </h3>
                      <div className="space-y-3">
                        {result.predictions.highProbability.map((p, i) => (
                          <div key={i} className="p-3 bg-white rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-green-900">{p.topic}</span>
                              <span className="text-sm font-bold text-green-600">{p.probability}%</span>
                            </div>
                            <p className="text-xs text-green-700">{p.reason}</p>
                            <button
                              onClick={() => copyToClipboard(`${p.topic}: ${p.reason}`)}
                              className="mt-2 text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                      <h3 className="text-sm font-medium text-amber-800 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Medium Probability ({result.predictions.mediumProbability.length})
                      </h3>
                      <div className="space-y-3">
                        {result.predictions.mediumProbability.map((p, i) => (
                          <div key={i} className="p-3 bg-white rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-amber-900">{p.topic}</span>
                              <span className="text-sm font-bold text-amber-600">{p.probability}%</span>
                            </div>
                            <p className="text-xs text-amber-700">{p.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "study" && (
                  <div className="space-y-4">
                    {/* Filter */}
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Filter:</span>
                      {["all", "high", "medium", "low"].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPriorityFilter(p as any)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                            priorityFilter === p
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Recommendations */}
                    <div className="grid lg:grid-cols-2 gap-3">
                      {filteredRecommendations.map((r, i) => {
                        const colors = getPriorityColor(r.priority);
                        return (
                          <div key={i} className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
                            <div className="flex items-start gap-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.text} bg-white`}>
                                {r.priority}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{r.topic}</p>
                                <p className="text-sm text-gray-600 mt-1">{r.reason}</p>
                                <button
                                  onClick={() => copyToClipboard(`[${r.priority}] ${r.topic}: ${r.reason}`)}
                                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Study Schedule */}
                    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Suggested Study Schedule</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Week 1-2</p>
                          <p className="text-sm font-medium text-gray-900">High Priority Topics</p>
                          <p className="text-xs text-red-600">{result.studyRecommendations.filter(r => r.priority === "high").length} topics</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Week 3-4</p>
                          <p className="text-sm font-medium text-gray-900">Medium Priority</p>
                          <p className="text-xs text-amber-600">{result.studyRecommendations.filter(r => r.priority === "medium").length} topics</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Week 5+</p>
                          <p className="text-sm font-medium text-gray-900">Review & Low Priority</p>
                          <p className="text-xs text-green-600">{result.studyRecommendations.filter(r => r.priority === "low").length} topics</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
