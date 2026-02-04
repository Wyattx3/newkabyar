"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Check, Zap, Code, Globe, Atom, PenTool, BarChart3, Brain, ChevronRight,
  Bookmark, BookmarkCheck, Volume2, Printer, ThumbsUp, ThumbsDown, RotateCcw,
  Eye, EyeOff, HelpCircle, Star, ChevronUp
} from "lucide-react";
import "katex/dist/katex.min.css";
import katex from "katex";

// Math renderer component
function MathText({ text }: { text: string }) {
  const rendered = useMemo(() => {
    if (!text) return "";
    
    // Process display math first ($$...$$)
    let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return `<div class="my-3 overflow-x-auto">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
      } catch {
        return `<code>${math}</code>`;
      }
    });
    
    // Process inline math ($...$)
    result = result.replace(/\$([^$]+)\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return `<code>${math}</code>`;
      }
    });
    
    return result;
  }, [text]);

  return <span dangerouslySetInnerHTML={{ __html: rendered }} />;
}

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
  
  // New feature states
  const [bookmarked, setBookmarked] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [showHints, setShowHints] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [activeStepQuestion, setActiveStepQuestion] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    // Scroll chat container only, not the page
    const chatContainer = chatEndRef.current?.parentElement;
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [chatMessages]);

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
        if (response.status === 401 || response.status === 503) {
          const errorData = await response.json().catch(() => ({}));
          toast({ 
            title: "Image analysis unavailable", 
            description: errorData.error || "Please try text input instead",
            variant: "destructive" 
          });
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

  // Feature: Ask about specific step
  const askAboutStep = async (stepIndex: number) => {
    if (!solution) return;
    const step = solution.steps[stepIndex];
    setActiveStepQuestion(stepIndex);
    setShowChat(true);
    const question = `Please explain Step ${step.step} "${step.title}" in more detail`;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: question }]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a patient tutor explaining step ${step.step} of solving a ${solution.problemType} problem. The step is: "${step.title}" with content: "${step.content}". Explain this step in simple terms, why we do it, and common mistakes to avoid.` },
            { role: "user", content: question }
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
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't explain this step." }]);
    } finally {
      setIsChatLoading(false);
      setActiveStepQuestion(null);
    }
  };

  // Feature: Text to Speech
  const speakSolution = () => {
    if (!solution || typeof window === "undefined") return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = `The answer is ${solution.finalAnswer}. Here are the steps: ${solution.steps.map(s => `Step ${s.step}, ${s.title}. ${s.content}`).join(". ")}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Feature: Print solution
  const printSolution = () => {
    if (!solution) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Solution</title>
      <style>body{font-family:system-ui;padding:40px;max-width:800px;margin:0 auto}
      h1{color:#16a34a}h2{color:#2563eb;margin-top:24px}
      .step{margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px}
      .step-num{display:inline-block;width:24px;height:24px;background:#2563eb;color:white;border-radius:50%;text-align:center;margin-right:8px}</style>
      </head><body>
      <h1>Answer: ${solution.finalAnswer}</h1>
      <p><strong>Problem Type:</strong> ${solution.problemType}</p>
      <h2>Solution Steps</h2>
      ${solution.steps.map(s => `<div class="step"><span class="step-num">${s.step}</span><strong>${s.title}</strong><p>${s.content}</p></div>`).join("")}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Feature: Toggle step expansion
  const toggleStepExpand = (stepIndex: number) => {
    setExpandedSteps(prev => 
      prev.includes(stepIndex) ? prev.filter(i => i !== stepIndex) : [...prev, stepIndex]
    );
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

  // Prevent parent scrolling for fit-view
  useEffect(() => {
    const parent = document.querySelector('main > div') as HTMLElement;
    const html = document.documentElement;
    const body = document.body;
    
    // Store original values
    const origHtmlOverflow = html.style.overflow;
    const origBodyOverflow = body.style.overflow;
    const origParentClass = parent?.className;
    
    // Set overflow hidden on all levels with !important to override Tailwind
    html.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    if (parent) {
      // Remove overflow-y-auto class and add overflow-hidden
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

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
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
        /* RESULTS STATE - 3-Column Fit View Layout */
        <div className="h-full flex bg-white overflow-hidden">
          {/* LEFT SIDEBAR - Info */}
          <div className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
            {/* Answer Card */}
            <div className="p-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <p className="text-[10px] font-medium text-gray-400">ANSWER</p>
              </div>
              <div className="text-base font-bold text-gray-900 leading-tight">
                <MathText text={solution.finalAnswer} />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <button 
                  onClick={() => setRating(rating === "up" ? null : "up")}
                  className={cn("p-1 rounded-lg", rating === "up" ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:bg-gray-100")}
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setRating(rating === "down" ? null : "down")}
                  className={cn("p-1 rounded-lg", rating === "down" ? "text-red-500 bg-red-50" : "text-gray-400 hover:bg-gray-100")}
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Given Info */}
              {solution.givenInfo.length > 0 && (
                <div className="p-3 border-b border-gray-100">
                  <p className="text-[10px] font-medium text-gray-400 mb-1">GIVEN</p>
                  <div className="space-y-1">
                    {solution.givenInfo.map((info, i) => (
                      <div key={i} className="text-[11px] text-gray-700 py-1 px-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <MathText text={info} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concepts */}
              {solution.concepts.length > 0 && (
                <div className="p-3 border-b border-gray-100">
                  <p className="text-[10px] font-medium text-gray-400 mb-1">CONCEPTS</p>
                  <div className="flex flex-wrap gap-1">
                    {solution.concepts.map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[10px]">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {solution.tips.length > 0 && (
                <div className="p-3">
                  <p className="text-[10px] font-medium text-gray-400 mb-1 flex items-center gap-1">
                    <Lightbulb className="w-2.5 h-2.5 text-amber-500" /> TIPS
                  </p>
                  <ul className="space-y-1">
                    {solution.tips.map((t, i) => (
                      <li key={i} className="text-[10px] text-gray-600 leading-relaxed">{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-2 border-t border-gray-100 shrink-0">
              <div className="grid grid-cols-4 gap-1">
                <button onClick={() => setBookmarked(!bookmarked)} className={cn("flex flex-col items-center gap-0.5 p-1 rounded-lg", bookmarked ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}>
                  {bookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                  <span className="text-[8px]">Save</span>
                </button>
                <button onClick={speakSolution} className={cn("flex flex-col items-center gap-0.5 p-1 rounded-lg", isSpeaking ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}>
                  <Volume2 className="w-3 h-3" />
                  <span className="text-[8px]">Speak</span>
                </button>
                <button onClick={printSolution} className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                  <Printer className="w-3 h-3" />
                  <span className="text-[8px]">Print</span>
                </button>
                <button onClick={copySolution} className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-gray-100 text-gray-500">
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[8px]">Copy</span>
                </button>
              </div>
            </div>
          </div>

          {/* CENTER - Steps */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-10 border-b border-gray-100 flex items-center justify-between px-3 shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={reset} className="p-1 hover:bg-gray-100 rounded-lg">
                  <RotateCcw className="w-3 h-3 text-gray-500" />
                </button>
                <p className="font-medium text-gray-900 text-sm">{solution.problemType}</p>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-lg">{solution.steps.length} steps</span>
              </div>
              <button
                onClick={() => setStepByStep(!stepByStep)}
                className={cn("text-[10px] px-2 py-0.5 rounded-lg", stepByStep ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600")}
              >
                {stepByStep ? "All" : "Step by Step"}
              </button>
            </div>

            {/* Steps */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-2">
                {solution.steps.map((step, i) => (
                  <div
                    key={i}
                    className={cn("bg-white border border-gray-200 rounded-xl transition-all hover:border-blue-200", stepByStep && i > currentStep && "opacity-30")}
                  >
                    <div 
                      className="p-3 flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleStepExpand(i)}
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 text-sm">{step.title}</p>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); askAboutStep(i); }}
                              className="p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                            >
                              {activeStepQuestion === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <HelpCircle className="w-3 h-3" />}
                            </button>
                            {expandedSteps.includes(i) ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                          </div>
                        </div>
                        <div className={cn("text-xs text-gray-600 leading-relaxed mt-1", !expandedSteps.includes(i) && "line-clamp-2")}>
                          <MathText text={step.content} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {stepByStep && currentStep < solution.steps.length - 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="w-full mt-2 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR - Chat & Practice */}
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
            {/* Practice Problems */}
            <div className="p-2 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium text-gray-400">PRACTICE</p>
                <button
                  onClick={generateSimilarProblems}
                  disabled={isGeneratingSimilar}
                  className="text-[10px] text-blue-600 flex items-center gap-0.5"
                >
                  {isGeneratingSimilar ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <><RefreshCw className="w-2.5 h-2.5" /> Generate</>}
                </button>
              </div>
              {similarProblems.length > 0 ? (
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {similarProblems.map((p, i) => (
                    <div key={i} className="p-1.5 bg-white border border-gray-100 rounded-lg text-[10px] text-gray-700">
                      <span className="font-bold text-blue-600">{i+1}.</span> <MathText text={p} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 text-center py-2">Click to generate</p>
              )}
            </div>

            {/* AI Chat */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-2 py-1.5 border-b border-gray-100 flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-gray-900">AI Tutor</p>
                  <p className="text-[9px] text-green-500">Click ? on step</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chatMessages.length === 0 && (
                  <div className="space-y-1">
                    {["Why this formula?", "Explain step 1", "Different approach?"].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setChatInput(q)}
                        className="w-full text-left px-2 py-1 bg-white rounded-lg border border-gray-200 text-[10px] text-gray-600 hover:border-blue-300"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[90%] px-2 py-1 rounded-xl text-[11px]", msg.role === "user" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200")}>
                      <MathText text={msg.content} />
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="bg-white px-2 py-1 rounded-xl border border-gray-200 w-fit">
                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-2 border-t border-gray-100 bg-white shrink-0">
                <div className="flex gap-1">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask..."
                    onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                    className="rounded-xl text-[11px] h-7"
                  />
                  <Button onClick={handleChatSubmit} size="sm" className="rounded-xl w-7 h-7 p-0 bg-blue-600">
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
