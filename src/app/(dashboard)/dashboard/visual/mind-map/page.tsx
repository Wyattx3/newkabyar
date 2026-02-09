"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Network, 
  Loader2, 
  Sparkles,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Wand2,
  Upload,
  FileText,
  X,
  Type,
  RotateCcw,
  Palette,
  Image,
  Code2,
  Hand,
  MessageCircle,
  Send,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import { cn } from "@/lib/utils";

// Extended color themes for mindmap - all use white text for better visibility
const THEMES = [
  { id: "default", name: "Blue", colors: ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#1E40AF"] },
  { id: "ocean", name: "Ocean", colors: ["#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#0369A1"] },
  { id: "forest", name: "Forest", colors: ["#22C55E", "#4ADE80", "#86EFAC", "#BBF7D0", "#15803D"] },
  { id: "sunset", name: "Sunset", colors: ["#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#C2410C"] },
  { id: "purple", name: "Purple", colors: ["#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#6D28D9"] },
  { id: "rose", name: "Rose", colors: ["#F43F5E", "#FB7185", "#FDA4AF", "#FECDD3", "#BE123C"] },
  { id: "teal", name: "Teal", colors: ["#14B8A6", "#2DD4BF", "#5EEAD4", "#99F6E4", "#0F766E"] },
  { id: "amber", name: "Amber", colors: ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A", "#B45309"] },
  { id: "mono", name: "Mono", colors: ["#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#1F2937"] },
  { id: "dark", name: "Dark", colors: ["#1F2937", "#374151", "#4B5563", "#6B7280", "#111827"] },
];

export default function MindMapPage() {
  // Input states
  const [inputMode, setInputMode] = useState<"topic" | "content">("topic");
  const [topic, setTopic] = usePersistedState("mindmap-topic", "");
  const [content, setContent] = usePersistedState("mindmap-content", "");
  const [depth, setDepth] = usePersistedState("mindmap-depth", "medium");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("mindmap-model", "fast");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [mermaidCode, setMermaidCode] = useState("");
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Canvas states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false); // Track if actually moved
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [showThemes, setShowThemes] = useState(false);
  
  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [selectedNode, setSelectedNode] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("mind-map");

  useEffect(() => setMounted(true), []);

  // Track if we need to auto-fit (only on new diagram, not theme change)
  const lastCodeRef = useRef<string>("");

  // Render mermaid when code or theme changes
  useEffect(() => {
    if (!mermaidCode) {
      setSvg("");
      return;
    }

    const isNewDiagram = lastCodeRef.current !== mermaidCode;
    lastCodeRef.current = mermaidCode;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        
        const theme = THEMES.find(t => t.id === selectedTheme) || THEMES[0];
        
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          fontFamily: "Inter, system-ui, sans-serif",
          mindmap: {
            padding: 30,
            useMaxWidth: false,
          },
          themeVariables: {
            primaryColor: theme.colors[0],
            primaryTextColor: "#FFFFFF",
            primaryBorderColor: theme.colors[4],
            lineColor: theme.colors[1],
            secondaryColor: theme.colors[1],
            tertiaryColor: theme.colors[2],
            fontSize: "16px",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        });

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${Date.now()}`,
          mermaidCode
        );
        
        // Enhance SVG for better text visibility
        let enhancedSvg = renderedSvg;
        
        // Add custom CSS styles directly into SVG
        const customStyles = `
          <style>
            .mindmap-node text, .mindmap-node tspan, .node text, .node tspan, 
            .nodeLabel, .label text, text.nodeLabel, foreignObject span, foreignObject p {
              fill: #1a1a1a !important;
              color: #1a1a1a !important;
              font-weight: 700 !important;
              font-size: 14px !important;
              text-shadow: 
                0 0 3px #fff,
                0 0 3px #fff,
                0 0 3px #fff,
                0 0 3px #fff,
                1px 1px 0 #fff,
                -1px -1px 0 #fff,
                1px -1px 0 #fff,
                -1px 1px 0 #fff !important;
            }
            .section-root text, .section--1 text {
              fill: #ffffff !important;
              text-shadow: 
                1px 1px 2px rgba(0,0,0,0.9),
                -1px -1px 2px rgba(0,0,0,0.9),
                1px -1px 2px rgba(0,0,0,0.9),
                -1px 1px 2px rgba(0,0,0,0.9) !important;
            }
          </style>
        `;
        
        // Insert styles after the opening SVG tag
        enhancedSvg = enhancedSvg.replace(/<svg([^>]*)>/, `<svg$1>${customStyles}`);
        
        setSvg(enhancedSvg);
        
        // Only auto-fit zoom when it's a NEW diagram (not theme change)
        if (isNewDiagram) {
          setTimeout(() => {
            setZoom(1); // Reset to 100% for new diagrams
            setPan({ x: 0, y: 0 });
          }, 50);
        }
      } catch (err) {
        console.error("Mermaid render error:", err);
        toast({ title: "Failed to render diagram", variant: "destructive" });
      }
    };

    renderDiagram();
  }, [mermaidCode, selectedTheme]);

  // Use ref to track hasDragged to avoid stale closure
  const hasDraggedRef = useRef(false);
  useEffect(() => { hasDraggedRef.current = hasDragged; }, [hasDragged]);

  // Handle node click for chat
  const handleNodeClick = (e: React.MouseEvent) => {
    // Don't trigger if we dragged
    if (hasDraggedRef.current) return;
    
    const target = e.target as Element;
    
    // Find the node group or text element
    const nodeGroup = target.closest(".node, .mindmap-node, g[class*='section']");
    const textEl = target.closest("text, foreignObject, .nodeLabel, span, p");
    
    let nodeText = "";
    
    if (textEl) {
      nodeText = textEl.textContent?.trim() || "";
    } else if (nodeGroup) {
      const textInGroup = nodeGroup.querySelector("text, foreignObject, .nodeLabel, span");
      nodeText = textInGroup?.textContent?.trim() || "";
    }
    
    if (nodeText && nodeText.length > 0 && nodeText.length < 200) {
      e.stopPropagation();
      setSelectedNode(nodeText);
      setChatHistory([]);
      setShowChat(true);
    }
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(3, Math.max(0.25, z + delta)));
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setHasDragged(true);
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    // If didn't drag, treat as click for chat
    if (!hasDraggedRef.current) {
      handleNodeClick(e);
    }
  }, []);

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // File upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".txt")) {
      toast({ title: "Only PDF and TXT files are supported", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/utils/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process file");
      }

      const data = await response.json();
      if (!data.text || data.text.length < 50) {
        throw new Error("Could not extract enough text from file");
      }
      
      setContent(data.text);
      setUploadedFile(file.name);
      setInputMode("content");
      toast({ title: "File uploaded", description: `${data.characterCount?.toLocaleString() || data.text.length} chars extracted` });
    } catch (error: any) {
      console.error(error);
      toast({ title: error.message || "Failed to process file", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setContent("");
  };

  // Generate mindmap - NO flash by keeping old content until new is ready
  const handleGenerate = async () => {
    if (inputMode === "topic" && topic.trim().length < 3) {
      toast({ title: "Enter a topic", variant: "destructive" });
      return;
    }
    if (inputMode === "content" && content.trim().length < 50) {
      toast({ title: "Content must be at least 50 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    // Don't clear mermaidCode/svg here - keep showing old content

    try {
      const response = await fetch("/api/tools/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: inputMode === "topic" ? topic : undefined,
          content: inputMode === "content" ? content : undefined,
          depth,
          style: "hierarchical",
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
      const newCode = data.mermaidCode || "";
      
      if (newCode) {
        setMermaidCode(newCode);
        setPan({ x: 0, y: 0 });
        saveProject({
          inputData: { inputMode, topic, content, depth },
          outputData: { mermaidCode: newCode },
          settings: { model: selectedModel, language: aiLanguage },
          inputPreview: (inputMode === "topic" ? topic : content).slice(0, 200),
        });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  // Copy code
  const copyCode = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export SVG
  const exportSVG = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindmap-${topic || "diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "SVG exported" });
  };

  // Export PNG - Using data URL to avoid CORS/tainted canvas issues
  const exportPNG = async () => {
    if (!svg || !svgContainerRef.current) return;
    
    try {
      // Get the SVG element
      const svgElement = svgContainerRef.current.querySelector("svg");
      if (!svgElement) {
        toast({ title: "No diagram to export", variant: "destructive" });
        return;
      }

      // Clone SVG and set explicit dimensions
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      const bbox = svgElement.getBBox();
      const padding = 60;
      const width = bbox.width + padding * 2;
      const height = bbox.height + padding * 2;
      
      clonedSvg.setAttribute("width", String(width));
      clonedSvg.setAttribute("height", String(height));
      clonedSvg.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
      clonedSvg.style.backgroundColor = "white";
      
      // Serialize SVG and convert to data URL (avoids CORS issues)
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const encodedSvg = encodeURIComponent(svgString);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

      // Create canvas and draw
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast({ title: "Canvas not supported", variant: "destructive" });
        return;
      }

      const img = new window.Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const scale = 2; // 2x for better quality
          canvas.width = width * scale;
          canvas.height = height * scale;
          ctx.scale(scale, scale);
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Download using data URL
          const pngDataUrl = canvas.toDataURL("image/png");
          const a = document.createElement("a");
          a.href = pngDataUrl;
          a.download = `mindmap-${topic || "diagram"}.png`;
          a.click();
          toast({ title: "PNG exported" });
          resolve();
        };
        img.onerror = () => {
          reject(new Error("Failed to load SVG"));
        };
        img.src = dataUrl;
      });
    } catch (err) {
      console.error("PNG export failed:", err);
      toast({ title: "Export failed. Try exporting SVG instead.", variant: "destructive" });
    }
  };

  // Chat with node
  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || !selectedNode) return;
    
    const userMessage = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      // Build context-aware messages for the API
      const contextMessage = `Context: The user is exploring a mind map about "${topic}". They clicked on the node "${selectedNode}" and want to learn more about it.\n\nQuestion: ${userMessage}`;
      
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory.length > 0 
            ? [...chatHistory.filter(m => m.role !== "system"), { role: "user", content: userMessage }]
            : [{ role: "user", content: contextMessage }],
          feature: "answer", // Required field for the API
          model: "fast",
          language: aiLanguage || "en",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let assistantMessage = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMessage += decoder.decode(value, { stream: true });
        setChatHistory(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "assistant") {
            updated[updated.length - 1].content = assistantMessage;
          } else {
            updated.push({ role: "assistant", content: assistantMessage });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setChatHistory(prev => [...prev, { 
        role: "assistant", 
        content: errorMessage.includes("credits") 
          ? "You've run out of credits. Please upgrade your plan or wait for daily reset."
          : "Sorry, I couldn't process your question. Please try again." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const quickTopics = [
    "Machine Learning",
    "Climate Change",
    "Web Development",
    "Quantum Physics",
    "World History",
  ];

  const hasResult = mermaidCode && svg;

  return (
    <div className={cn(
      "h-full flex flex-col transition-all duration-300",
      mounted ? "opacity-100" : "opacity-0",
      isFullscreen && "fixed inset-0 z-50 bg-white"
    )}>
      {/* Header - Hide when mindmap is shown */}
      {!hasResult && (
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Network className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Mind Map</h1>
              <p className="text-xs text-gray-500">Visualize any concept</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setInputMode("topic")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                inputMode === "topic" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Type className="w-3.5 h-3.5" />
              Topic
            </button>
            <button
              onClick={() => setInputMode("content")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                inputMode === "content" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Document
            </button>
          </div>

          {/* Input */}
          <div className="flex-1 max-w-xl">
            {inputMode === "topic" ? (
              <Input
                placeholder="Enter a topic to visualize..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="h-10 bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-blue-500"
              />
            ) : uploadedFile ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700 truncate flex-1">{uploadedFile}</span>
                <button onClick={clearFile} className="p-1 hover:bg-blue-100 rounded">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-10 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Upload PDF or TXT</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* Depth */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["shallow", "medium", "deep"].map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-all capitalize",
                  depth === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Model */}
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />

          {/* Generate */}
          <Button
            onClick={handleGenerate}
            disabled={isLoading || (inputMode === "topic" ? topic.trim().length < 3 : content.trim().length < 50)}
            className="h-10 px-5 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>

          {/* Credits */}
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
            <Sparkles className="w-3 h-3" />4
          </div>
        </div>

        {/* Quick Topics */}
        {inputMode === "topic" && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">Try:</span>
            {quickTopics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-full transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Content Textarea for Document mode */}
        {inputMode === "content" && !uploadedFile && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Textarea
              placeholder="Or paste your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none bg-gray-50 border-gray-200 rounded-lg focus:bg-white"
            />
          </div>
        )}
      </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        {hasResult ? (
          <>
            {/* Floating Input Bar - Top Center */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-lg border border-gray-100">
              <Network className="w-4 h-4 text-blue-600 shrink-0" />
              <Input
                placeholder="Enter a new topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="w-56 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 px-0"
              />
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {["shallow", "medium", "deep"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={cn(
                      "px-2 py-1 text-[10px] font-medium rounded-md transition-all capitalize",
                      depth === d ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isLoading || topic.trim().length < 3}
                size="sm"
                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Floating Toolbar - Right */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                  className="p-2 hover:bg-gray-50 transition-colors"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600" />
                </button>
                <span className="px-2 text-xs font-medium text-gray-600 min-w-[50px] text-center border-x border-gray-100">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="p-2 hover:bg-gray-50 transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Reset View */}
              <button
                onClick={resetView}
                className="p-2 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                title="Reset view"
              >
                <RotateCcw className="w-4 h-4 text-gray-600" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-600" /> : <Maximize2 className="w-4 h-4 text-gray-600" />}
              </button>
            </div>

            {/* Floating Toolbar - Bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1.5 bg-white rounded-xl shadow-lg border border-gray-100">
              {/* Theme Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowThemes(!showThemes)}
                  className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Change theme"
                >
                  <Palette className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">Theme</span>
                </button>
                {showThemes && (
                  <div className="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-xl shadow-xl border border-gray-200 min-w-[200px]">
                    <p className="text-xs text-gray-500 mb-2">Select Theme</p>
                    <div className="grid grid-cols-5 gap-3">
                      {THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => { setSelectedTheme(theme.id); setShowThemes(false); }}
                          className={cn(
                            "w-7 h-7 rounded-md transition-all hover:scale-110 border border-white/50",
                            selectedTheme === theme.id && "ring-2 ring-blue-500 ring-offset-1"
                          )}
                          style={{ backgroundColor: theme.colors[0] }}
                          title={theme.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-px h-6 bg-gray-200" />
              
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Code2 className="w-4 h-4 text-gray-600" />}
                <span className="text-xs font-medium text-gray-700">{copied ? "Copied" : "Code"}</span>
              </button>
              
              <div className="w-px h-6 bg-gray-200" />
              
              <button
                onClick={exportSVG}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">SVG</span>
              </button>
              
              <button
                onClick={exportPNG}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Image className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-700">PNG</span>
              </button>
            </div>

            {/* Drag Hint */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur rounded-lg text-xs text-gray-500">
              <Hand className="w-3.5 h-3.5" />
              Drag to pan • Scroll to zoom • Click node to chat
            </div>

            {/* Interactive Canvas */}
            <div
              ref={canvasRef}
              className="w-full h-full bg-white cursor-grab active:cursor-grabbing"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Grid Pattern */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle, #CBD5E1 1px, transparent 1px)`,
                  backgroundSize: "20px 20px",
                }}
              />

              {/* SVG Container */}
              <div
                ref={svgContainerRef}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.15s ease-out",
                }}
                onClick={handleNodeClick}
              >
                <div
                  className="mindmap-container"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </div>
            </div>

            {/* Chat Panel - Premium Design */}
            {showChat && (
              <div className="fixed top-20 right-6 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-right-5 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white truncate block max-w-[200px]">{selectedNode}</span>
                      <span className="text-[10px] text-blue-100">Click to learn more</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowChat(false)} 
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                
                {/* Chat Messages */}
                <div className="h-72 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Ask me anything!</p>
                      <p className="text-xs text-gray-400">
                        Learn more about &quot;{selectedNode}&quot;
                      </p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "user" 
                          ? "bg-blue-600 text-white rounded-br-md" 
                          : "bg-white text-gray-700 border border-gray-100 rounded-bl-md shadow-sm"
                      )}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type your question..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSubmit()}
                        className="h-10 pl-4 pr-4 text-sm bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                      />
                    </div>
                    <Button
                      onClick={handleChatSubmit}
                      disabled={!chatMessage.trim() || isChatLoading}
                      size="sm"
                      className="h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Press Enter to send</p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Simple Empty State */
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Network className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400 text-sm">Enter a topic above and click Generate</p>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-gray-900 font-medium">Generating mind map...</p>
              <p className="text-sm text-gray-500 mt-1">Analyzing "{topic || "content"}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen escape hint */}
      {isFullscreen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black/80 text-white text-xs rounded-full">
          Press Esc or click minimize to exit
        </div>
      )}
    </div>
  );
}
