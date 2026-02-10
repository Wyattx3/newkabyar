"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import { cn } from "@/lib/utils";
import {
  BrainCircuit,
  Loader2,
  ChevronDown,
  ClipboardPaste,
  Sparkles,
  CheckCircle2,
  XCircle,
  Copy,
  ChevronRight,
  FileText,
  Code2,
  Calculator,
  Search,
  BarChart3,
  Lightbulb,
  ListChecks,
  HelpCircle,
  GitBranch,
  Languages,
  Layers,
  Clock,
  Zap,
  Upload,
  X,
  File,
  ArrowLeft,
  Check,
  ChevronUp,
} from "lucide-react";
import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

const FORMATS = [
  { value: "detailed", label: "Detailed", icon: "📋", desc: "Thorough with examples" },
  { value: "concise", label: "Concise", icon: "⚡", desc: "Quick & direct" },
  { value: "academic", label: "Academic", icon: "🎓", desc: "Formal & cited" },
];

const TASK_ICONS: Record<string, React.ReactNode> = {
  essay: <FileText className="w-3.5 h-3.5" />,
  math: <Calculator className="w-3.5 h-3.5" />,
  code: <Code2 className="w-3.5 h-3.5" />,
  research: <Search className="w-3.5 h-3.5" />,
  analysis: <BarChart3 className="w-3.5 h-3.5" />,
  creative: <Lightbulb className="w-3.5 h-3.5" />,
  summary: <ListChecks className="w-3.5 h-3.5" />,
  qa: <HelpCircle className="w-3.5 h-3.5" />,
  diagram: <GitBranch className="w-3.5 h-3.5" />,
  translation: <Languages className="w-3.5 h-3.5" />,
  other: <Layers className="w-3.5 h-3.5" />,
};

const TASK_COLORS: Record<string, string> = {
  essay: "bg-blue-50 text-blue-600 border-blue-100",
  math: "bg-emerald-50 text-emerald-600 border-emerald-100",
  code: "bg-violet-50 text-violet-600 border-violet-100",
  research: "bg-amber-50 text-amber-600 border-amber-100",
  analysis: "bg-rose-50 text-rose-600 border-rose-100",
  creative: "bg-orange-50 text-orange-600 border-orange-100",
  summary: "bg-teal-50 text-teal-600 border-teal-100",
  qa: "bg-sky-50 text-sky-600 border-sky-100",
  diagram: "bg-indigo-50 text-indigo-600 border-indigo-100",
  translation: "bg-pink-50 text-pink-600 border-pink-100",
  other: "bg-gray-50 text-gray-600 border-gray-100",
};

interface TaskResult {
  id: number;
  title: string;
  type: string;
  status: "completed" | "error";
  content: string;
  codeBlocks?: { language: string; code: string }[];
  mathExpressions?: string[];
}

interface AssignmentResult {
  title: string;
  totalTasks: number;
  completedTasks: number;
  tasks: {
    id: number;
    type: string;
    title: string;
    description: string;
    priority: string;
    result?: TaskResult;
  }[];
}

// Markdown components with syntax highlighting
const markdownComponents = {
  h1: ({ children, ...props }: React.ComponentPropsWithoutRef<"h1">) => (
    <h1 className="text-lg lg:text-xl font-bold text-gray-900 mt-5 mb-3 pb-2 border-b border-gray-100" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-base lg:text-lg font-bold text-gray-800 mt-4 mb-2" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-base font-semibold text-gray-700 mt-3 mb-1.5" {...props}>{children}</h3>
  ),
  p: ({ children, ...props }: React.ComponentPropsWithoutRef<"p">) => (
    <p className="text-sm text-gray-600 leading-relaxed mb-3" {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc pl-5 mb-3 space-y-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<"li">) => (
    <li className="text-sm text-gray-600 leading-relaxed" {...props}>{children}</li>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-3 border-blue-300 pl-4 py-1 my-3 bg-blue-50/30 rounded-r-lg" {...props}>{children}</blockquote>
  ),
  strong: ({ children, ...props }: React.ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-gray-800" {...props}>{children}</strong>
  ),
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
      <table className="w-full text-sm" {...props}>{children}</table>
    </div>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<"th">) => (
    <th className="bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200" {...props}>{children}</th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<"td">) => (
    <td className="px-3 py-2 text-sm text-gray-600 border-b border-gray-50" {...props}>{children}</td>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const inline = !match;
    if (inline) {
      return (
        <code className="bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <div className="my-3 rounded-xl overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
          <span className="text-[10px] font-mono text-gray-400 uppercase">{match[1]}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
            }}
            className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
        <SyntaxHighlighter
          style={oneLight}
          language={match[1]}
          PreTag="div"
          customStyle={{ margin: 0, padding: "12px 16px", fontSize: "12px", background: "#fafafa" }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    );
  },
};

interface InitialData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
}

// ─── Processing Animation Component ───
function ProcessingOverlay({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 max-w-sm px-6">
        {/* Animated brain icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center">
            <BrainCircuit className="w-10 h-10 text-blue-500" />
          </div>
          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-400" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s", animationDelay: "1s" }}>
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-300" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s", animationDelay: "2s" }}>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-200" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-base font-semibold text-gray-900">Working on your assignment</h3>
          <p className="text-xs text-gray-400">
            {progress < 30 ? "Analyzing tasks..." : progress < 60 ? "Solving each task..." : progress < 90 ? "Polishing results..." : "Almost done..."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-[240px]">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-300">Processing</span>
            <span className="text-[10px] text-blue-500 font-medium">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Animated step indicators */}
        <div className="flex items-center gap-3">
          {["Analyze", "Solve", "Review"].map((step, i) => {
            const isActive = progress >= i * 33;
            const isDone = progress >= (i + 1) * 33;
            return (
              <div key={step} className="flex items-center gap-1.5">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-500",
                  isDone ? "bg-blue-500 text-white" : isActive ? "bg-blue-100 text-blue-600 animate-pulse" : "bg-gray-100 text-gray-400"
                )}>
                  {isDone ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={cn("text-[10px] font-medium", isActive ? "text-gray-600" : "text-gray-300")}>{step}</span>
                {i < 2 && <div className={cn("w-4 h-px", isDone ? "bg-blue-300" : "bg-gray-200")} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export default function AssignmentWorkerPage({ initialData }: { initialData?: InitialData } = {}) {
  const [mounted, setMounted] = useState(false);

  // View mode: "input" or "result"
  const [viewMode, setViewMode] = useState<"input" | "result">(
    initialData?.outputData ? "result" : "input"
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [assignment, setAssignment] = usePersistedState("assignment-worker-text", (initialData?.inputData?.assignment as string) || "");
  const [instructions, setInstructions] = usePersistedState("assignment-worker-instructions", (initialData?.inputData?.instructions as string) || "");
  const [outputFormat, setOutputFormat] = usePersistedState("assignment-worker-format", (initialData?.settings?.outputFormat as string) || "detailed");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("assignment-worker-model", (initialData?.settings?.model as ModelType) || "fast");

  const [showFormat, setShowFormat] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const [copiedTaskId, setCopiedTaskId] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; size: number } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const [result, setResult] = useState<AssignmentResult | null>((initialData?.outputData as unknown as AssignmentResult) || null);

  const { toast } = useToast();
  const language = useAILanguage();
  const { saveProject } = useAutoSaveProject("assignment-worker");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fit view
  useEffect(() => {
    const parent = document.querySelector("main > div") as HTMLElement;
    const html = document.documentElement;
    const body = document.body;
    const origParentClass = parent?.className;
    html.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty("overflow", "hidden", "important");
    if (parent) {
      parent.classList.remove("overflow-y-auto");
      parent.classList.add("overflow-hidden", "p-0");
      parent.style.setProperty("overflow", "hidden", "important");
      parent.style.setProperty("padding", "0", "important");
    }
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      if (parent && origParentClass) {
        parent.className = origParentClass;
        parent.style.removeProperty("overflow");
        parent.style.removeProperty("padding");
      }
    };
  }, []);

  useEffect(() => {
    const handleClick = () => setShowFormat(false);
    if (showFormat) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [showFormat]);

  // Simulate progress during loading
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      let progress = 0;
      progressTimerRef.current = setInterval(() => {
        progress += Math.random() * 8 + 2;
        if (progress > 92) progress = 92;
        setLoadingProgress(progress);
      }, 600);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isLoading]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setAssignment(text);
    } catch {
      toast({ title: "Paste failed", description: "Could not read clipboard", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
      "text/csv",
    ];
    const allowedExts = [".pdf", ".doc", ".docx", ".txt", ".md", ".csv"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast({ title: "Unsupported file", description: "Please upload PDF, DOC, DOCX, TXT, MD, or CSV files", variant: "destructive" });
      return;
    }

    setIsParsingFile(true);
    setUploadedFile({ name: file.name, type: file.type || ext, size: file.size });

    try {
      if (ext === ".txt" || ext === ".md" || ext === ".csv" || file.type === "text/plain" || file.type === "text/markdown" || file.type === "text/csv") {
        const text = await file.text();
        setAssignment((prev: string) => prev ? prev + "\n\n--- File: " + file.name + " ---\n\n" + text : text);
        toast({ title: "File loaded", description: `${file.name} content extracted` });
      } else if (ext === ".pdf" || file.type === "application/pdf") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("toolId", "assignment-worker");
        const res = await fetch("/api/tools/parse-pdf", { method: "POST", body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to parse PDF");
        }
        const data = await res.json();
        const pdfText = data.text || "";
        setAssignment((prev: string) => prev ? prev + "\n\n--- File: " + file.name + " ---\n\n" + pdfText : pdfText);
        toast({ title: "PDF loaded", description: `${file.name} — ${data.pages || "?"} pages extracted` });
      } else if (ext === ".doc" || ext === ".docx" || file.type.includes("word")) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/tools/parse-doc", { method: "POST", body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to parse document");
        }
        const data = await res.json();
        const docText = data.text || "";
        setAssignment((prev: string) => prev ? prev + "\n\n--- File: " + file.name + " ---\n\n" + docText : docText);
        toast({ title: "Document loaded", description: `${file.name} content extracted` });
      }
    } catch (error) {
      toast({
        title: "File parsing failed",
        description: error instanceof Error ? error.message : "Could not read file",
        variant: "destructive",
      });
      setUploadedFile(null);
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyTaskContent = async (taskId: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedTaskId(taskId);
    setTimeout(() => setCopiedTaskId(null), 1500);
  };

  const transitionToResults = useCallback(() => {
    setIsTransitioning(true);
    setLoadingProgress(100);
    // Short delay then switch
    setTimeout(() => {
      setViewMode("result");
      // Let the DOM update, then remove transition
      requestAnimationFrame(() => {
        setTimeout(() => setIsTransitioning(false), 400);
      });
    }, 300);
  }, []);

  const handleGenerate = async () => {
    if (!assignment.trim()) {
      toast({ title: "Assignment required", description: "Please enter your assignment", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setExpandedTask(null);

    try {
      const response = await fetch("/api/tools/assignment-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment: assignment.trim(),
          instructions: instructions.trim() || undefined,
          outputFormat,
          model: selectedModel,
          language,
        }),
      });

      if (!response.ok) {
        let errMsg = "Something went wrong";
        try {
          const errorData = await response.json();
          errMsg = typeof errorData.error === "string" ? errorData.error : errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
        setExpandedTask(data.data.tasks[0]?.id ?? null);
        saveProject({
          inputData: { assignment, instructions },
          outputData: data.data,
          settings: { outputFormat, model: selectedModel },
          inputPreview: assignment.slice(0, 200),
        });
        toast({
          title: "Assignment completed!",
          description: `${data.data.completedTasks}/${data.data.totalTasks} tasks done`,
        });
        // Transition to results view
        transitionToResults();
      } else {
        throw new Error("Invalid response");
      }
    } catch (error: unknown) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToInput = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setViewMode("input");
      requestAnimationFrame(() => {
        setTimeout(() => setIsTransitioning(false), 400);
      });
    }, 100);
  };

  const currentFormat = FORMATS.find((f) => f.value === outputFormat) || FORMATS[0];

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      {/* Processing overlay */}
      {isLoading && <ProcessingOverlay progress={loadingProgress} />}

      {/* ═══════════════════ INPUT VIEW ═══════════════════ */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col bg-white transition-all duration-500 ease-out",
          viewMode === "input"
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 -translate-x-8 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <BrainCircuit className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">Assignment Worker</h1>
                <p className="text-xs text-gray-400">AI autonomously completes your entire assignment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Format Selector */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFormat(!showFormat); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm transition-colors"
                >
                  <span>{currentFormat.icon}</span>
                  <span className="text-gray-700 hidden sm:inline">{currentFormat.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showFormat && (
                  <div
                    className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {FORMATS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => { setOutputFormat(f.value); setShowFormat(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors",
                          outputFormat === f.value && "bg-blue-50"
                        )}
                      >
                        <span>{f.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-700">{f.label}</div>
                          <div className="text-xs text-gray-400">{f.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              {/* Show Results button if result exists */}
              {result && (
                <button
                  onClick={() => { setViewMode("result"); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View Results</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main input area - full screen */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 lg:px-0 overflow-hidden">
            {/* Assignment label */}
            <div className="flex items-center justify-between py-3 flex-shrink-0">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Assignment</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsingFile}
                  className="text-xs text-gray-400 hover:text-blue-500 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {isParsingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload file
                </button>
              </div>
            </div>

            {/* Textarea area */}
            <div className="flex-1 relative rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm focus-within:border-blue-300 focus-within:shadow-blue-100/50 focus-within:shadow-md transition-all min-h-0">
              {!assignment ? (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4">
                      {/* Paste */}
                      <button
                        onClick={handlePaste}
                        className="flex flex-col items-center gap-2.5 px-8 py-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                          <ClipboardPaste className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-blue-500 font-medium transition-colors">Paste</span>
                      </button>

                      <span className="text-[10px] text-gray-300 font-medium">OR</span>

                      {/* Upload */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2.5 px-8 py-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                          <Upload className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-blue-500 font-medium transition-colors">Upload</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-300">Supports PDF, DOC, DOCX, TXT, MD, CSV</p>
                  </div>
                </div>
              ) : null}
              <Textarea
                value={assignment}
                onChange={(e) => setAssignment(e.target.value)}
                placeholder=""
                className="h-full border-0 resize-none focus-visible:ring-0 rounded-none text-sm text-gray-700 placeholder:text-gray-300 p-5 transition-none"
                style={{ transition: "none" }}
              />
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Uploaded file indicator */}
            {(uploadedFile || isParsingFile) && (
              <div className="mt-2 flex-shrink-0">
                <div className="flex items-center justify-between bg-blue-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {isParsingFile ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
                    ) : (
                      <File className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-blue-700 truncate">
                        {isParsingFile ? "Parsing file..." : uploadedFile?.name}
                      </div>
                      {uploadedFile && !isParsingFile && (
                        <div className="text-[10px] text-blue-400">{formatFileSize(uploadedFile.size)}</div>
                      )}
                    </div>
                  </div>
                  {!isParsingFile && (
                    <button onClick={removeFile} className="text-blue-400 hover:text-blue-600 p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Extra instructions toggle */}
            <div className="mt-2 flex-shrink-0">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Additional instructions
                <ChevronDown className={cn("w-3 h-3 transition-transform", showInstructions && "rotate-180")} />
              </button>
              {showInstructions && (
                <div className="mt-2">
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. 'Use APA format', 'Include Python code', 'Write in formal tone'..."
                    className="h-20 border border-gray-200 rounded-xl resize-none focus-visible:ring-1 focus-visible:ring-blue-300 text-xs text-gray-600 placeholder:text-gray-300 p-3"
                    style={{ transition: "none" }}
                  />
                </div>
              )}
            </div>

            {/* Bottom section: capabilities + generate button */}
            <div className="flex items-center justify-between py-4 flex-shrink-0 gap-4">
              {/* Capabilities */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: "Multi-task", icon: <Layers className="w-3 h-3" /> },
                  { label: "Agentic", icon: <Zap className="w-3 h-3" /> },
                  { label: "Code", icon: <Code2 className="w-3 h-3" /> },
                  { label: "Math", icon: <Calculator className="w-3 h-3" /> },
                  { label: "Files", icon: <Upload className="w-3 h-3" /> },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-[10px] text-gray-400 font-medium border border-gray-100">
                    {f.icon}
                    <span className="hidden sm:inline">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !assignment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8 text-sm font-medium shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:shadow-none"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Complete Assignment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ RESULT VIEW ═══════════════════ */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col bg-white transition-all duration-500 ease-out",
          viewMode === "result"
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-8 pointer-events-none"
        )}
      >
        {result && (
          <>
            {/* Result Header */}
            <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 lg:px-6 py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={goBackToInput}
                    className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{result.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        {result.completedTasks}/{result.totalTasks} tasks completed
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${(result.completedTasks / result.totalTasks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allContent = result.tasks
                        .map((t) => `## ${t.title}\n\n${t.result?.content || ""}`)
                        .join("\n\n---\n\n");
                      navigator.clipboard.writeText(allContent);
                      toast({ title: "Copied!", description: "All results copied to clipboard" });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs text-gray-600 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy All
                  </button>
                </div>
              </div>
            </div>

            {/* Task List + Content */}
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Task sidebar */}
              <div className="w-full sm:w-[220px] flex-shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 bg-white overflow-y-auto max-h-[28vh] sm:max-h-none">
                <div className="p-3">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">
                    Tasks
                  </div>
                  <div className="space-y-1">
                    {result.tasks.map((task, idx) => {
                      const isActive = expandedTask === task.id;
                      const isCompleted = task.result?.status === "completed";
                      return (
                        <button
                          key={task.id}
                          onClick={() => setExpandedTask(task.id)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start gap-2.5",
                            isActive
                              ? "bg-blue-50 border border-blue-100 shadow-sm"
                              : "hover:bg-gray-50 border border-transparent"
                          )}
                          style={{ animationDelay: `${idx * 60}ms` }}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border",
                            TASK_COLORS[task.type] || TASK_COLORS.other
                          )}>
                            {TASK_ICONS[task.type] || TASK_ICONS.other}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={cn(
                              "text-xs font-medium truncate",
                              isActive ? "text-blue-700" : "text-gray-700"
                            )}>
                              {task.title}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-gray-400 capitalize">{task.type}</span>
                              {isCompleted ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                          </div>
                          <ChevronRight className={cn(
                            "w-3 h-3 flex-shrink-0 mt-1.5 transition-transform",
                            isActive ? "text-blue-500 rotate-90" : "text-gray-300"
                          )} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="p-3 border-t border-gray-50">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-base lg:text-lg font-bold text-blue-600">{result.totalTasks}</div>
                      <div className="text-[10px] text-gray-400">Tasks</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-base lg:text-lg font-bold text-green-600">{result.completedTasks}</div>
                      <div className="text-[10px] text-gray-400">Done</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task content area */}
              <div className="flex-1 overflow-y-auto bg-gray-50/30">
                {expandedTask !== null ? (
                  (() => {
                    const task = result.tasks.find((t) => t.id === expandedTask);
                    if (!task || !task.result) return null;
                    return (
                      <div className="p-4 lg:p-8 animate-in fade-in duration-300">
                        {/* Task header card */}
                        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border",
                              TASK_COLORS[task.type] || TASK_COLORS.other
                            )}>
                              {TASK_ICONS[task.type] || TASK_ICONS.other}
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">{task.title}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded capitalize",
                                  TASK_COLORS[task.type] || TASK_COLORS.other
                                )}>
                                  {task.type}
                                </span>
                                <span className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                  task.priority === "high" ? "bg-red-50 text-red-600" :
                                  task.priority === "medium" ? "bg-amber-50 text-amber-600" :
                                  "bg-gray-50 text-gray-500"
                                )}>
                                  {task.priority} priority
                                </span>
                                {task.result.status === "completed" ? (
                                  <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                                    <CheckCircle2 className="w-3 h-3" /> Completed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-[10px] text-red-500">
                                    <XCircle className="w-3 h-3" /> Error
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => copyTaskContent(task.id, task.result?.content || "")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-white text-xs text-gray-500 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            {copiedTaskId === task.id ? "Copied!" : "Copy"}
                          </button>
                        </div>

                        {/* Task description */}
                        {task.description && (
                          <div className="mb-5 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">Task Description</div>
                            <div className="text-xs text-gray-500">{task.description}</div>
                          </div>
                        )}

                        {/* Result content */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-7 shadow-sm">
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={markdownComponents}
                            >
                              {task.result.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <div className="text-center">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Select a task to view results</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
