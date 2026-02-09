"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Clock, 
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
  X,
  RotateCcw,
  Palette,
  Image,
  Code2,
  MessageCircle,
  Send,
  Calendar,
  History,
  Printer,
  Focus,
  Lightbulb,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import { cn } from "@/lib/utils";

// Color themes for timeline
const THEMES = [
  { id: "ocean", name: "Ocean", colors: ["#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#E0F2FE"], textColor: "#0C4A6E" },
  { id: "forest", name: "Forest", colors: ["#22C55E", "#4ADE80", "#86EFAC", "#BBF7D0", "#DCFCE7"], textColor: "#14532D" },
  { id: "sunset", name: "Sunset", colors: ["#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#FFEDD5"], textColor: "#7C2D12" },
  { id: "lavender", name: "Lavender", colors: ["#A855F7", "#C084FC", "#D8B4FE", "#E9D5FF", "#F3E8FF"], textColor: "#581C87" },
  { id: "rose", name: "Rose", colors: ["#F43F5E", "#FB7185", "#FDA4AF", "#FECDD3", "#FFE4E6"], textColor: "#881337" },
  { id: "slate", name: "Slate", colors: ["#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"], textColor: "#1E293B" },
  { id: "amber", name: "Amber", colors: ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A", "#FEF3C7"], textColor: "#78350F" },
  { id: "teal", name: "Teal", colors: ["#14B8A6", "#2DD4BF", "#5EEAD4", "#99F6E4", "#CCFBF1"], textColor: "#134E4A" },
  { id: "indigo", name: "Indigo", colors: ["#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF"], textColor: "#312E81" },
  { id: "neutral", name: "Neutral", colors: ["#525252", "#737373", "#A3A3A3", "#D4D4D4", "#E5E5E5"], textColor: "#171717" },
];

const suggestedTopics = [
  "World War II",
  "Industrial Revolution", 
  "Internet History",
  "Space Exploration",
  "Renaissance Period",
  "Ancient Rome",
  "American Civil War",
  "French Revolution",
];

const EVENT_COUNTS = [5, 8, 10, 12, 15];

export default function TimelinePage() {
  const [topic, setTopic] = usePersistedState("timeline-topic", "");
  const [eventCount, setEventCount] = usePersistedState("timeline-count", 8);
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("timeline-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const [svg, setSvg] = useState("");
  const [mounted, setMounted] = useState(false);
  
  // UI states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("ocean");
  const [showThemes, setShowThemes] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // New feature states
  const [showQuickFacts, setShowQuickFacts] = useState(false);
  const [quickFacts, setQuickFacts] = useState<string[]>([]);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false);
  const lastCodeRef = useRef<string>("");

  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("timeline");

  useEffect(() => setMounted(true), []);
  useEffect(() => { hasDraggedRef.current = hasDragged; }, [hasDragged]);

  const hasResult = svg.length > 0;

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
          themeVariables: {
            primaryColor: theme.colors[0],
            primaryTextColor: "#000000",
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
        
        // Inject strong custom styles for maximum text visibility
        const customStyles = `
          <style>
            /* Timeline specific text styles - MAXIMUM VISIBILITY */
            .timeline text, .section text, text.taskText, text.taskTextOutsideRight, 
            text.taskTextOutsideLeft, .labelText, .titleText, .sectionTitle,
            .period-text, .event-text, text, tspan {
              fill: #111827 !important;
              color: #111827 !important;
              font-weight: 700 !important;
              font-size: 15px !important;
              font-family: Inter, system-ui, sans-serif !important;
              paint-order: stroke fill !important;
              stroke: white !important;
              stroke-width: 4px !important;
              stroke-linejoin: round !important;
            }
            
            /* ForeignObject content */
            foreignObject span, foreignObject p, foreignObject div {
              color: #111827 !important;
              font-weight: 700 !important;
              font-size: 15px !important;
              text-shadow: 
                -2px -2px 0 white, 2px -2px 0 white,
                -2px 2px 0 white, 2px 2px 0 white,
                0 -2px 0 white, 0 2px 0 white,
                -2px 0 0 white, 2px 0 0 white !important;
            }
            
            /* Section titles - even bolder */
            .sectionTitle, .titleText, text.titleText {
              font-size: 18px !important;
              font-weight: 800 !important;
            }
            
            /* Rounded sections */
            .section0, .section1, .section2, .section3, .section4, .section5,
            .section6, .section7, .section8, .section9 {
              rx: 12 !important;
              ry: 12 !important;
            }
            
            /* Event boxes */
            rect.task, rect.section {
              rx: 8 !important;
              ry: 8 !important;
            }
          </style>
        `;
        
        let enhancedSvg = renderedSvg.replace(/<svg([^>]*)>/, `<svg$1>${customStyles}`);
        setSvg(enhancedSvg);

        // Auto-fit on new diagram only
        if (isNewDiagram) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      } catch (error) {
        console.error("Mermaid render error:", error);
        toast({ title: "Failed to render timeline", variant: "destructive" });
      }
    };

    renderDiagram();
  }, [mermaidCode, selectedTheme, toast]);

  const handleGenerate = async () => {
    if (topic.trim().length < 3) {
      toast({ title: "Enter a topic (min 3 characters)", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    // Don't clear svg/mermaidCode here to prevent UI flash
    // They will be replaced when new data arrives
    setShowChat(false);
    setChatHistory([]);
    setQuickFacts([]);

    try {
      const response = await fetch("/api/tools/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          eventCount,
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
      setMermaidCode(data.mermaidCode || "");
      saveProject({
        inputData: { topic, eventCount },
        outputData: { mermaidCode: data.mermaidCode || "" },
        settings: { model: selectedModel, language: aiLanguage },
        inputPreview: topic.slice(0, 200),
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  // Zoom handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(0.25, prev + delta), 3));
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
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setIsDragging(false);
    
    // Handle click on timeline event
    if (!hasDraggedRef.current && svgContainerRef.current) {
      const target = e.target as HTMLElement;
      const textElement = target.closest("text") || target.closest("foreignObject");
      if (textElement) {
        const text = textElement.textContent?.trim();
        if (text && text.length > 2) {
          setSelectedEvent(text);
          setChatHistory([]);
          setShowChat(true);
        }
      }
    }
  }, []);

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fit to view
  const fitToView = () => {
    if (!svgContainerRef.current || !canvasRef.current) return;
    const svgEl = svgContainerRef.current.querySelector("svg");
    if (!svgEl) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();
    
    const scaleX = (canvasRect.width - 100) / svgRect.width;
    const scaleY = (canvasRect.height - 100) / svgRect.height;
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
    toast({ title: "Fitted to view" });
  };

  // Copy code
  const copyCode = async () => {
    await navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Mermaid code copied!" });
  };

  // Export SVG
  const exportSVG = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timeline-${topic.replace(/\s+/g, "-")}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "SVG downloaded!" });
  };

  // Export PNG
  const exportPNG = async () => {
    const svgElement = svgContainerRef.current?.querySelector("svg");
    if (!svgElement) return;

    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      const bbox = svgElement.getBBox();
      const padding = 60;
      const width = bbox.width + padding * 2;
      const height = bbox.height + padding * 2;
      
      clonedSvg.setAttribute("width", String(width));
      clonedSvg.setAttribute("height", String(height));
      clonedSvg.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
      clonedSvg.style.backgroundColor = "white";
      
      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const encodedSvg = encodeURIComponent(svgString);
      const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `timeline-${topic.replace(/\s+/g, "-")}.png`;
        a.click();
        toast({ title: "PNG downloaded!" });
      };
      img.src = dataUrl;
    } catch (error) {
      console.error("PNG export error:", error);
      toast({ title: "Failed to export PNG", variant: "destructive" });
    }
  };

  // Print timeline
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "Please allow popups to print", variant: "destructive" });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Timeline: ${topic}</title>
          <style>
            body { margin: 20px; font-family: Inter, system-ui, sans-serif; }
            h1 { font-size: 24px; color: #111; margin-bottom: 20px; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <h1>Timeline: ${topic}</h1>
          ${svg}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Get quick facts about the topic
  const getQuickFacts = async () => {
    if (!topic.trim()) return;
    
    setIsLoadingFacts(true);
    setShowQuickFacts(true);
    
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ 
            role: "user", 
            content: `Give me 5 interesting quick facts about "${topic}" in a numbered list. Keep each fact to 1-2 sentences. Just the facts, no intro.` 
          }],
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
        // Parse facts from the response
        const facts = content.split(/\d+\.\s+/).filter(f => f.trim().length > 10);
        setQuickFacts(facts.slice(0, 5));
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to get facts", variant: "destructive" });
    } finally {
      setIsLoadingFacts(false);
    }
  };

  // Chat with event
  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || !selectedEvent) return;
    
    const userMessage = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const contextMessage = `Context: The user is viewing a timeline about "${topic}". They clicked on "${selectedEvent}" and want to learn more.\n\nQuestion: ${userMessage}`;
      
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory.length > 0 
            ? [...chatHistory.filter(m => m.role !== "system"), { role: "user", content: userMessage }]
            : [{ role: "user", content: contextMessage }],
          feature: "answer",
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
          ? "You've run out of credits."
          : "Sorry, I couldn't process your question." 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!mounted) return null;

  return (
    <div className={cn(
      "h-full flex flex-col bg-gray-50 transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 bg-white"
    )}>
      {/* Header - Only show when no result */}
      {!hasResult && (
        <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Interactive Timeline</h1>
                <p className="text-gray-500 text-sm">Visualize historical events beautifully</p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />4 credits
            </span>
          </div>

          {/* Main Input */}
          <div className="relative mb-4">
            <History className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="Enter a historical topic (e.g., World War II, Renaissance)"
              className="h-14 pl-12 pr-40 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || topic.trim().length < 3}
                className="h-10 px-6 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-2" />Generate</>}
              </Button>
            </div>
          </div>

          {/* Event Count - Simple Buttons */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-600">Events:</span>
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              {EVENT_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => setEventCount(count)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                    eventCount === count 
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs text-gray-500">Try:</span>
            {suggestedTopics.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-full transition-all hover:scale-105"
              >
                {t}
              </button>
            ))}
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Model:</span>
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div 
        ref={canvasRef}
        className={cn(
          "flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative",
          hasResult ? "h-full" : "",
          isFullscreen && "rounded-none border-0"
        )}
        onWheel={hasResult ? handleWheel : undefined}
        onMouseDown={hasResult ? handleMouseDown : undefined}
        onMouseMove={hasResult ? handleMouseMove : undefined}
        onMouseUp={hasResult ? handleMouseUp : undefined}
        onMouseLeave={() => setIsDragging(false)}
        style={{ cursor: hasResult ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        {hasResult ? (
          <>
            {/* Floating Input Bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-2 flex items-center gap-2">
              <History className="w-4 h-4 text-gray-400 ml-2" />
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="Enter a topic..."
                className="w-56 h-9 border-0 bg-transparent focus:ring-0 text-sm"
              />
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                {[5, 8, 10, 12].map((count) => (
                  <button
                    key={count}
                    onClick={() => setEventCount(count)}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded-md transition-all",
                      eventCount === count ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                    )}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                size="sm"
                className="h-9 px-4 bg-blue-600 rounded-xl"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </Button>
            </div>

            {/* Left Toolbar */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-col gap-1">
              <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))} className="h-9 w-9 p-0" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <span className="text-[10px] text-gray-500 text-center py-1">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.25))} className="h-9 w-9 p-0" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <div className="h-px bg-gray-100 my-1" />
              <Button variant="ghost" size="sm" onClick={resetView} className="h-9 w-9 p-0" title="Reset View">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={fitToView} className="h-9 w-9 p-0" title="Fit to View">
                <Focus className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-9 w-9 p-0" title="Fullscreen">
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>

            {/* Right Toolbar */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-col gap-1">
              <Button variant="ghost" size="sm" onClick={copyCode} className="h-9 w-9 p-0" title="Copy Code">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Code2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={exportSVG} className="h-9 w-9 p-0" title="Export SVG">
                <FileText className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={exportPNG} className="h-9 w-9 p-0" title="Export PNG">
                <Image className="w-4 h-4" />
              </Button>
              <div className="h-px bg-gray-100 my-1" />
              <Button variant="ghost" size="sm" onClick={handlePrint} className="h-9 w-9 p-0" title="Print">
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={getQuickFacts} className="h-9 w-9 p-0" title="Quick Facts">
                <Lightbulb className="w-4 h-4" />
              </Button>
              <div className="h-px bg-gray-100 my-1" />
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => setShowThemes(!showThemes)} className="h-9 w-9 p-0" title="Themes">
                  <Palette className="w-4 h-4" />
                </Button>
                {showThemes && (
                  <div className="absolute right-full mr-2 top-0 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-30 w-44">
                    <p className="text-xs font-medium text-gray-700 mb-2">Themes</p>
                    <div className="grid grid-cols-5 gap-2">
                      {THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            setSelectedTheme(theme.id);
                            setShowThemes(false);
                          }}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                            selectedTheme === theme.id ? "border-gray-900 ring-2 ring-gray-200" : "border-transparent"
                          )}
                          style={{ backgroundColor: theme.colors[0] }}
                          title={theme.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs text-gray-500 border border-gray-100">
                Drag to pan • Scroll to zoom • Click event to learn more
              </span>
            </div>

            {/* Timeline Container */}
            <div 
              ref={svgContainerRef}
              className="absolute inset-0 flex items-center justify-center bg-white timeline-container"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />

            {/* Quick Facts Panel */}
            {showQuickFacts && (
              <div className="fixed top-20 right-6 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-right-5 duration-300">
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-400">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white">Quick Facts</span>
                      <span className="text-[10px] text-amber-100 block">{topic}</span>
                    </div>
                  </div>
                  <button onClick={() => setShowQuickFacts(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                
                <div className="p-4 max-h-80 overflow-y-auto space-y-3">
                  {isLoadingFacts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                    </div>
                  ) : quickFacts.length > 0 ? (
                    quickFacts.map((fact, i) => (
                      <div key={i} className="flex gap-3 p-3 bg-amber-50 rounded-xl">
                        <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed">{fact.trim()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 text-sm py-4">Loading facts...</p>
                  )}
                </div>
              </div>
            )}

            {/* Chat Panel */}
            {showChat && (
              <div className="fixed top-20 left-6 w-[360px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in slide-in-from-left-5 duration-300">
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white truncate block max-w-[200px]">{selectedEvent}</span>
                      <span className="text-[10px] text-blue-100">Learn about this event</span>
                    </div>
                  </div>
                  <button onClick={() => setShowChat(false)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
                
                <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Ask me anything!</p>
                      <p className="text-xs text-gray-400">Learn more about this event</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "user" ? "bg-blue-600 text-white rounded-br-md" : "bg-white text-gray-700 border border-gray-100 rounded-bl-md shadow-sm"
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
                
                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Ask about this event..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleChatSubmit()}
                      className="h-10 pl-4 pr-4 text-sm bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                    <Button
                      onClick={handleChatSubmit}
                      disabled={!chatMessage.trim() || isChatLoading}
                      size="sm"
                      className="h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700 rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            {isLoading ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <p className="text-gray-900 font-medium">Building timeline...</p>
                <p className="text-sm text-gray-500 mt-1">Researching &quot;{topic}&quot;</p>
              </div>
            ) : (
              <div className="text-center max-w-md">
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${i <= 3 ? "bg-blue-500" : "bg-gray-200"} transition-all`}
                    />
                  ))}
                </div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Create a Timeline</h2>
                <p className="text-gray-500">Enter any historical topic to generate an interactive timeline</p>
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && hasResult && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
              <p className="text-gray-900 font-medium">Generating timeline...</p>
              <p className="text-sm text-gray-500 mt-1">Analyzing &quot;{topic}&quot;</p>
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
