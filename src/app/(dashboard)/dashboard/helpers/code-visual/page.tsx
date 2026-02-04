"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import mermaid from "mermaid";
import {
  GitBranch, Loader2, Code2, Sparkles, Copy, Check, Download, ZoomIn,
  ZoomOut, Maximize2, RotateCcw, FileText, Trash2, Play, X, History,
  MessageSquare, Send, Settings, Layers, ArrowRight, RefreshCw, Eye
} from "lucide-react";

interface VisualizationHistory {
  id: string;
  codePreview: string;
  language: string;
  timestamp: number;
  diagram: string;
}

const LANGUAGES = [
  { value: "auto", label: "Auto-Detect" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
];

const DIAGRAM_TYPES = [
  { value: "flowchart", label: "Flowchart" },
  { value: "sequence", label: "Sequence" },
  { value: "class", label: "Class Diagram" },
  { value: "state", label: "State Diagram" },
];

export default function CodeVisualizerPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [code, setCode] = usePersistedState("codevisual-code", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("codevisual-model", "fast");
  const [language, setLanguage] = usePersistedState("codevisual-lang", "auto");
  const [diagramType, setDiagramType] = usePersistedState("codevisual-diagram", "flowchart");
  
  // Result states
  const [mermaidCode, setMermaidCode] = useState("");
  const [svg, setSvg] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Canvas states
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Feature states
  const [history, setHistory] = usePersistedState<VisualizationHistory[]>("codevisual-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => {
    setMounted(true);
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      themeVariables: {
        primaryColor: "#EBF5FF",
        primaryTextColor: "#1a1a1a",
        primaryBorderColor: "#3B82F6",
        lineColor: "#64748b",
        secondaryColor: "#F8FAFC",
        tertiaryColor: "#F1F5F9",
      },
    });
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const lineCount = code.split("\n").length;
  const hasResult = !!svg;

  const sanitizeMermaid = (code: string): string => {
    let fixed = code
      .replace(/```mermaid\s*/gi, "")
      .replace(/```\s*/g, "")
      .replace(/^---[\s\S]*?---\s*\n?/m, "")
      .replace(/%%.*$/gm, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .trim();
    return fixed;
  };

  const renderDiagram = useCallback(async (mCode: string) => {
    if (!mCode) return;
    try {
      const sanitized = sanitizeMermaid(mCode);
      const id = `mermaid-${Date.now()}`;
      const { svg: renderedSvg } = await mermaid.render(id, sanitized);
      
      let styledSvg = renderedSvg.replace(
        /<svg/,
        `<svg style="max-width:100%;height:auto;"`
      );
      styledSvg = styledSvg.replace(
        "</svg>",
        `<style>
          .node text, .nodeLabel, text { fill: #1a1a1a !important; font-family: system-ui, sans-serif !important; }
          .edgeLabel text { fill: #374151 !important; }
          .label { color: #1a1a1a !important; }
          rect, .node rect { stroke: #3B82F6 !important; }
        </style></svg>`
      );
      setSvg(styledSvg);
    } catch (e) {
      console.error("Mermaid render error:", e);
      toast({ title: "Diagram rendering error", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (mermaidCode) renderDiagram(mermaidCode);
  }, [mermaidCode, renderDiagram]);

  const handleVisualize = async () => {
    if (!code.trim()) {
      toast({ title: "Please enter code", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSvg("");
    setMermaidCode("");
    setExplanation("");

    try {
      const response = await fetch("/api/tools/code-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language: language === "auto" ? undefined : language,
          diagramType,
          model: selectedModel,
          uiLanguage: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json();
          toast({
            title: "Insufficient Credits",
            description: `Need ${data.creditsNeeded} credits, have ${data.creditsRemaining}`,
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed");
      }

      const data = await response.json();
      setMermaidCode(data.mermaidCode || "");
      setExplanation(data.explanation || "");

      // Save to history
      const historyItem: VisualizationHistory = {
        id: Date.now().toString(),
        codePreview: code.substring(0, 80) + "...",
        language: language === "auto" ? "auto" : language,
        timestamp: Date.now(),
        diagram: data.mermaidCode || "",
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Visualization failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new Event("credits-updated"));
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
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
            { role: "system", content: `You are a code analysis expert. Help explain the code logic and answer questions about the visualization. Code:\n${code.substring(0, 500)}` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
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
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't process your request." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCode(e.target?.result as string);
      setSvg("");
      setMermaidCode("");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportPNG = async () => {
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx!.fillStyle = "white";
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `code_flowchart_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  };

  const copyDiagram = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newScale = scale * (e.deltaY > 0 ? 0.9 : 1.1);
    setScale(Math.min(Math.max(0.2, newScale), 4));
  };

  const reset = () => {
    setCode("");
    setSvg("");
    setMermaidCode("");
    setExplanation("");
    setChatMessages([]);
  };

  if (!mounted) return null;

  return (
    <div className={cn("h-full flex flex-col bg-gray-50/50", isFullscreen && "fixed inset-0 z-50")}>
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Code Logic Visualizer</h1>
            <p className="text-xs text-gray-500">Transform code into visual diagrams</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className={cn("h-8 rounded-lg", showSettings && "bg-blue-50 text-blue-600")}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className={cn("h-8 rounded-lg", showHistory && "bg-blue-50 text-blue-600")}>
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)} className={cn("h-8 rounded-lg", showChat && "bg-blue-50 text-blue-600")}>
            <MessageSquare className="w-4 h-4" />
          </Button>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 5 credits
          </span>
        </div>
      </div>

      {/* Settings Bar */}
      {showSettings && (
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Language:</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Diagram:</span>
            <select value={diagramType} onChange={(e) => setDiagramType(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1">
              {DIAGRAM_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Model:</span>
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Code Input */}
        <div className="w-[45%] flex flex-col border-r border-gray-100">
          <div className="p-3 bg-white border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Code Input</span>
              <span className="text-xs text-gray-400">{lineCount} lines</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-2 rounded-lg">
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <input ref={fileInputRef} type="file" accept=".js,.ts,.py,.java,.cs,.cpp,.go,.rs,.php,.txt" onChange={handleFileUpload} className="hidden" />
              {code && (
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 rounded-lg text-gray-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 p-4 bg-gray-900">
            <Textarea
              value={code}
              onChange={(e) => { setCode(e.target.value); setSvg(""); setMermaidCode(""); }}
              placeholder="// Paste your code here...

function example() {
  if (condition) {
    doSomething();
  } else {
    doOther();
  }
}"
              className="h-full resize-none border-0 shadow-none focus-visible:ring-0 font-mono text-sm bg-transparent text-green-400"
            />
          </div>
          <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-8 rounded-lg">
              <Settings className="w-4 h-4 mr-1" /> Settings
            </Button>
            <Button onClick={handleVisualize} disabled={isLoading || !code.trim()} className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-2" /> Visualize</>}
            </Button>
          </div>
        </div>

        {/* Right - Diagram */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Visualization</span>
            </div>
            {svg && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="h-7 w-7 p-0 rounded-lg">
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
                <Button variant="ghost" size="sm" onClick={() => setScale(s => Math.min(4, s + 0.1))} className="h-7 w-7 p-0 rounded-lg">
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <Button variant="ghost" size="sm" onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} className="h-7 w-7 p-0 rounded-lg">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="h-7 w-7 p-0 rounded-lg">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <Button variant="ghost" size="sm" onClick={copyDiagram} className="h-7 px-2 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportPNG} className="h-7 px-2 rounded-lg">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowExplanation(!showExplanation)} className={cn("h-7 px-2 rounded-lg", showExplanation && "bg-blue-50 text-blue-600")}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div
              ref={containerRef}
              className="flex-1 overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
            >
              {svg ? (
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                  }}
                  className="w-full h-full flex items-center justify-center p-8"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  {isLoading ? (
                    <div className="text-center">
                      <GitBranch className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-600 font-medium">Analyzing code...</p>
                      <p className="text-xs text-gray-400 mt-1">Creating {diagramType} diagram</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <GitBranch className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-400">Paste code and click Visualize</p>
                      <p className="text-xs text-gray-300 mt-1">Supports multiple languages</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Explanation Panel */}
            {showExplanation && explanation && (
              <div className="w-72 border-l border-gray-100 flex flex-col">
                <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Code Explanation</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="w-64 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">History</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No history yet</p>
              ) : (
                history.map(h => (
                  <button
                    key={h.id}
                    onClick={() => { setMermaidCode(h.diagram); }}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-600 font-medium">{h.language}</span>
                      <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 font-mono">{h.codePreview}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">Code Assistant</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Code2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Ask about the code logic</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("max-w-[90%] p-3 rounded-2xl text-sm", msg.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-700")}>
                  {msg.content}
                </div>
              ))}
              {isChatLoading && <div className="bg-gray-100 p-3 rounded-2xl w-fit"><Loader2 className="w-4 h-4 animate-spin" /></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="What does this function do?"
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleChatSubmit} size="sm" className="rounded-xl px-3 bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
