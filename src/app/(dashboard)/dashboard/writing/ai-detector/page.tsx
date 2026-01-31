"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ModelSelector, type ModelType, type UploadedFile, useAILanguage } from "@/components/ai";
import { 
  ToolHero, 
  GlassCard, 
  CardHeader, 
  CardBody,
  AnimatedButton,
  StepPills,
  ProgressRing,
  ContentLoading,
  Confetti,
} from "@/components/premium";
import { 
  ShieldCheck, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Scan, 
  Info, 
  Paperclip, 
  X, 
  File, 
  Trash2,
  Target,
  Lightbulb,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetectionIndicator {
  text: string;
  reason: string;
  startIndex?: number;
  endIndex?: number;
}

interface DetectionResult {
  aiScore: number;
  humanScore: number;
  analysis: string;
  indicators?: DetectionIndicator[];
  suggestions?: string[];
}

const steps = ["Input", "Analyze", "Results"];

export default function AIDetectorPage() {
  const [text, setText] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelType>("fast");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  // Update step based on state
  useEffect(() => {
    if (result) setCurrentStep(2);
    else if (isLoading) setCurrentStep(1);
    else setCurrentStep(0);
  }, [result, isLoading]);

  // Show confetti on good result
  useEffect(() => {
    if (result && result.humanScore >= 70) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [result]);

  // Function to highlight AI-detected phrases in the text
  const getHighlightedText = () => {
    if (!result?.indicators || result.indicators.length === 0) return text;
    
    let highlightedParts: { start: number; end: number; reason: string }[] = [];
    
    result.indicators.forEach(indicator => {
      const searchText = indicator.text.toLowerCase();
      const textLower = text.toLowerCase();
      let startPos = 0;
      
      while (true) {
        const index = textLower.indexOf(searchText, startPos);
        if (index === -1) break;
        
        highlightedParts.push({
          start: index,
          end: index + indicator.text.length,
          reason: indicator.reason
        });
        startPos = index + 1;
      }
    });
    
    highlightedParts.sort((a, b) => a.start - b.start);
    
    return highlightedParts;
  };

  const renderHighlightedText = () => {
    const parts = getHighlightedText();
    if (typeof parts === 'string') return <span>{parts}</span>;
    if (parts.length === 0) return <span>{text}</span>;
    
    const elements: React.ReactNode[] = [];
    let lastEnd = 0;
    
    parts.forEach((part, i) => {
      if (part.start > lastEnd) {
        elements.push(
          <span key={`text-${i}`}>{text.slice(lastEnd, part.start)}</span>
        );
      }
      elements.push(
        <motion.span 
          key={`highlight-${i}`}
          initial={{ backgroundColor: "rgba(254, 202, 202, 0)" }}
          animate={{ backgroundColor: "rgba(254, 202, 202, 1)" }}
          className="text-red-700 px-0.5 rounded border-b-2 border-red-400 cursor-help"
          title={part.reason}
        >
          {text.slice(part.start, part.end)}
        </motion.span>
      );
      lastEnd = part.end;
    });
    
    if (lastEnd < text.length) {
      elements.push(<span key="text-end">{text.slice(lastEnd)}</span>);
    }
    
    return <>{elements}</>;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = 5 - uploadedFiles.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    for (const file of filesToProcess) {
      if (!file.type.startsWith("text/") && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) continue;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText((prev) => prev + (prev ? '\n\n' : '') + content);
        const newFile: UploadedFile = { id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, name: file.name, type: "text", size: file.size, content };
        setUploadedFiles((prev) => prev.length < 5 ? [...prev, newFile] : prev);
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (id: string) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id));

  const handleAnalyze = async () => {
    if (text.trim().length < 50) {
      toast({ title: "Need at least 50 characters", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/ai/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model: selectedModel, language: aiLanguage }),
      });
      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json();
          toast({ 
            title: "Insufficient Credits", 
            description: `You need ${data.creditsNeeded} credits but have ${data.creditsRemaining} remaining.`,
            variant: "destructive" 
          });
          return;
        }
        throw new Error("Failed");
      }
      setResult(await response.json());
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      const words = text.split(/\s+/).length;
      const credits = Math.max(3, Math.ceil(words / 1000) * 3);
      window.dispatchEvent(new CustomEvent("credits-updated", { detail: { amount: credits } }));
    }
  };

  const getScoreColor = (score: number, isAI: boolean) => {
    if (isAI) {
      if (score >= 60) return { bg: "from-red-100 to-rose-50", text: "text-red-600", bar: "from-red-500 to-rose-500" };
      if (score >= 40) return { bg: "from-amber-100 to-yellow-50", text: "text-amber-600", bar: "from-amber-500 to-yellow-500" };
      return { bg: "from-green-100 to-emerald-50", text: "text-green-600", bar: "from-green-500 to-emerald-500" };
    }
    return { bg: "from-blue-100 to-indigo-50", text: "text-blue-600", bar: "from-blue-500 to-indigo-500" };
  };

  return (
    <div className={`h-[calc(100vh-6rem)] flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <Confetti show={showConfetti} />
      
      {/* Hero Header */}
      <ToolHero
        icon={ShieldCheck}
        title="AI Detector"
        titleKo="AI 탐지기"
        description="Analyze content for AI-generated patterns with 99% accuracy"
        credits={3}
        category="Writing & Helpers"
        categoryLink="/dashboard/writing"
        accentColor="rose"
        stats={[
          { label: "Accuracy", value: "99%" },
          { label: "Patterns", value: "50+" },
        ]}
      >
        <StepPills steps={steps} currentStep={currentStep} />
      </ToolHero>

      {/* Main Content */}
      <div className="flex-1 grid lg:grid-cols-2 gap-4 min-h-0">
        {/* Input Panel */}
        <GlassCard glowColor="rose" delay={0.1} className="flex flex-col overflow-hidden">
          <CardHeader
            icon={<Scan className="w-5 h-5 text-rose-600" />}
            title="Input Text"
            subtitle="Paste or type content to analyze"
            iconBg="bg-rose-50"
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{text.length} chars</span>
                {text && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setText(""); setUploadedFiles([]); setResult(null); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            }
          />

          <CardBody className="flex-1 overflow-y-auto space-y-4" noPadding>
            <div className="p-4 space-y-4">
              {/* Textarea with animated border */}
              <div className="relative">
                <Textarea
                  placeholder="Paste your text here (minimum 50 characters)..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[160px] resize-none border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 rounded-2xl text-sm transition-all"
                />
                {/* Progress indicator */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${text.length >= 50 ? "bg-gradient-to-r from-rose-500 to-pink-500" : "bg-gray-300"}`}
                      animate={{ width: `${Math.min(100, (text.length / 50) * 100)}%` }}
                    />
                  </div>
                  {text.length >= 50 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Model Selector */}
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">AI Model</Label>
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              </div>

              {/* File Upload */}
              <div>
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Import Text Files</Label>
                
                <AnimatePresence>
                  {uploadedFiles.length > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-wrap gap-2 mb-3"
                    >
                      {uploadedFiles.map((file) => (
                        <motion.div 
                          key={file.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="group flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm"
                        >
                          <File className="w-4 h-4 text-rose-500" />
                          <span className="text-xs text-gray-600 max-w-[100px] truncate">{file.name}</span>
                          <button 
                            onClick={() => removeFile(file.id)} 
                            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors"
                          >
                            <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploadedFiles.length >= 5}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center justify-center gap-2 px-4 py-3 w-full text-sm text-gray-500 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 rounded-2xl transition-all border-2 border-dashed border-gray-200 hover:border-rose-300 disabled:opacity-50"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Drop files or click to import</span>
                </motion.button>
                <input ref={fileInputRef} type="file" accept="text/*,.txt,.md" multiple onChange={handleFileSelect} className="hidden" />
              </div>
            </div>
          </CardBody>

          {/* Analyze Button */}
          <div className="p-4 border-t border-gray-100/50 shrink-0">
            <AnimatedButton
              onClick={handleAnalyze}
              disabled={isLoading || text.trim().length < 50}
              isLoading={isLoading}
              icon={Target}
              size="lg"
              className="w-full"
            >
              Analyze Content
            </AnimatedButton>
          </div>
        </GlassCard>

        {/* Result Panel */}
        <GlassCard glowColor="blue" delay={0.2} className="flex flex-col overflow-hidden">
          <CardHeader
            icon={<Sparkles className="w-5 h-5 text-blue-600" />}
            title="Detection Results"
            subtitle="AI analysis and patterns"
            iconBg="bg-blue-50"
          />

          <CardBody className="flex-1 overflow-y-auto" noPadding>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-4 space-y-4"
                >
                  {/* Score Cards - Circular Progress */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* AI Score */}
                    <motion.div 
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className={`relative p-4 rounded-2xl bg-gradient-to-br ${getScoreColor(result.aiScore, true).bg} border border-white/50`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className={`w-4 h-4 ${getScoreColor(result.aiScore, true).text}`} />
                            <span className="text-xs font-medium text-gray-600">AI Detected</span>
                          </div>
                          <p className={`text-3xl font-bold ${getScoreColor(result.aiScore, true).text}`}>
                            {result.aiScore}%
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {result.aiScore >= 60 ? "High AI probability" : result.aiScore >= 40 ? "Mixed content" : "Likely human"}
                          </p>
                        </div>
                        <ProgressRing 
                          progress={result.aiScore} 
                          size={60} 
                          color={result.aiScore >= 60 ? "amber" : result.aiScore >= 40 ? "amber" : "green"}
                          showPercentage={false}
                        />
                      </div>
                    </motion.div>

                    {/* Human Score */}
                    <motion.div 
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className={`relative p-4 rounded-2xl bg-gradient-to-br ${getScoreColor(result.humanScore, false).bg} border border-white/50`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-medium text-gray-600">Human Written</span>
                          </div>
                          <p className="text-3xl font-bold text-blue-600">
                            {result.humanScore}%
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            {result.humanScore >= 70 ? "Great job!" : "Needs improvement"}
                          </p>
                        </div>
                        <ProgressRing 
                          progress={result.humanScore} 
                          size={60} 
                          color="blue"
                          showPercentage={false}
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* Highlighted Text Preview */}
                  {result.indicators && result.indicators.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-4 rounded-2xl bg-white border border-red-100 shadow-sm"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                          <Scan className="w-3.5 h-3.5 text-red-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-800">Detected Patterns</h4>
                        <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                          {result.indicators.length} found
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto bg-gray-50/50 p-3 rounded-xl">
                        {renderHighlightedText()}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Hover over highlighted text to see detection reason
                      </p>
                    </motion.div>
                  )}

                  {/* AI Fingerprints */}
                  {result.indicators && result.indicators.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-800">AI Fingerprints</h4>
                      </div>
                      <div className="space-y-2 max-h-28 overflow-y-auto">
                        {result.indicators.slice(0, 5).map((indicator, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                            className="flex items-start gap-2 p-2 bg-white/60 rounded-xl"
                          >
                            <span className="shrink-0 w-5 h-5 rounded-lg bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                "{indicator.text.slice(0, 30)}{indicator.text.length > 30 ? "..." : ""}"
                              </span>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{indicator.reason}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Analysis */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Info className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800">Analysis Summary</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{result.analysis}</p>
                  </motion.div>

                  {/* Suggestions */}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center">
                          <Lightbulb className="w-3.5 h-3.5 text-rose-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-800">How to Improve</h4>
                      </div>
                      <ul className="space-y-2">
                        {result.suggestions.map((s, i) => (
                          <motion.li 
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <span className="w-5 h-5 rounded-lg bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span>{s}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* New Analysis Button */}
                  <AnimatedButton
                    variant="secondary"
                    onClick={() => { setResult(null); setText(""); }}
                    icon={Zap}
                    className="w-full"
                  >
                    New Analysis
                  </AnimatedButton>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center p-8"
                >
                  {isLoading ? (
                    <ContentLoading message="Scanning for AI patterns..." />
                  ) : (
                    <div className="text-center">
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4 shadow-lg"
                      >
                        <ShieldCheck className="w-8 h-8 text-gray-300" />
                      </motion.div>
                      <p className="text-gray-400 text-sm mb-1">Ready to analyze</p>
                      <p className="text-gray-300 text-xs">Paste your text and click analyze</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardBody>
        </GlassCard>
      </div>
    </div>
  );
}
