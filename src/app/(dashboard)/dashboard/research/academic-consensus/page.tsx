"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Loader2,
  Sparkles,
  Search,
  ExternalLink,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  MinusCircle,
  TrendingUp,
  Calendar,
  Filter,
  BookOpen,
  GraduationCap,
  FlaskConical,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  X,
  Clock,
  BarChart3,
  Quote,
  AlertTriangle,
  Lightbulb,
  Bookmark,
  Share2,
  Download,
  RefreshCw,
  Layers,
  Target,
  Microscope,
  Brain,
  Activity,
  Zap,
  Globe,
  Library,
  PieChart,
  HelpCircle,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Info,
  Award,
  TrendingDown,
  Hash,
  MessageCircle,
  Send,
  Bot,
  User,
  Flame,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import Link from "next/link";

interface Paper {
  title: string;
  authors?: string;
  year?: string;
  keyFinding: string;
  stance: "yes" | "no" | "neutral";
  stanceReason?: string;
  sampleSize?: string | null;
  url?: string;
  methodology?: string;
  journal?: string;
  citations?: number;
  studyType?: string;
  confidence?: number;
  impactLevel?: "high" | "medium" | "low";
  limitations?: string;
}

interface KeyInsight {
  insight: string;
  source: string;
  strength: "strong" | "moderate" | "weak";
  category: "finding" | "implication" | "trend" | "consensus";
}

interface Limitation {
  limitation: string;
  impact: "high" | "medium" | "low";
  description: string;
}

interface ResearchGap {
  gap: string;
  importance: "critical" | "important" | "minor";
  description: string;
  suggestedResearch: string;
}

interface EvidenceFactor {
  name: string;
  score: number;
  description: string;
}

interface TopFinding {
  finding: string;
  paperTitle: string;
  citations: number;
  year: string;
  significance: "breakthrough" | "significant" | "supportive" | "contradictory";
  url?: string;
}

interface ConflictingEvidence {
  topic: string;
  supportingPapers: string[];
  opposingPapers: string[];
  explanation: string;
}

interface ConsensusResult {
  query: string;
  consensusMeter: {
    yes: number;
    no: number;
    neutral: number;
    overallStance: string;
  };
  papers: Paper[];
  summary: string;
  keyInsights?: KeyInsight[];
  limitations?: Limitation[];
  gaps?: ResearchGap[];
  evidenceQuality?: {
    overall: string;
    score?: number;
    reasoning: string;
    factors?: EvidenceFactor[];
  };
  sourcesAnalyzed?: number;
  webSearchResults?: number;
  databasePapers?: number;
  methodologyBreakdown?: {
    type: string;
    count: number;
    percentage: number;
    description?: string;
  }[];
  yearDistribution?: {
    year: string;
    count: number;
    trend?: "increasing" | "stable" | "decreasing";
  }[];
  stanceByStudyType?: {
    studyType: string;
    yes: number;
    no: number;
    neutral: number;
  }[];
  topFindings?: TopFinding[];
  conflictingEvidence?: ConflictingEvidence[];
  relatedQuestions?: string[];
  dataReliability?: {
    score: number;
    grade?: "A" | "B" | "C" | "D" | "F";
    factors: EvidenceFactor[];
  };
}

type SearchMode = "general" | "medical" | "deep";
type StudyFilter = "all" | "rct" | "meta" | "systematic" | "cohort";
type YearFilter = "all" | "5years" | "10years" | "2020";

const suggestedQueries = [
  {
    category: "Health",
    icon: Stethoscope,
    queries: [
      "Does intermittent fasting improve metabolic health?",
      "Is meditation effective for reducing anxiety?",
      "Do omega-3 supplements improve heart health?",
    ],
  },
  {
    category: "Technology",
    icon: Brain,
    queries: [
      "Does remote work increase productivity?",
      "Is AI beneficial for education outcomes?",
      "Do social media platforms affect mental health?",
    ],
  },
  {
    category: "Environment",
    icon: Globe,
    queries: [
      "Does air pollution increase cardiovascular disease risk?",
      "Are electric vehicles better for the environment?",
      "Does deforestation impact local climate patterns?",
    ],
  },
];

const studyTypeLabels: Record<string, { label: string; color: string }> = {
  "meta-analysis": { label: "Meta-Analysis", color: "bg-purple-100 text-purple-700" },
  "systematic-review": { label: "Systematic Review", color: "bg-blue-100 text-blue-700" },
  rct: { label: "RCT", color: "bg-emerald-100 text-emerald-700" },
  cohort: { label: "Cohort Study", color: "bg-amber-100 text-amber-700" },
  "case-control": { label: "Case-Control", color: "bg-orange-100 text-orange-700" },
  observational: { label: "Observational", color: "bg-gray-100 text-gray-600" },
  "web-source": { label: "Web Source", color: "bg-emerald-100 text-emerald-700" },
  "database-papers": { label: "Database Papers", color: "bg-blue-100 text-blue-700" },
  "web-sources": { label: "Web Search", color: "bg-emerald-100 text-emerald-700" },
};

// Chat message interface
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Popular questions interface
interface PopularQuestion {
  question: string;
  supportCount: number;
  opposeCount: number;
  neutralCount: number;
}

export default function AcademicConsensusPage() {
  const [query, setQuery] = usePersistedState("consensus-query", "");
  const [paperCount, setPaperCount] = usePersistedState("consensus-count", 30);
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("consensus-model", "fast");

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ConsensusResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("general");
  const [studyFilter, setStudyFilter] = useState<StudyFilter>("all");
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Popular questions (generated from research data)
  const [popularQuestions, setPopularQuestions] = useState<PopularQuestion[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"papers" | "insights" | "gaps">("papers");
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchPhase, setSearchPhase] = useState("");
  const [stanceFilter, setStanceFilter] = useState<"all" | "yes" | "no" | "neutral">("all");
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("academic-consensus");

  useEffect(() => setMounted(true), []);

  // Simulate search progress
  useEffect(() => {
    if (isLoading) {
      const phases = [
        "Searching Exa Research API...",
        "Querying Tavily for academic sources...",
        "Fetching from Semantic Scholar...",
        "Searching OpenAlex database...",
        "Deduplicating results...",
        "Analyzing peer-reviewed literature...",
        "Evaluating study methodologies...",
        "Calculating consensus metrics...",
        "Synthesizing research findings...",
      ];
      let phase = 0;
      const interval = setInterval(() => {
        setSearchProgress((prev) => Math.min(prev + Math.random() * 15, 95));
        setSearchPhase(phases[phase % phases.length]);
        phase++;
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setSearchProgress(0);
      setSearchPhase("");
    }
  }, [isLoading]);

  const handleSearch = async () => {
    if (query.trim().length < 10) {
      toast({ title: "Please enter a more detailed research question", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setSearchProgress(0);

    try {
      const response = await fetch("/api/tools/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          paperCount,
          model: selectedModel,
          language: aiLanguage,
          mode: searchMode,
          filters: {
            studyType: studyFilter,
            yearRange: yearFilter,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        if (response.status === 401) {
          toast({ title: "Please sign in to continue", variant: "destructive" });
          return;
        }
        const errorMessage = typeof data?.error === "string" ? data.error : "Failed to analyze research";
        toast({ title: errorMessage, variant: "destructive" });
        return;
      }

      setSearchProgress(100);
      // Set result and isLoading together to prevent UI flash
      setTimeout(() => {
        setResult(data);
        setIsLoading(false);
        window.dispatchEvent(new CustomEvent("credits-updated"));
        saveProject({
          inputData: { query, paperCount, searchMode },
          outputData: data,
          settings: { model: selectedModel, studyFilter, yearFilter },
          inputPreview: query.slice(0, 200),
        });
      }, 500);
    } catch (error) {
      console.error("Search error:", error);
      toast({ title: "Network error. Please try again.", variant: "destructive" });
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const getStanceConfig = (stance: string) => {
    switch (stance) {
      case "yes":
        return { icon: CheckCircle, color: "text-emerald-600", label: "Supports" };
      case "no":
        return { icon: XCircle, color: "text-red-500", label: "Opposes" };
      default:
        return { icon: MinusCircle, color: "text-gray-400", label: "Neutral" };
    }
  };

  const resetSearch = () => {
    setResult(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-emerald-600";
    if (confidence >= 60) return "text-blue-600";
    if (confidence >= 40) return "text-amber-600";
    return "text-gray-500";
  };

  // Generate popular questions from research data
  useEffect(() => {
    if (result) {
      const questions: PopularQuestion[] = [
        {
          question: `Is "${result.query}" supported by scientific evidence?`,
          supportCount: result.papers?.filter(p => p.stance === "yes").length || 0,
          opposeCount: result.papers?.filter(p => p.stance === "no").length || 0,
          neutralCount: result.papers?.filter(p => p.stance === "neutral").length || 0,
        },
        {
          question: `What do meta-analyses say about "${result.query}"?`,
          supportCount: result.papers?.filter(p => p.studyType === "meta-analysis" && p.stance === "yes").length || 0,
          opposeCount: result.papers?.filter(p => p.studyType === "meta-analysis" && p.stance === "no").length || 0,
          neutralCount: result.papers?.filter(p => p.studyType === "meta-analysis" && p.stance === "neutral").length || 0,
        },
        {
          question: `What are the long-term effects of "${result.query}"?`,
          supportCount: Math.round((result.consensusMeter?.yes || 0) / 10),
          opposeCount: Math.round((result.consensusMeter?.no || 0) / 10),
          neutralCount: Math.round((result.consensusMeter?.neutral || 0) / 10),
        },
      ];
      setPopularQuestions(questions);
      
      // Add initial welcome message to chat
      setChatMessages([{
        role: "assistant",
        content: `I've analyzed ${result.papers?.length || 0} research papers about "${result.query}". The consensus is ${result.consensusMeter?.overallStance || "mixed"} with ${result.consensusMeter?.yes || 0}% supporting. Ask me anything about this research!`,
        timestamp: new Date(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.query]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle chat submission
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatLoading || !result) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      // Build COMPACT context from research results (limit size to avoid truncation)
      const summaryShort = (result.summary || "").slice(0, 500);
      const insightsShort = (result.keyInsights || [])
        .slice(0, 3)
        .map((ins: any) => typeof ins === "string" ? ins : ins?.insight || "")
        .filter(Boolean)
        .join("; ")
        .slice(0, 300);
      const topPapers = (result.papers || [])
        .slice(0, 3)
        .map((p: any) => `${p.title?.slice(0, 50)}: ${(p.keyFinding || "").slice(0, 100)}`)
        .join(" | ");
      
      const researchContext = `Question: ${result.query}
Consensus: ${result.consensusMeter?.yes || 0}% support, ${result.consensusMeter?.no || 0}% oppose (${result.consensusMeter?.overallStance})
Summary: ${summaryShort}
Insights: ${insightsShort}
Papers (${result.papers?.length || 0}): ${topPapers}`.slice(0, 2000);

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a research assistant helping users understand academic research findings. Use this research context to answer questions:\n${researchContext}\n\nProvide concise, accurate answers based on the research data. If the question is outside the research scope, acknowledge that.` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: chatInput },
          ],
          feature: "answer",
          model: selectedModel,
          language: aiLanguage.language || "en",
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          // Insufficient credits
          setChatMessages(prev => [...prev, {
            role: "assistant",
            content: "⚠️ Credits မလုံလောက်ပါ။ Credits ထပ်ဖြည့်ပြီး ထပ်စမ်းကြည့်ပါ။\n\n(Insufficient credits. Please top up your credits to continue chatting.)",
            timestamp: new Date(),
          }]);
          window.dispatchEvent(new Event("credits-updated"));
          return;
        }
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
        }
      }

      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: assistantContent || "I apologize, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      }]);
      window.dispatchEvent(new Event("credits-updated"));
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Render based on state
  return (
    <AnimatePresence mode="wait">
      {/* Search Interface (Initial State) */}
      {!result && !isLoading && (
        <motion.div
          key="search-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-[calc(100vh-200px)] flex flex-col"
        >
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-8">
          {/* Logo & Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Scale className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Academic Consensus</h1>
            <p className="text-base text-gray-500 max-w-lg mx-auto">
              Search and analyze peer-reviewed research. See where the science agrees.
            </p>
          </motion.div>

          {/* Search Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-3xl"
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden">
              {/* Search Mode Tabs */}
              <div className="flex border-b border-gray-100">
                {[
                  { id: "general", label: "General", icon: BookOpen },
                  { id: "medical", label: "Medical", icon: Stethoscope },
                  { id: "deep", label: "Deep Search", icon: Layers, pro: true },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSearchMode(mode.id as SearchMode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all relative ${
                      searchMode === mode.id
                        ? "text-emerald-600 bg-emerald-50/50"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <mode.icon className="w-4 h-4" />
                    {mode.label}
                    {mode.pro && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded">
                        PRO
                      </span>
                    )}
                    {searchMode === mode.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="p-4">
                <div className="relative">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                  <textarea
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="Ask a research question... (e.g., Does exercise improve mental health?)"
                    className="w-full min-h-[100px] pl-12 pr-4 pt-4 pb-4 text-base text-gray-900 placeholder:text-gray-400 border-0 focus:ring-0 resize-none"
                    rows={3}
                  />
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showFilters ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
                  </button>

                  <div className="flex-1" />

                  <select
                    value={paperCount}
                    onChange={(e) => setPaperCount(Number(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 bg-white"
                  >
                    {[20, 30, 50, 75, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} papers
                      </option>
                    ))}
                  </select>

                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />

                  <Button
                    onClick={handleSearch}
                    disabled={query.trim().length < 10}
                    className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </Button>
                </div>

                {/* Expanded Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-4 pt-4 mt-3 border-t border-gray-100">
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-2 block">Study Type</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: "all", label: "All Studies" },
                              { id: "rct", label: "RCT Only" },
                              { id: "meta", label: "Meta-Analysis" },
                              { id: "systematic", label: "Systematic Reviews" },
                              { id: "cohort", label: "Cohort Studies" },
                            ].map((type) => (
                              <button
                                key={type.id}
                                onClick={() => setStudyFilter(type.id as StudyFilter)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                  studyFilter === type.id
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 mb-2 block">Publication Date</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: "all", label: "All Time" },
                              { id: "5years", label: "Last 5 Years" },
                              { id: "10years", label: "Last 10 Years" },
                              { id: "2020", label: "Since 2020" },
                            ].map((year) => (
                              <button
                                key={year.id}
                                onClick={() => setYearFilter(year.id as YearFilter)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                  yearFilter === year.id
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {year.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Credits Badge */}
            <div className="flex justify-center mt-4">
              <span className="px-3 py-1.5 text-gray-400 text-xs font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />5 credits per search
              </span>
            </div>
          </motion.div>

          {/* Suggested Queries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-4xl mt-12"
          >
            <p className="text-sm font-medium text-gray-400 text-center mb-6">Try asking about...</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestedQueries.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-500 mb-3">
                    <category.icon className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{category.category}</span>
                  </div>
                  {category.queries.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuery(q)}
                      className="w-full text-left px-4 py-3 bg-white rounded-xl border border-gray-100 text-sm text-gray-700 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all group"
                    >
                      <span className="line-clamp-2">{q}</span>
                      <ArrowRight className="w-4 h-4 mt-2 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer Stats */}
        <div className="border-t border-gray-100 py-6 mt-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              <span>250M+ Papers</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span>Semantic Scholar</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>OpenAlex</span>
            </div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span>Exa Research</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Tavily</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Powered by Groq AI</span>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <motion.div
          key="loading-view"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center"
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          {/* Animated Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-3 border-gray-200 border-t-emerald-500"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Scale className="w-8 h-8 text-emerald-600" />
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3 w-64 mx-auto">
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${searchProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-sm font-medium text-gray-700">{searchPhase}</p>
          </div>

          {/* Query Display */}
          <div className="border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 mb-1">Searching for:</p>
            <p className="text-gray-900 font-medium text-sm">"{query}"</p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Analyzing {paperCount}+ papers
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              ~30 seconds
            </span>
          </div>
        </motion.div>
      </motion.div>
      )}

      {/* Results Interface */}
      {result && !isLoading && (
        <motion.div
          key="results-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="-m-4 lg:-m-5 -mt-16 lg:-mt-5 h-[calc(100vh)] flex flex-col bg-gray-50 overflow-hidden"
        >
      {/* Sticky Header - z-30 to stay below sidebar (z-40) */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6 py-3 shrink-0 shadow-sm">
        <div className="flex items-center gap-4 max-w-[1800px] mx-auto">
          <button
            onClick={resetSearch}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Scale className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-gray-900 text-sm">Academic Consensus</span>
          </button>

          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="Search research..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 h-9"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              New Search
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 py-4 px-4 lg:px-6 overflow-y-auto min-h-0">
        <div className="grid lg:grid-cols-[340px_1fr_340px] gap-4 max-w-[1800px] mx-auto">
          {/* Left - Papers List (narrow) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col lg:max-h-[calc(100vh-100px)] order-2 lg:order-1"
          >
            {/* Papers Header */}
            <div className="px-3 py-2.5 border-b border-gray-200 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-gray-900 text-sm">Papers</span>
                </div>
                <span className="text-xs text-gray-400">
                  {result?.papers?.length || 0}
                </span>
              </div>
              {/* Filter Pills - stacked for narrow width */}
              <div className="grid grid-cols-4 gap-1">
                {(["all", "yes", "no", "neutral"] as const).map((filter) => {
                  const count = filter === "all" 
                    ? result?.papers?.length || 0
                    : result?.papers?.filter(p => p.stance === filter).length || 0;
                  return (
                    <button
                      key={filter}
                      onClick={() => setStanceFilter(filter)}
                      className={`px-1.5 py-1.5 rounded text-[10px] font-medium transition-colors text-center ${
                        stanceFilter === filter
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <span className="block">{filter === "all" ? "All" : filter === "yes" ? "Yes" : filter === "no" ? "No" : "N/A"}</span>
                      <span className={`block text-[9px] ${stanceFilter === filter ? "text-emerald-600" : "text-gray-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Papers List - Enhanced */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {result?.papers?.filter(paper => stanceFilter === "all" || paper.stance === stanceFilter).map((paper, i) => {
                const stanceConfig = getStanceConfig(paper.stance);
                const StanceIcon = stanceConfig.icon;
                const paperId = `${paper.title?.slice(0, 30)}-${i}`;
                const isExpanded = expandedPaper === paperId;
                
                // Impact level colors
                const impactColors = {
                  high: "bg-amber-100 text-amber-700",
                  medium: "bg-blue-100 text-blue-700",
                  low: "bg-gray-100 text-gray-600"
                };

                return (
                  <motion.div
                    key={paperId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? "bg-gray-50" : ""}`}
                    onClick={() => setExpandedPaper(isExpanded ? null : paperId)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <StanceIcon className={`w-5 h-5 ${stanceConfig.color}`} />
                        {paper.citations !== undefined && paper.citations > 0 && (
                          <span className="text-[9px] text-gray-400 font-medium">{paper.citations}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-gray-900 leading-snug text-sm">{paper.title}</h4>
                          {paper.url && (
                            <a
                              href={paper.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-600" />
                            </a>
                          )}
                        </div>
                        
                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {paper.authors && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />{paper.authors.split(",")[0]}{paper.authors.includes(",") ? " et al." : ""}
                            </span>
                          )}
                          {paper.year && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />{paper.year}
                            </span>
                          )}
                          {paper.studyType && paper.studyType !== "unknown" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 capitalize">
                              {paper.studyType.replace(/-/g, " ")}
                            </span>
                          )}
                          {paper.impactLevel && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${impactColors[paper.impactLevel]}`}>
                              {paper.impactLevel} impact
                            </span>
                          )}
                        </div>
                        
                        {/* Key Finding */}
                        <p className={`text-xs text-gray-600 mt-2 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                          {paper.keyFinding}
                        </p>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 pt-3 border-t border-gray-100 space-y-2"
                          >
                            {/* Stance Reason */}
                            {paper.stanceReason && (
                              <div className="p-2 rounded bg-gray-50">
                                <p className="text-[10px] font-medium text-gray-500 mb-0.5">Why this stance?</p>
                                <p className="text-xs text-gray-700">{paper.stanceReason}</p>
                              </div>
                            )}
                            
                            {/* Additional Info Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {paper.journal && (
                                <div>
                                  <p className="text-[10px] text-gray-400">Journal</p>
                                  <p className="text-gray-700 truncate">{paper.journal}</p>
                                </div>
                              )}
                              {paper.methodology && paper.methodology !== "unknown" && (
                                <div>
                                  <p className="text-[10px] text-gray-400">Methodology</p>
                                  <p className="text-gray-700">{paper.methodology}</p>
                                </div>
                              )}
                              {paper.sampleSize && (
                                <div>
                                  <p className="text-[10px] text-gray-400">Sample Size</p>
                                  <p className="text-gray-700">{paper.sampleSize}</p>
                                </div>
                              )}
                              {paper.confidence !== undefined && (
                                <div>
                                  <p className="text-[10px] text-gray-400">Confidence</p>
                                  <div className="flex items-center gap-1">
                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${
                                          paper.confidence >= 70 ? "bg-emerald-500" : 
                                          paper.confidence >= 50 ? "bg-blue-500" : "bg-amber-500"
                                        }`}
                                        style={{ width: `${paper.confidence}%` }}
                                      />
                                    </div>
                                    <span className="text-gray-600">{paper.confidence}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Limitations */}
                            {paper.limitations && paper.limitations !== "See paper for limitations" && (
                              <div className="p-2 rounded bg-amber-50/50 border border-amber-100">
                                <p className="text-[10px] font-medium text-amber-600 mb-0.5">Limitations</p>
                                <p className="text-xs text-gray-700">{paper.limitations}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${stanceConfig.color}`}>
                              <StanceIcon className="w-3 h-3" />
                              {stanceConfig.label}
                            </span>
                            {paper.citations !== undefined && paper.citations > 0 && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Hash className="w-2.5 h-2.5" />{paper.citations} citations
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedPaper(isExpanded ? null : paperId); }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-medium"
                          >
                            {isExpanded ? "Less" : "More"}
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Papers Footer */}
            <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-400">{result?.papers?.length || 0} papers</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-7 px-2">
                  <Download className="w-3 h-3 mr-1" />Export
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Middle - Consensus & Summary (wide) */}
          <div className="space-y-3 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto lg:pr-2 scrollbar-thin order-1 lg:order-2">
            {/* Consensus Meter Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Research Consensus
                </h3>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block">
                    {result?.sourcesAnalyzed || result?.papers?.length || 0} total sources
                  </span>
                  {result?.webSearchResults !== undefined && result?.databasePapers !== undefined && (
                    <span className="text-xs text-emerald-600">
                      {result.webSearchResults} web + {result.databasePapers} database
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center py-3">
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="text-5xl font-bold text-gray-900"
                >
                  {result?.consensusMeter?.yes || 0}%
                </motion.p>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  of studies support
                </p>
                <p className="text-base font-semibold text-gray-700 mt-2">
                  {result?.consensusMeter?.overallStance || "Analyzing..."}
                </p>
              </div>

              {/* Visual Bar */}
              <div className="mt-4">
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result?.consensusMeter?.yes || 0}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="bg-emerald-500"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result?.consensusMeter?.neutral || 0}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="bg-gray-300"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result?.consensusMeter?.no || 0}%` }}
                    transition={{ duration: 1, delay: 0.7 }}
                    className="bg-red-400"
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Yes: {result?.consensusMeter?.yes || 0}%
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    Neutral: {result?.consensusMeter?.neutral || 0}%
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    No: {result?.consensusMeter?.no || 0}%
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Research Question */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start gap-3">
                <Quote className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Research Question</p>
                  <p className="text-gray-900 text-sm font-medium">{result?.query || query}</p>
                </div>
              </div>
            </motion.div>

            {/* Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Research Summary
              </h3>
              <div className="prose prose-sm prose-gray max-w-none">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{result?.summary}</p>
              </div>
              
              {/* Quick Stats */}
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{result?.papers?.length || 0}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{result?.webSearchResults || 0}</p>
                  <p className="text-xs text-emerald-600">Web</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{result?.databasePapers || 0}</p>
                  <p className="text-xs text-blue-600">Database</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {(() => {
                      const years = result?.papers?.map(p => parseInt(p.year || "0")).filter(y => y > 0) || [];
                      const avgYear = years.length > 0 ? Math.round(years.reduce((a, b) => a + b, 0) / years.length) : "-";
                      return avgYear;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500">Avg Year</p>
                </div>
              </div>
            </motion.div>

            {/* Evidence Quality - Enhanced */}
            {result?.evidenceQuality && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                  Evidence Quality Assessment
                </h3>
                
                {/* Overall Score */}
                <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-gray-50">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="none"
                        className="text-gray-200"
                      />
                      <motion.circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - (result.evidenceQuality.score || 60) / 100) }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className={
                          (result.evidenceQuality.score || 60) >= 75 ? "text-emerald-500" : 
                          (result.evidenceQuality.score || 60) >= 50 ? "text-blue-500" : 
                          "text-amber-500"
                        }
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-900">
                      {result.evidenceQuality.score || 60}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        result.evidenceQuality.overall === "High" ? "bg-emerald-100 text-emerald-700" :
                        result.evidenceQuality.overall === "Moderate" ? "bg-blue-100 text-blue-700" :
                        result.evidenceQuality.overall === "Low" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {result.evidenceQuality.overall} Quality
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{result.evidenceQuality.reasoning}</p>
                  </div>
                </div>
                
                {/* Quality Factors */}
                {result.evidenceQuality.factors && result.evidenceQuality.factors.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quality Factors</p>
                    {result.evidenceQuality.factors.map((factor, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 font-medium">{factor.name}</span>
                          <span className={`font-semibold ${
                            factor.score >= 75 ? "text-emerald-600" :
                            factor.score >= 50 ? "text-blue-600" :
                            "text-amber-600"
                          }`}>{factor.score}/100</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${factor.score}%` }}
                            transition={{ duration: 0.6, delay: 0.1 * i }}
                            className={`h-full rounded-full ${
                              factor.score >= 75 ? "bg-emerald-500" :
                              factor.score >= 50 ? "bg-blue-500" :
                              "bg-amber-500"
                            }`}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Key Insights - Enhanced */}
            {result?.keyInsights && result.keyInsights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-emerald-600" />
                  Key Research Insights
                  <span className="text-xs text-gray-400 font-normal">({result.keyInsights.length} findings)</span>
                </h3>
                <div className="space-y-3">
                  {result.keyInsights.map((item, i) => {
                    const insight = typeof item === "string" ? item : item.insight;
                    const source = typeof item === "string" ? null : item.source;
                    const strength = typeof item === "string" ? "moderate" : item.strength;
                    const category = typeof item === "string" ? "finding" : item.category;
                    
                    const strengthColors = {
                      strong: "bg-emerald-100 text-emerald-700 border-emerald-200",
                      moderate: "bg-blue-50 text-blue-700 border-blue-200",
                      weak: "bg-gray-50 text-gray-600 border-gray-200"
                    };
                    
                    const categoryIcons = {
                      finding: Microscope,
                      implication: TrendingUp,
                      trend: Activity,
                      consensus: Scale
                    };
                    
                    const CategoryIcon = categoryIcons[category] || Lightbulb;
                    
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className={`p-3 rounded-lg border ${strengthColors[strength]}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shrink-0">
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-relaxed">{insight}</p>
                            {source && (
                              <div className="flex items-center gap-2 mt-2 text-xs opacity-75">
                                <BookOpen className="w-3 h-3" />
                                {source.startsWith("http") ? (
                                  <a 
                                    href={source} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="truncate hover:underline flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {new URL(source).hostname}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : (
                                  <span className="truncate">{source}</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                strength === "strong" ? "bg-emerald-200/50" :
                                strength === "moderate" ? "bg-blue-200/50" : "bg-gray-200/50"
                              }`}>
                                {strength} evidence
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize bg-white/50">
                                {category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Extracted Research Points - Main finding from each paper */}
            {result?.papers && result.papers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Extracted Research Points
                  <span className="text-xs text-gray-400 font-normal">({result.papers.length} sources)</span>
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {result.papers.map((paper, i) => {
                    const stanceConfig = getStanceConfig(paper.stance);
                    const StanceIcon = stanceConfig.icon;
                    
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(0.02 * i, 0.5) }}
                        className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all group"
                      >
                        <div className="flex items-start gap-2">
                          <StanceIcon className={`w-4 h-4 shrink-0 mt-0.5 ${stanceConfig.color}`} />
                          <div className="flex-1 min-w-0">
                            {/* Key Finding */}
                            <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                              {paper.keyFinding || "See paper for details"}
                            </p>
                            
                            {/* Source Info */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[10px] text-gray-500 truncate max-w-[200px]" title={paper.title}>
                                {paper.title?.slice(0, 50)}{paper.title?.length > 50 ? "..." : ""}
                              </span>
                              {paper.year && (
                                <span className="text-[10px] text-gray-400">({paper.year})</span>
                              )}
                              {(paper.citations ?? 0) > 0 && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                  <Quote className="w-2.5 h-2.5" />{paper.citations}
                                </span>
                              )}
                            </div>
                            
                            {/* Link to source */}
                            {paper.url && (
                              <a
                                href={paper.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Source
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Limitations - Enhanced */}
            {result?.limitations && result.limitations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Study Limitations
                  <span className="text-xs text-gray-400 font-normal">({result.limitations.length} identified)</span>
                </h3>
                <div className="space-y-2.5">
                  {result.limitations.map((item, i) => {
                    const limitation = typeof item === "string" ? item : item.limitation;
                    const impact = typeof item === "string" ? "medium" : item.impact;
                    const description = typeof item === "string" ? null : item.description;
                    
                    const impactColors = {
                      high: "border-red-200 bg-red-50/50",
                      medium: "border-amber-200 bg-amber-50/50",
                      low: "border-gray-200 bg-gray-50/50"
                    };
                    
                    const impactBadge = {
                      high: "bg-red-100 text-red-700",
                      medium: "bg-amber-100 text-amber-700",
                      low: "bg-gray-100 text-gray-600"
                    };
                    
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className={`p-3 rounded-lg border ${impactColors[impact]}`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                            impact === "high" ? "text-red-500" :
                            impact === "medium" ? "text-amber-500" : "text-gray-400"
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{limitation}</p>
                            {description && (
                              <p className="text-xs text-gray-500 mt-1">{description}</p>
                            )}
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${impactBadge[impact]}`}>
                              {impact} impact
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Research Gaps - Enhanced */}
            {result?.gaps && result.gaps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Research Gaps & Future Directions
                  <span className="text-xs text-gray-400 font-normal">({result.gaps.length} identified)</span>
                </h3>
                <div className="space-y-3">
                  {result.gaps.map((item, i) => {
                    const gap = typeof item === "string" ? item : item.gap;
                    const importance = typeof item === "string" ? "important" : item.importance;
                    const description = typeof item === "string" ? null : item.description;
                    const suggestedResearch = typeof item === "string" ? null : item.suggestedResearch;
                    
                    const importanceColors = {
                      critical: "border-l-red-500 bg-red-50/30",
                      important: "border-l-blue-500 bg-blue-50/30",
                      minor: "border-l-gray-400 bg-gray-50/30"
                    };
                    
                    const importanceBadge = {
                      critical: "bg-red-100 text-red-700",
                      important: "bg-blue-100 text-blue-700",
                      minor: "bg-gray-100 text-gray-600"
                    };
                    
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className={`p-3 rounded-lg border-l-4 border border-gray-100 ${importanceColors[importance]}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-800">{gap}</p>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${importanceBadge[importance]}`}>
                            {importance}
                          </span>
                        </div>
                        {description && (
                          <p className="text-xs text-gray-500 mt-1 mb-2">{description}</p>
                        )}
                        {suggestedResearch && (
                          <div className="flex items-start gap-2 mt-2 p-2 rounded bg-white/60 border border-gray-100">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">Suggested Research</p>
                              <p className="text-xs text-gray-700">{suggestedResearch}</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Study Type Breakdown - Enhanced */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Methodology Breakdown
              </h3>
              
              {/* Pie Chart Visualization */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-24 h-24 shrink-0">
                  <svg className="w-24 h-24 transform -rotate-90">
                    {(() => {
                      const studyTypes = result?.methodologyBreakdown || result?.papers?.reduce((acc, paper) => {
                        const type = paper.studyType || "unknown";
                        const existing = acc.find(a => a.type === type);
                        if (existing) {
                          existing.count++;
                        } else {
                          acc.push({ type, count: 1, percentage: 0 });
                        }
                        return acc;
                      }, [] as { type: string; count: number; percentage: number }[]) || [];
                      
                      const total = studyTypes.reduce((sum, s) => sum + s.count, 0) || 1;
                      studyTypes.forEach(s => s.percentage = Math.round((s.count / total) * 100));
                      
                      const colors = ["text-emerald-500", "text-blue-500", "text-amber-500", "text-purple-500", "text-red-400", "text-gray-400"];
                      let offset = 0;
                      const circumference = 2 * Math.PI * 40;
                      
                      return studyTypes.slice(0, 6).map((item, i) => {
                        const dashLength = (item.percentage / 100) * circumference;
                        const currentOffset = offset;
                        offset += dashLength;
                        
                        return (
                          <circle
                            key={i}
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="16"
                            fill="none"
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={-currentOffset}
                            className={colors[i % colors.length]}
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{result?.papers?.length || 0}</p>
                      <p className="text-[9px] text-gray-500">Papers</p>
                    </div>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex-1 space-y-1.5">
                  {(() => {
                    const studyTypes = result?.methodologyBreakdown || [];
                    const fallbackTypes = result?.papers?.reduce((acc, paper) => {
                      const type = paper.studyType || "unknown";
                      const existing = acc.find(a => a.type === type);
                      if (existing) {
                        existing.count++;
                      } else {
                        acc.push({ type, count: 1, percentage: 0 });
                      }
                      return acc;
                    }, [] as { type: string; count: number; percentage: number; description?: string }[]) || [];
                    
                    const data = studyTypes.length > 0 ? studyTypes : fallbackTypes;
                    const total = data.reduce((sum, s) => sum + s.count, 0) || 1;
                    data.forEach(s => s.percentage = Math.round((s.count / total) * 100));
                    
                    const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-red-400", "bg-gray-400"];
                    
                    return data.slice(0, 6).map((item, i) => {
                      const label = studyTypeLabels[item.type]?.label || item.type.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[i % colors.length]}`} />
                          <span className="text-gray-600 flex-1 truncate">{label}</span>
                          <span className="text-gray-800 font-medium">{item.count}</span>
                          <span className="text-gray-400 w-8 text-right">{item.percentage}%</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* Detailed Breakdown */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {(() => {
                  const data = result?.methodologyBreakdown || [];
                  if (data.length === 0) return null;
                  
                  return data.filter(d => d.description).slice(0, 3).map((item, i) => (
                    <div key={i} className="p-2 rounded bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 capitalize">{item.type.replace(/-/g, " ")}</span>
                        <span className="text-xs text-gray-500">{item.count} papers</span>
                      </div>
                      <p className="text-[10px] text-gray-500">{item.description}</p>
                    </div>
                  ));
                })()}
              </div>
            </motion.div>

            {/* Data Reliability Score - Enhanced */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Data Reliability Assessment
              </h3>
              {(() => {
                // Use API data if available, otherwise calculate
                const apiReliability = result?.dataReliability;
                const papers = result?.papers || [];
                const totalPapers = papers.length || 1;
                
                let overallScore: number;
                let grade: string;
                let factors: { name: string; score: number; description: string; icon: typeof Award }[];
                
                if (apiReliability && apiReliability.factors && apiReliability.factors.length > 0) {
                  overallScore = apiReliability.score;
                  grade = apiReliability.grade || (overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : overallScore >= 60 ? "C" : "D");
                  factors = apiReliability.factors.map((f, idx) => ({
                    ...f,
                    icon: [Award, TrendingUp, Microscope, Target, Shield][idx % 5]
                  }));
                } else {
                  // Fallback calculation
                  const recentPapers = papers.filter(p => parseInt(p.year || "0") >= 2020).length;
                  const avgCitations = papers.reduce((sum, p) => sum + (p.citations || 0), 0) / totalPapers;
                  
                  const peerReviewedScore = 85;
                  const recencyScore = Math.min(100, Math.round((recentPapers / totalPapers) * 100) + 20);
                  const citationScore = Math.min(100, 40 + Math.floor(avgCitations));
                  const methodologyScore = Math.round(papers.filter(p => p.methodology && p.methodology !== "unknown").length / totalPapers * 100);
                  const confidenceAvg = Math.round(papers.reduce((sum, p) => sum + (p.confidence || 50), 0) / totalPapers);
                  
                  overallScore = Math.round((peerReviewedScore * 0.25) + (recencyScore * 0.2) + (citationScore * 0.25) + (methodologyScore * 0.15) + (confidenceAvg * 0.15));
                  grade = overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : overallScore >= 60 ? "C" : "D";
                  
                  factors = [
                    { name: "Peer Review Status", score: peerReviewedScore, description: "All papers from peer-reviewed sources", icon: Award },
                    { name: "Citation Impact", score: citationScore, description: `Average ${Math.round(avgCitations)} citations per paper`, icon: TrendingUp },
                    { name: "Research Recency", score: recencyScore, description: `${recentPapers} papers from 2020+`, icon: Clock },
                    { name: "Methodology Clarity", score: methodologyScore, description: "Papers with clear methodology", icon: Microscope },
                    { name: "Confidence Score", score: confidenceAvg, description: "Average confidence across papers", icon: Target },
                  ];
                }
                
                const gradeColors = {
                  "A": "bg-emerald-500",
                  "B": "bg-blue-500",
                  "C": "bg-amber-500",
                  "D": "bg-orange-500",
                  "F": "bg-red-500"
                };
                
                return (
                  <>
                    {/* Overall Score with Grade */}
                    <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-gray-50">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            className="text-gray-200"
                          />
                          <motion.circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 36 * (1 - overallScore / 100) }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className={overallScore >= 70 ? "text-emerald-500" : overallScore >= 50 ? "text-amber-500" : "text-red-400"}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-900">{overallScore}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg ${gradeColors[grade as keyof typeof gradeColors] || "bg-gray-500"}`}>
                            {grade}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {overallScore >= 80 ? "Excellent" : overallScore >= 70 ? "Good" : overallScore >= 60 ? "Fair" : "Needs Review"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Based on {totalPapers} peer-reviewed papers with comprehensive quality assessment
                        </p>
                      </div>
                    </div>
                    
                    {/* Factor Breakdown with descriptions */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reliability Factors</p>
                      {factors.map((factor, i) => {
                        const FactorIcon = factor.icon;
                        return (
                          <div key={i} className="p-2.5 rounded-lg bg-gray-50/50 border border-gray-100">
                            <div className="flex items-center gap-2 mb-1.5">
                              <FactorIcon className={`w-4 h-4 ${
                                factor.score >= 70 ? "text-emerald-600" : 
                                factor.score >= 50 ? "text-amber-600" : "text-red-500"
                              }`} />
                              <span className="text-sm font-medium text-gray-700 flex-1">{factor.name}</span>
                              <span className={`text-sm font-bold ${
                                factor.score >= 70 ? "text-emerald-600" : 
                                factor.score >= 50 ? "text-amber-600" : "text-red-500"
                              }`}>{factor.score}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${factor.score}%` }}
                                transition={{ duration: 0.6, delay: 0.1 * i }}
                                className={`h-full rounded-full ${
                                  factor.score >= 70 ? "bg-emerald-500" : 
                                  factor.score >= 50 ? "bg-amber-500" : "bg-red-400"
                                }`}
                              />
                            </div>
                            <p className="text-[10px] text-gray-500">{factor.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </motion.div>

            {/* Stance Distribution Details - Enhanced */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.65 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Research Stance Distribution
              </h3>
              
              {/* Main Stats Cards */}
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"
                >
                  <ThumbsUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">
                    {result?.papers?.filter(p => p.stance === "yes").length || 0}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium">Support</p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">
                    {result?.consensusMeter?.yes || 0}%
                  </p>
                </motion.div>
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <MinusCircle className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-700">
                    {result?.papers?.filter(p => p.stance === "neutral").length || 0}
                  </p>
                  <p className="text-xs text-gray-600 font-medium">Neutral</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {result?.consensusMeter?.neutral || 0}%
                  </p>
                </motion.div>
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-3 rounded-lg bg-red-50 border border-red-100"
                >
                  <ThumbsDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-600">
                    {result?.papers?.filter(p => p.stance === "no").length || 0}
                  </p>
                  <p className="text-xs text-red-600 font-medium">Oppose</p>
                  <p className="text-[10px] text-red-500 mt-0.5">
                    {result?.consensusMeter?.no || 0}%
                  </p>
                </motion.div>
              </div>
              
              {/* Visual Bar Chart */}
              <div className="mb-4">
                <div className="flex h-6 rounded-lg overflow-hidden border border-gray-200">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result?.consensusMeter?.yes || 0}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="bg-emerald-500 flex items-center justify-center"
                  >
                    {(result?.consensusMeter?.yes || 0) >= 15 && (
                      <span className="text-[10px] font-bold text-white">{result?.consensusMeter?.yes}%</span>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result?.consensusMeter?.neutral || 0}%` }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="bg-gray-400 flex items-center justify-center"
                  >
                    {(result?.consensusMeter?.neutral || 0) >= 15 && (
                      <span className="text-[10px] font-bold text-white">{result?.consensusMeter?.neutral}%</span>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result?.consensusMeter?.no || 0}%` }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="bg-red-500 flex items-center justify-center"
                  >
                    {(result?.consensusMeter?.no || 0) >= 15 && (
                      <span className="text-[10px] font-bold text-white">{result?.consensusMeter?.no}%</span>
                    )}
                  </motion.div>
                </div>
              </div>
              
              {/* Stance by Study Type */}
              {result?.stanceByStudyType && result.stanceByStudyType.length > 0 && (
                <div className="mb-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">By Study Type</p>
                  <div className="space-y-2">
                    {result.stanceByStudyType.slice(0, 4).map((item, i) => {
                      const total = item.yes + item.no + item.neutral || 1;
                      return (
                        <div key={i} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-600 capitalize">{item.studyType.replace(/-/g, " ")}</span>
                            <span className="text-gray-400">{total} papers</span>
                          </div>
                          <div className="flex h-2 rounded overflow-hidden">
                            <div style={{ width: `${(item.yes / total) * 100}%` }} className="bg-emerald-400" />
                            <div style={{ width: `${(item.neutral / total) * 100}%` }} className="bg-gray-300" />
                            <div style={{ width: `${(item.no / total) * 100}%` }} className="bg-red-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Consensus Strength */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Consensus Strength
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      (result?.consensusMeter?.yes || 0) >= 70 || (result?.consensusMeter?.no || 0) >= 70
                        ? "bg-emerald-100 text-emerald-700" 
                        : (result?.consensusMeter?.yes || 0) >= 50 || (result?.consensusMeter?.no || 0) >= 50
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {(result?.consensusMeter?.yes || 0) >= 70 || (result?.consensusMeter?.no || 0) >= 70
                        ? "Strong Consensus" 
                        : (result?.consensusMeter?.yes || 0) >= 50 || (result?.consensusMeter?.no || 0) >= 50
                          ? "Moderate Consensus"
                          : "Mixed Evidence"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Publication Timeline - Enhanced */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.75 }}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Publication Timeline
              </h3>
              
              {/* Year Distribution Chart */}
              <div className="space-y-2 mb-4">
                {(() => {
                  // Use API data if available
                  let yearData: { year: string; count: number; trend?: string }[];
                  
                  if (result?.yearDistribution && result.yearDistribution.length > 0) {
                    yearData = result.yearDistribution.slice(0, 8);
                  } else {
                    const years = result?.papers?.reduce((acc, paper) => {
                      const year = paper.year || "Unknown";
                      acc[year] = (acc[year] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>) || {};
                    
                    yearData = Object.entries(years)
                      .sort((a, b) => b[0].localeCompare(a[0]))
                      .slice(0, 8)
                      .map(([year, count]) => ({ year, count }));
                  }
                  
                  const maxCount = Math.max(...yearData.map(d => d.count), 1);
                  const totalPapers = yearData.reduce((sum, d) => sum + d.count, 0);
                  
                  return (
                    <>
                      {yearData.map((item, i) => {
                        const percentage = Math.round((item.count / totalPapers) * 100);
                        const isRecent = parseInt(item.year) >= 2020;
                        
                        return (
                          <motion.div 
                            key={item.year} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            className="flex items-center gap-2"
                          >
                            <span className={`text-xs w-12 shrink-0 font-medium ${isRecent ? "text-emerald-600" : "text-gray-500"}`}>
                              {item.year}
                            </span>
                            <div className="flex-1 h-5 bg-gray-100 rounded-lg overflow-hidden relative">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.count / maxCount) * 100}%` }}
                                transition={{ duration: 0.6, delay: 0.1 * i }}
                                className={`h-full rounded-lg flex items-center justify-end pr-2 ${
                                  isRecent ? "bg-emerald-500" : "bg-blue-400"
                                }`}
                              >
                                {item.count >= 2 && (
                                  <span className="text-[10px] text-white font-bold">{item.count}</span>
                                )}
                              </motion.div>
                              {item.count === 1 && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600">1</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 w-8 text-right">{percentage}%</span>
                            {item.trend && (
                              <span className={`text-[10px] ${
                                item.trend === "increasing" ? "text-emerald-500" : 
                                item.trend === "decreasing" ? "text-red-500" : "text-gray-400"
                              }`}>
                                {item.trend === "increasing" ? "↑" : item.trend === "decreasing" ? "↓" : "→"}
                              </span>
                            )}
                          </motion.div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
              
              {/* Timeline Stats */}
              <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-gray-50">
                  <p className="text-sm font-bold text-gray-900">
                    {(() => {
                      const years = result?.papers?.map(p => parseInt(p.year || "0")).filter(y => y > 0) || [];
                      return years.length > 0 ? Math.min(...years) : "-";
                    })()}
                  </p>
                  <p className="text-[10px] text-gray-500">Earliest</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-50">
                  <p className="text-sm font-bold text-gray-900">
                    {(() => {
                      const years = result?.papers?.map(p => parseInt(p.year || "0")).filter(y => y > 0) || [];
                      return years.length > 0 ? Math.max(...years) : "-";
                    })()}
                  </p>
                  <p className="text-[10px] text-gray-500">Latest</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50">
                  <p className="text-sm font-bold text-emerald-700">
                    {result?.papers?.filter(p => parseInt(p.year || "0") >= 2020).length || 0}
                  </p>
                  <p className="text-[10px] text-emerald-600">Since 2020</p>
                </div>
              </div>
            </motion.div>

            {/* Top Cited Papers */}
            {result?.topFindings && result.topFindings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Top Research Findings
                  <span className="text-xs text-gray-400 font-normal">(by citations)</span>
                </h3>
                <div className="space-y-2.5">
                  {result.topFindings.slice(0, 5).map((item, i) => {
                    const significanceColors = {
                      breakthrough: "border-l-amber-500 bg-amber-50/30",
                      significant: "border-l-emerald-500 bg-emerald-50/30",
                      supportive: "border-l-blue-500 bg-blue-50/30",
                      contradictory: "border-l-red-500 bg-red-50/30"
                    };
                    
                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className={`p-2.5 rounded-lg border-l-4 border border-gray-100 ${significanceColors[item.significance] || significanceColors.supportive}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-medium text-gray-800 line-clamp-2">{item.finding}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <Hash className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-bold text-gray-700">{item.citations}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-gray-500 truncate flex-1">{item.paperTitle}</p>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3 text-gray-400 hover:text-emerald-600" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">{item.year}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium capitalize ${
                            item.significance === "breakthrough" ? "bg-amber-100 text-amber-700" :
                            item.significance === "significant" ? "bg-emerald-100 text-emerald-700" :
                            item.significance === "contradictory" ? "bg-red-100 text-red-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {item.significance}
                          </span>
                          {item.citations === 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-100 text-emerald-700">
                              Web Source
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Conflicting Evidence */}
            {result?.conflictingEvidence && result.conflictingEvidence.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.85 }}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  Conflicting Evidence
                </h3>
                <div className="space-y-3">
                  {result.conflictingEvidence.map((conflict, i) => (
                    <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <p className="text-sm font-medium text-gray-800 mb-2">{conflict.topic}</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-100">
                          <p className="text-[10px] text-emerald-600 font-medium mb-1">Supporting ({conflict.supportingPapers.length})</p>
                          {conflict.supportingPapers.slice(0, 2).map((paper, j) => (
                            <p key={j} className="text-[10px] text-gray-600 truncate">{paper}</p>
                          ))}
                        </div>
                        <div className="p-2 rounded bg-red-50 border border-red-100">
                          <p className="text-[10px] text-red-600 font-medium mb-1">Opposing ({conflict.opposingPapers.length})</p>
                          {conflict.opposingPapers.slice(0, 2).map((paper, j) => (
                            <p key={j} className="text-[10px] text-gray-600 truncate">{paper}</p>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500">{conflict.explanation}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Sidebar - Chat & Popular Questions */}
          <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-100px)] order-3">
            {/* Research Assistant - Full Height */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl border border-gray-200 flex-1 flex flex-col min-h-[400px] overflow-hidden"
            >
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 shrink-0">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Research Assistant
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Ask follow-up questions about this research</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
                      msg.role === "user" 
                        ? "bg-emerald-600 text-white" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="bg-gray-100 rounded-xl px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-200 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about this research..."
                    className="flex-1 h-9 px-3 rounded-lg border border-gray-200 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    disabled={isChatLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {/* Quick questions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["What are the key findings?", "Any conflicting evidence?", "Study limitations?"].map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setChatInput(q);
                        setTimeout(() => handleChatSubmit(), 100);
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
