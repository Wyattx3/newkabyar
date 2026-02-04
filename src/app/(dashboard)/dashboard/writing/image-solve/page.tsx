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
  Camera, Loader2, Sparkles, Upload, X, Clipboard, Lightbulb, CheckCircle,
  BookOpen, Calculator, Beaker, FileText, Link2, Type, Mic, History,
  Download, Share2, MessageSquare, RefreshCw, ChevronDown, Send, Copy,
  Check, Zap, Code, Globe, Atom, PenTool, BarChart3, Brain, ChevronRight
} from "lucide-react";

interface SolutionStep {
  step: number;
  title: string;
  content: string;
}

interface Solution {
  problemType: string;
  givenInfo: string[];
  steps: SolutionStep[];
  finalAnswer: string;
  concepts: string[];
  tips: string[];
  explanation?: string;
  codeUsed?: string | null;
  codeOutput?: string | null;
}

interface SolveHistory {
  id: string;
  inputType: string;
  preview: string;
  problemType: string;
  answer: string;
  timestamp: number;
}

const SUBJECTS = [
  { id: "math", label: "Mathematics", icon: Calculator, color: "blue" },
  { id: "physics", label: "Physics", icon: Atom, color: "purple" },
  { id: "chemistry", label: "Chemistry", icon: Beaker, color: "green" },
  { id: "biology", label: "Biology", icon: Brain, color: "pink" },
  { id: "programming", label: "Programming", icon: Code, color: "orange" },
  { id: "statistics", label: "Statistics", icon: BarChart3, color: "cyan" },
];

const INPUT_MODES = [
  { id: "image", label: "Image", icon: Camera, desc: "Upload or paste an image" },
  { id: "text", label: "Text", icon: Type, desc: "Type your problem" },
  { id: "pdf", label: "PDF", icon: FileText, desc: "Extract from PDF" },
  { id: "url", label: "URL", icon: Link2, desc: "From webpage" },
];

export default function MultiInputSolverPage() {
  const [mounted, setMounted] = useState(false);
  
  // Settings
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("solver-model", "fast");
  const [subject, setSubject] = usePersistedState("solver-subject", "math");
  const [detailLevel, setDetailLevel] = usePersistedState("solver-detail", "detailed");
  
  // Input states
  const [inputMode, setInputMode] = useState<"image" | "text" | "pdf" | "url">("image");
  const [image, setImage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [showSubjects, setShowSubjects] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepByStep, setStepByStep] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Feature states
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = usePersistedState<SolveHistory[]>("solver-history", []);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  const [similarProblems, setSimilarProblems] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Handle paste for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (inputMode !== "image") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleImageFile(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [inputMode]);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setSolution(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePdfFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Please upload a PDF", variant: "destructive" });
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/utils/parse-pdf", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Failed");
      const { text } = await response.json();
      setTextInput(text.substring(0, 2000));
      setInputMode("text");
      toast({ title: "PDF text extracted" });
    } catch {
      toast({ title: "Failed to parse PDF", variant: "destructive" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type === "application/pdf") {
        handlePdfFile(file);
      } else if (file.type.startsWith("image/")) {
        handleImageFile(file);
      }
    }
  };

  const solve = async () => {
    let input = "";
    if (inputMode === "image" && image) {
      input = image;
    } else if (inputMode === "text" && textInput.trim()) {
      input = textInput;
    } else if (inputMode === "url" && urlInput.trim()) {
      input = urlInput;
    } else {
      toast({ title: "Please provide input", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setSolution(null);
    setCurrentStep(0);
    setSimilarProblems([]);

    try {
      const response = await fetch("/api/tools/image-solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: inputMode === "image" ? input : null,
          text: inputMode !== "image" ? input : null,
          inputType: inputMode,
          subject,
          detailLevel,
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
      setSolution(data);
      
      // Add to history
      const historyItem: SolveHistory = {
        id: Date.now().toString(),
        inputType: inputMode,
        preview: inputMode === "image" ? "Image problem" : (input.substring(0, 50) + "..."),
        problemType: data.problemType,
        answer: data.finalAnswer,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch (error) {
      console.error(error);
      toast({ title: "Could not solve problem", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const generateSimilarProblems = async () => {
    if (!solution) return;
    setIsGeneratingSimilar(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Generate 3 similar practice problems based on this ${solution.problemType} problem. The original answer was: ${solution.finalAnswer}. Only provide the problems, numbered 1-3, no solutions.` }],
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
      const problems = content.split(/\d+\./).filter(p => p.trim()).map(p => p.trim());
      setSimilarProblems(problems);
    } catch {
      toast({ title: "Failed to generate problems", variant: "destructive" });
    } finally {
      setIsGeneratingSimilar(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !solution) return;
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
            { role: "system", content: `You are helping explain a ${solution.problemType} problem. The answer is: ${solution.finalAnswer}. Help the student understand.` },
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

  const copySolution = () => {
    if (!solution) return;
    let text = `Problem Type: ${solution.problemType}\n\n`;
    text += `Given: ${solution.givenInfo.join(", ")}\n\n`;
    text += `Steps:\n${solution.steps.map(s => `${s.step}. ${s.title}: ${s.content}`).join("\n")}\n\n`;
    text += `Answer: ${solution.finalAnswer}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportSolution = () => {
    if (!solution) return;
    let text = `# ${solution.problemType}\n\n`;
    text += `## Given Information\n${solution.givenInfo.map(g => `- ${g}`).join("\n")}\n\n`;
    text += `## Solution\n${solution.steps.map(s => `### Step ${s.step}: ${s.title}\n${s.content}`).join("\n\n")}\n\n`;
    text += `## Answer\n**${solution.finalAnswer}**\n\n`;
    if (solution.concepts.length) text += `## Concepts Used\n${solution.concepts.join(", ")}\n`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solution_${Date.now()}.md`;
    a.click();
  };

  const reset = () => {
    setImage(null);
    setTextInput("");
    setUrlInput("");
    setSolution(null);
    setSimilarProblems([]);
    setChatMessages([]);
  };

  const hasResult = !!solution;

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50 overflow-hidden">
      {/* INITIAL STATE - Fit View */}
      {!hasResult ? (
        <div className="h-full flex overflow-hidden">
          {/* Main Input Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">Problem Solver</h1>
                  <p className="text-xs text-gray-500">Upload image, type, or paste from PDF</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Input Mode Tabs */}
                {INPUT_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setInputMode(mode.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      inputMode === mode.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    <mode.icon className="w-3.5 h-3.5" />
                    {mode.label}
                  </button>
                ))}
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1 ml-2">
                  <Sparkles className="w-3 h-3" /> 5 credits
                </span>
              </div>
            </div>

            {/* Input Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Image Mode */}
              {inputMode === "image" && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => !image && fileInputRef.current?.click()}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center cursor-pointer transition-all",
                    dragActive ? "bg-blue-50" : "hover:bg-gray-50",
                    image && "cursor-default p-4"
                  )}
                >
                  {!image ? (
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-900 font-medium mb-2">Drop an image or click to upload</p>
                      <p className="text-sm text-gray-500 mb-4">You can also paste from clipboard (Ctrl+V)</p>
                      <div className="flex justify-center gap-2">
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">PNG</span>
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">JPG</span>
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">WEBP</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="relative bg-gray-900 rounded-xl overflow-hidden max-h-full">
                        <img src={image} alt="Problem" className="max-h-[calc(100vh-220px)] object-contain" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setImage(null); }}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              )}

              {/* Text Mode */}
              {inputMode === "text" && (
                <div className="flex-1 p-6 overflow-hidden">
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type or paste your problem here...

Example:
A car travels 120 km in 2 hours. What is its average speed?

Or:

Solve for x: 2x + 5 = 13"
                    className="h-full border-0 border-none shadow-none ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base resize-none bg-transparent"
                  />
                </div>
              )}

              {/* PDF Mode */}
              {inputMode === "pdf" && (
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all"
                >
                  <FileText className="w-12 h-12 text-blue-600 mb-4" />
                  <p className="text-gray-900 font-medium mb-2">Upload a PDF document</p>
                  <p className="text-sm text-gray-500">We'll extract the text and help solve problems from it</p>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files?.[0] && handlePdfFile(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              )}

              {/* URL Mode */}
              {inputMode === "url" && (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                  <div className="w-full max-w-md">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <Input
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Paste a URL with the problem..."
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">Works with educational websites, forums, and problem banks</p>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  {/* Subject Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSubjects(!showSubjects)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm hover:border-gray-300"
                    >
                      {(() => { const s = SUBJECTS.find(s => s.id === subject); return s ? <><s.icon className="w-4 h-4" /><span className="text-xs">{s.label}</span></> : null; })()}
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                    {showSubjects && (
                      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[160px]">
                        {SUBJECTS.map(s => (
                          <button
                            key={s.id}
                            onClick={() => { setSubject(s.id); setShowSubjects(false); }}
                            className={cn(
                              "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50",
                              subject === s.id && "bg-blue-50 text-blue-600"
                            )}
                          >
                            <s.icon className="w-4 h-4" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Detail Level */}
                  <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
                    {["brief", "detailed", "comprehensive"].map(level => (
                      <button
                        key={level}
                        onClick={() => setDetailLevel(level)}
                        className={cn(
                          "px-2 py-1 text-xs font-medium rounded-md capitalize",
                          detailLevel === level ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>

                  {/* Model Selector */}
                  <div className="px-2 py-1 rounded-lg bg-white border border-gray-200">
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>

                  {/* History */}
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className={cn("h-8 px-2 rounded-lg", showHistory && "bg-blue-50 text-blue-600")}>
                    <History className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  onClick={solve}
                  disabled={isLoading || (inputMode === "image" && !image) || (inputMode === "text" && !textInput.trim()) || (inputMode === "url" && !urlInput.trim())}
                  className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Solve <ChevronRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          </div>

          {/* Right - History Panel */}
          {showHistory && (
            <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
              <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
                <span className="font-medium text-gray-900 text-sm">Recent Solutions</span>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {history.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No history yet</p>
                ) : (
                  history.slice(0, 20).map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        {h.inputType === "image" ? <Camera className="w-4 h-4 text-blue-600" /> : <Type className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{h.problemType}</p>
                        <p className="text-xs text-gray-500 truncate">{h.preview}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* RESULTS STATE - Facebook-like Simple Text */
        <div className="h-full flex bg-gray-50 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={reset} className="text-sm text-blue-600 font-medium hover:underline">
                  ← New Problem
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={copySolution} className="p-1.5 hover:bg-gray-100 rounded">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
                <button onClick={exportSolution} className="p-1.5 hover:bg-gray-100 rounded">
                  <Download className="w-4 h-4 text-gray-500" />
                </button>
                <button onClick={() => setShowChat(!showChat)} className={cn("p-1.5 rounded", showChat && "bg-blue-100")}>
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content - Single Card Like Facebook Post */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">{solution.problemType}</p>
                </div>
                
                {/* Body - Plain Text Solution */}
                <div className="px-4 py-4">
                  {/* Answer */}
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">Answer</p>
                    <p className="text-base text-gray-900 font-medium">{solution.finalAnswer}</p>
                  </div>
                  
                  {/* Steps as Plain Text */}
                  <div className="space-y-4">
                    {solution.steps.map((step, i) => (
                      <div key={i} className={cn(stepByStep && i > currentStep && "opacity-30")}>
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">Step {step.step}: {step.title}</span>
                        </p>
                        <p className="text-sm text-gray-700 mt-0.5">{step.content}</p>
                      </div>
                    ))}
                  </div>

                  {stepByStep && currentStep < solution.steps.length - 1 && (
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                    >
                      Show Next Step
                    </button>
                  )}
                </div>

                {/* Footer - Actions */}
                <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => setStepByStep(!stepByStep)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {stepByStep ? "Show All Steps" : "Step by Step Mode"}
                  </button>
                  <button
                    onClick={generateSimilarProblems}
                    disabled={isGeneratingSimilar}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {isGeneratingSimilar && <Loader2 className="w-3 h-3 animate-spin" />}
                    Practice Similar
                  </button>
                </div>
              </div>

              {/* Similar Problems - Separate Card */}
              {similarProblems.length > 0 && (
                <div className="max-w-xl mx-auto mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Practice Problems</p>
                  {similarProblems.map((p, i) => (
                    <p key={i} className="text-sm text-gray-700 mb-2">{i + 1}. {p}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          {showChat && (
            <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
              <div className="h-11 border-b border-gray-200 flex items-center justify-between px-3 shrink-0">
                <span className="text-sm font-medium">Ask AI</span>
                <button onClick={() => setShowChat(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("max-w-[90%] p-2 rounded-lg text-sm", msg.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-800")}>
                    {msg.content}
                  </div>
                ))}
                {isChatLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-gray-200 shrink-0 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask..."
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="text-sm h-8"
                />
                <Button onClick={handleChatSubmit} size="sm" className="h-8 px-2 bg-blue-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
