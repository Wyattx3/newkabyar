"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Radar, 
  Loader2, 
  Send,
  TrendingUp,
  Target,
  Lightbulb,
  BookOpen,
  Microscope,
  Download,
  Star,
  Clock,
  Copy,
  Zap,
  FlaskConical,
  Check,
  RefreshCw,
  BarChart3,
  FileText,
  Users,
  Shuffle,
  Quote,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import Link from "next/link";

interface Gap {
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  potentialQuestions: string[];
  methodology: string;
  estimatedImpact?: string;
  difficulty?: string;
  timeframe?: string;
}

interface GapResult {
  topic: string;
  existingResearch: {
    summary: string;
    mainThemes?: string[];
    keyPapers?: { title: string; year: string; citations?: number }[];
  };
  gaps: Gap[];
  emergingTrends: string[];
  recommendations: string[];
  relatedTopics?: string[];
  citationSuggestions?: string[];
  methodologyOptions?: { name: string; pros: string; cons: string }[];
}

interface SearchHistory {
  topic: string;
  timestamp: Date;
  gapsFound: number;
}

export default function ResearchGapPage() {
  const [topic, setTopic] = usePersistedState("researchgap-topic", "");
  const [field, setField] = usePersistedState("researchgap-field", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("researchgap-model", "fast");
  const [searchHistory, setSearchHistory] = usePersistedState<SearchHistory[]>("researchgap-history", []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GapResult | null>(null);
  const [selectedGap, setSelectedGap] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [savedGaps, setSavedGaps] = useState<number[]>([]);
  const [showMatrix, setShowMatrix] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalContent, setProposalContent] = useState("");
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("research-gap");

  useEffect(() => setMounted(true), []);

  const handleAnalyze = async () => {
    if (topic.trim().length < 10) {
      toast({ title: "Topic must be at least 10 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setSelectedGap(null);

    try {
      const response = await fetch("/api/tools/research-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          field: field || undefined,
          model: selectedModel,
          language: aiLanguage || "en",
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", response.status, errorData);
        throw new Error(errorData.error || "Failed to analyze");
      }

      const data = await response.json();
      setResult(data);
      saveProject({
        inputData: { topic, field },
        outputData: data,
        settings: { model: selectedModel },
        inputPreview: topic.slice(0, 200),
      });
      
      // Add to history
      setSearchHistory(prev => [
        { topic, timestamp: new Date(), gapsFound: data.gaps?.length || 0 },
        ...prev.slice(0, 9)
      ]);
    } catch (error: any) {
      console.error("Research gap error:", error);
      toast({ 
        title: "Analysis failed", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const quickTopics = [
    "AI in healthcare diagnostics",
    "Climate change adaptation strategies",
    "Mental health in remote work",
    "Sustainable urban mobility",
    "Blockchain in supply chain",
  ];

  const toggleSaveGap = (index: number) => {
    setSavedGaps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const exportResults = () => {
    if (!result) return;
    const content = `Research Gap Analysis: ${result.topic}\n\n` +
      `EXISTING RESEARCH:\n${result.existingResearch.summary}\n\n` +
      `IDENTIFIED GAPS:\n${result.gaps.map((g, i) => `${i+1}. ${g.title}\n   ${g.description}\n   Priority: ${g.importance}`).join("\n\n")}\n\n` +
      `EMERGING TRENDS:\n${result.emergingTrends?.join("\n") || "N/A"}\n\n` +
      `RECOMMENDATIONS:\n${result.recommendations?.join("\n") || "N/A"}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-gaps-${topic.slice(0, 30).replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully!" });
  };

  // Generate Research Proposal
  const generateProposal = async () => {
    if (selectedGap === null || !result?.gaps[selectedGap]) return;
    const gap = result.gaps[selectedGap];
    
    setGeneratingProposal(true);
    setShowProposal(true);
    setProposalContent("");
    
    try {
      const response = await fetch("/api/tools/research-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `Generate a research proposal outline for: ${gap.title}. Description: ${gap.description}. Questions: ${gap.potentialQuestions?.join(", ")}`,
          field: field || undefined,
          model: selectedModel,
          language: aiLanguage || "en",
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const proposal = `# Research Proposal: ${gap.title}\n\n` +
          `## Background\n${gap.description}\n\n` +
          `## Research Questions\n${gap.potentialQuestions?.map((q, i) => `${i+1}. ${q}`).join("\n") || "N/A"}\n\n` +
          `## Methodology\n${gap.methodology || "To be determined"}\n\n` +
          `## Expected Outcomes\n${data.recommendations?.slice(0, 3).join("\n") || "Further analysis needed"}\n\n` +
          `## Timeline\nPhase 1: Literature Review (2-4 weeks)\nPhase 2: Data Collection (4-8 weeks)\nPhase 3: Analysis (4-6 weeks)\nPhase 4: Writing (4 weeks)`;
        setProposalContent(proposal);
      } else {
        throw new Error("Failed to generate");
      }
    } catch (error) {
      setProposalContent(`# Research Proposal: ${gap.title}\n\n` +
        `## Background\n${gap.description}\n\n` +
        `## Research Questions\n${gap.potentialQuestions?.map((q, i) => `${i+1}. ${q}`).join("\n") || "N/A"}\n\n` +
        `## Methodology\n${gap.methodology || "To be determined"}\n\n` +
        `## Expected Impact\n${gap.importance === "high" ? "High potential for significant contribution" : "Moderate contribution expected"}`);
    } finally {
      setGeneratingProposal(false);
    }
  };

  // Generate Citation
  const generateCitation = (gap: Gap) => {
    const year = new Date().getFullYear();
    const citation = `Research Gap: "${gap.title}" identified in ${result?.topic || topic}. Priority: ${gap.importance}. Key questions: ${gap.potentialQuestions?.slice(0, 2).join("; ") || "N/A"}. (Gap Analysis, ${year})`;
    copyToClipboard(citation);
    toast({ title: "Citation copied!" });
  };

  // Get difficulty level (simulated based on importance and methodology length)
  const getDifficulty = (gap: Gap): "high" | "medium" | "low" => {
    if (gap.difficulty) return gap.difficulty as "high" | "medium" | "low";
    const methodologyLength = gap.methodology?.length || 0;
    if (methodologyLength > 200) return "high";
    if (methodologyLength > 100) return "medium";
    return "low";
  };

  const importanceConfig = {
    high: { color: "bg-red-500", text: "text-red-600", bg: "bg-red-50", label: "High Priority" },
    medium: { color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", label: "Medium Priority" },
    low: { color: "bg-green-500", text: "text-green-600", bg: "bg-green-50", label: "Low Priority" },
  };

  return (
    <div className={`h-full flex flex-col transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Radar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-semibold text-gray-900">Research Gap Finder</h1>
            <p className="text-xs text-gray-500">Discover unexplored research opportunities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/research" className="text-xs text-blue-600 hover:underline">Research</Link>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">5 credits</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!result ? (
            /* Input Mode - Compact Centered Design */
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Main Search Area - Centered */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-2xl px-4">
                  {/* Search Input */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center">
                        <Microscope className="w-5 h-5 text-blue-600 ml-4" />
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                          placeholder="Enter research topic to find gaps..."
                          className="flex-1 h-14 px-3 text-gray-900 placeholder:text-gray-400 bg-transparent focus:outline-none text-base"
                        />
                      </div>
                      <Button
                        onClick={handleAnalyze}
                        disabled={isLoading || topic.trim().length < 10}
                        className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Options Row */}
                  <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
                    <input
                      type="text"
                      value={field}
                      onChange={(e) => setField(e.target.value)}
                      placeholder="Field (optional)"
                      className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 w-40"
                    />
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>

                  {/* Quick Topics */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {quickTopics.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTopic(t)}
                        className="px-3 py-1.5 text-xs bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-full transition-all"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Section - History & Features */}
              <div className="shrink-0 pb-4">
                <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-3 lg:gap-6 items-start max-w-5xl mx-auto">
                  {/* Recent Searches */}
                  <div>
                    {searchHistory.length > 0 && (
                      <>
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Recent
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {searchHistory.slice(0, 3).map((item, i) => (
                            <button
                              key={i}
                              onClick={() => setTopic(item.topic)}
                              className="px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors text-left max-w-[200px]"
                            >
                              <p className="text-gray-700 truncate">{item.topic}</p>
                              <p className="text-gray-400 text-[10px]">{item.gapsFound} gaps</p>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Features - Center */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-xs">Gaps</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs">Trends</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <FlaskConical className="w-4 h-4 text-purple-600" />
                      <span className="text-xs">Methods</span>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Tip: Be specific for better results</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Results Mode - Side by Side Layout */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col"
            >
              {/* Topic Header with Feature Toolbar */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 mb-3 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-semibold text-gray-900 truncate break-words">{result.topic}</h2>
                      {result.existingResearch.mainThemes && (
                        <div className="hidden md:flex gap-1">
                          {result.existingResearch.mainThemes.slice(0, 2).map((theme, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {theme}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setResult(null); setTopic(""); }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="New search"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportResults}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Feature Toolbar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowMatrix(!showMatrix)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        showMatrix ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Priority Matrix
                    </button>
                    <button
                      onClick={() => setShowCompare(!showCompare)}
                      disabled={savedGaps.length < 2}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        showCompare ? "bg-purple-100 text-purple-700" : savedGaps.length < 2 ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Compare ({savedGaps.length})
                    </button>
                    <button
                      onClick={generateProposal}
                      disabled={selectedGap === null}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        selectedGap !== null ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-50 text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Generate Proposal
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-blue-600 font-medium">{result.gaps.length} Gaps</span>
                    <span className="text-green-600 font-medium">{result.emergingTrends?.length || 0} Trends</span>
                    <span className="text-amber-600 font-medium">{savedGaps.length} Saved</span>
                  </div>
                </div>
              </div>

              {/* Priority Matrix Panel */}
              {showMatrix && (
                <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 mb-3 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Priority Matrix</span>
                    </div>
                    <button onClick={() => setShowMatrix(false)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center text-xs text-gray-400 col-span-3 grid grid-cols-3">
                      <span></span>
                      <span>← Difficulty →</span>
                      <span></span>
                    </div>
                    {["high", "medium", "low"].map((imp) => (
                      <div key={imp} className="contents">
                        {["low", "medium", "high"].map((diff) => {
                          const gapsInCell = result.gaps.filter((g, i) => 
                            g.importance === imp && getDifficulty(g) === diff
                          );
                          return (
                            <div
                              key={`${imp}-${diff}`}
                              className={`p-2 rounded-lg min-h-[60px] border ${
                                imp === "high" && diff === "low" ? "bg-green-50 border-green-200" :
                                imp === "high" && diff === "high" ? "bg-amber-50 border-amber-200" :
                                imp === "low" && diff === "high" ? "bg-red-50 border-red-200" :
                                "bg-gray-50 border-gray-100"
                              }`}
                            >
                              <p className="text-[10px] text-gray-400 mb-1">{imp}/{diff}</p>
                              {gapsInCell.map((g, i) => (
                                <p key={i} className="text-xs text-gray-700 truncate">{g.title.slice(0, 20)}...</p>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200" /> Quick Win</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200" /> Strategic</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200" /> Avoid</span>
                  </div>
                </div>
              )}

              {/* Compare Panel */}
              {showCompare && savedGaps.length >= 2 && (
                <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 mb-3 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shuffle className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-900">Compare Saved Gaps</span>
                    </div>
                    <button onClick={() => setShowCompare(false)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedGaps.slice(0, 2).map((gapIndex) => {
                      const gap = result.gaps[gapIndex];
                      if (!gap) return null;
                      const config = importanceConfig[gap.importance] || importanceConfig.medium;
                      return (
                        <div key={gapIndex} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-2 h-2 rounded-full ${config.color}`} />
                            <span className={`text-xs ${config.text}`}>{gap.importance}</span>
                          </div>
                          <h4 className="font-medium text-gray-900 text-sm mb-1">{gap.title}</h4>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{gap.description}</p>
                          <div className="text-xs text-gray-400">
                            <p>Questions: {gap.potentialQuestions?.length || 0}</p>
                            <p>Difficulty: {getDifficulty(gap)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Proposal Modal */}
              {showProposal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-gray-900">Research Proposal</span>
                      </div>
                      <button onClick={() => setShowProposal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {generatingProposal ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                          <p className="text-gray-500">Generating proposal...</p>
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{proposalContent}</pre>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                      <button
                        onClick={() => copyToClipboard(proposalContent)}
                        disabled={generatingProposal}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        <Copy className="w-4 h-4 inline mr-1" /> Copy
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([proposalContent], { type: "text/markdown" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = "research-proposal.md";
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        disabled={generatingProposal}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Download className="w-4 h-4 inline mr-1" /> Download
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content - Side by Side */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 min-h-0">
                {/* Left Panel - Gaps List */}
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col min-h-0 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900 text-sm">Research Gaps</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{result.gaps.length}</span>
                      </div>
                      <div className="flex gap-1">
                        {["high", "medium", "low"].map((level) => (
                          <span key={level} className={`w-2 h-2 rounded-full ${importanceConfig[level as keyof typeof importanceConfig].color}`} title={`${level} priority`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {result.gaps.map((gap, i) => {
                      const config = importanceConfig[gap.importance] || importanceConfig.medium;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedGap(i)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedGap === i 
                              ? "border-blue-500 bg-blue-50" 
                              : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${config.color}`} />
                                <span className={`text-xs ${config.text}`}>{gap.importance}</span>
                              </div>
                              <h3 className="font-medium text-gray-900 text-sm leading-snug">{gap.title}</h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{gap.description}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSaveGap(i); }}
                              className={`p-1.5 rounded-lg transition-colors shrink-0 ml-2 ${
                                savedGaps.includes(i) 
                                  ? "text-yellow-500 bg-yellow-50" 
                                  : "text-gray-300 hover:text-gray-400 hover:bg-gray-100"
                              }`}
                            >
                              <Star className={`w-4 h-4 ${savedGaps.includes(i) ? "fill-current" : ""}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Panel - Details */}
                <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
                  {/* Selected Gap Details */}
                  {selectedGap !== null && result.gaps[selectedGap] && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                      <div className={`w-full h-1 rounded-full ${importanceConfig[result.gaps[selectedGap].importance]?.color || "bg-gray-300"} mb-3`} />
                      <h3 className="font-semibold text-gray-900 mb-2">{result.gaps[selectedGap].title}</h3>
                      <p className="text-sm text-gray-600 mb-4 break-words">{result.gaps[selectedGap].description}</p>
                      
                      {result.gaps[selectedGap].potentialQuestions && result.gaps[selectedGap].potentialQuestions.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 mb-2">Research Questions</p>
                          <div className="space-y-2">
                            {result.gaps[selectedGap].potentialQuestions.map((q, j) => (
                              <div key={j} className="flex items-start gap-2 group">
                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center shrink-0">
                                  {j + 1}
                                </span>
                                <p className="text-sm text-gray-700 flex-1">{q}</p>
                                <button
                                  onClick={() => copyToClipboard(q)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.gaps[selectedGap].methodology && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-medium text-blue-600 mb-1">Methodology</p>
                          <p className="text-sm text-blue-700">{result.gaps[selectedGap].methodology}</p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => copyToClipboard(`${result.gaps[selectedGap!].title}\n\n${result.gaps[selectedGap!].description}\n\nResearch Questions:\n${result.gaps[selectedGap!].potentialQuestions?.join("\n") || ""}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button
                          onClick={() => generateCitation(result.gaps[selectedGap!])}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Quote className="w-3 h-3" /> Cite
                        </button>
                        <button
                          onClick={generateProposal}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          <FileText className="w-3 h-3" /> Proposal
                        </button>
                      </div>

                      {/* Collaboration Keywords */}
                      <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs font-medium text-purple-700">Collaboration Keywords</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {result.gaps[selectedGap].title.split(" ").filter(w => w.length > 4).slice(0, 4).map((word, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                              {word}
                            </span>
                          ))}
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                            {result.topic.split(" ")[0]}
                          </span>
                        </div>
                        <p className="text-[10px] text-purple-500 mt-2">Use these keywords to find potential collaborators</p>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Research Summary</span>
                    </div>
                    <p className="text-sm text-gray-600 break-words">{result.existingResearch.summary}</p>
                  </div>

                  {/* Emerging Trends */}
                  {result.emergingTrends && result.emergingTrends.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">Emerging Trends</span>
                      </div>
                      <div className="space-y-2">
                        {result.emergingTrends.slice(0, 4).map((trend, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                            <Zap className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-green-800">{trend}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-gray-900">Recommendations</span>
                      </div>
                      <div className="space-y-2">
                        {result.recommendations.slice(0, 3).map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
                            <Check className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Topics */}
                  {result.relatedTopics && result.relatedTopics.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Related Topics</p>
                      <div className="flex flex-wrap gap-2">
                        {result.relatedTopics.map((t, i) => (
                          <button
                            key={i}
                            onClick={() => { setTopic(t); setResult(null); }}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Saved Gaps Quick Access */}
                  {savedGaps.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium text-gray-900">Saved Gaps ({savedGaps.length})</span>
                      </div>
                      <div className="space-y-2">
                        {savedGaps.slice(0, 3).map((gapIndex) => {
                          const gap = result.gaps[gapIndex];
                          if (!gap) return null;
                          return (
                            <button
                              key={gapIndex}
                              onClick={() => setSelectedGap(gapIndex)}
                              className={`w-full text-left p-2 rounded-lg transition-colors ${
                                selectedGap === gapIndex ? "bg-yellow-50" : "bg-gray-50 hover:bg-gray-100"
                              }`}
                            >
                              <p className="text-xs text-gray-700 truncate">{gap.title}</p>
                            </button>
                          );
                        })}
                      </div>
                      {savedGaps.length > 3 && (
                        <p className="text-xs text-gray-400 mt-2 text-center">+{savedGaps.length - 3} more</p>
                      )}
                    </div>
                  )}

                  {/* Quick Stats Card */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 lg:p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Analysis Stats</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:gap-3">
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-base lg:text-lg font-bold text-red-600">{result.gaps.filter(g => g.importance === "high").length}</p>
                        <p className="text-[10px] text-gray-500">High Priority</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-base lg:text-lg font-bold text-amber-600">{result.gaps.filter(g => g.importance === "medium").length}</p>
                        <p className="text-[10px] text-gray-500">Medium</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-base lg:text-lg font-bold text-green-600">{result.gaps.filter(g => g.importance === "low").length}</p>
                        <p className="text-[10px] text-gray-500">Low Priority</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded-lg">
                        <p className="text-base lg:text-lg font-bold text-purple-600">{result.gaps.reduce((acc, g) => acc + (g.potentialQuestions?.length || 0), 0)}</p>
                        <p className="text-[10px] text-gray-500">Questions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
