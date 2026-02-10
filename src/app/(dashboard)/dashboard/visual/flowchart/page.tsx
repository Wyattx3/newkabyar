"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  GitBranch, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  Wand2,
  ArrowDown,
  ArrowRight as ArrowRightIcon,
  ArrowUp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  RotateCcw,
  Palette,
  Image,
  Code2,
  MessageCircle,
  Send,
  Focus,
  Printer,
  FileText,
  ArrowLeft,
  Grid3X3,
  BarChart3,
  Layers,
  Link2,
  History,
  Zap,
  Upload,
  File,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import { cn } from "@/lib/utils";

// Direction options
const DIRECTIONS = [
  { value: "TD", label: "Top Down", icon: ArrowDown },
  { value: "LR", label: "Left Right", icon: ArrowRightIcon },
  { value: "BT", label: "Bottom Up", icon: ArrowUp },
  { value: "RL", label: "Right Left", icon: ArrowLeft },
];

// Color themes for flowchart
const THEMES = [
  { id: "blue", name: "Blue", colors: ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#DBEAFE"] },
  { id: "green", name: "Green", colors: ["#22C55E", "#4ADE80", "#86EFAC", "#BBF7D0", "#DCFCE7"] },
  { id: "purple", name: "Purple", colors: ["#A855F7", "#C084FC", "#D8B4FE", "#E9D5FF", "#F3E8FF"] },
  { id: "orange", name: "Orange", colors: ["#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#FFEDD5"] },
  { id: "rose", name: "Rose", colors: ["#F43F5E", "#FB7185", "#FDA4AF", "#FECDD3", "#FFE4E6"] },
  { id: "teal", name: "Teal", colors: ["#14B8A6", "#2DD4BF", "#5EEAD4", "#99F6E4", "#CCFBF1"] },
  { id: "indigo", name: "Indigo", colors: ["#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE", "#E0E7FF"] },
  { id: "amber", name: "Amber", colors: ["#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A", "#FEF3C7"] },
  { id: "cyan", name: "Cyan", colors: ["#06B6D4", "#22D3EE", "#67E8F9", "#A5F3FC", "#CFFAFE"] },
  { id: "slate", name: "Slate", colors: ["#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"] },
];

const EXAMPLES = [
  "User login process",
  "Order checkout flow",
  "Bug fix workflow",
  "Customer onboarding",
];

export default function FlowchartPage() {
  const [description, setDescription] = usePersistedState("flowchart-desc", "");
  const [direction, setDirection] = usePersistedState("flowchart-dir", "TD");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("flowchart-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // UI states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("blue");
  const [showThemes, setShowThemes] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // History states
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [selectedNode, setSelectedNode] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // AI Improve states
  const [isImproving, setIsImproving] = useState(false);
  const [showImproveInput, setShowImproveInput] = useState(false);
  const [improvePrompt, setImprovePrompt] = useState("");
  
  // File upload states
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false);
  const lastCodeRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("flowchart");

  useEffect(() => setMounted(true), []);
  useEffect(() => { hasDraggedRef.current = hasDragged; }, [hasDragged]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
      toast({ title: "Please upload a PDF, DOC, or text file", variant: "destructive" });
      return;
    }

    setIsParsingFile(true);

    try {
      if (file.type === "application/pdf") {
        // Parse PDF via API
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/utils/parse-pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to parse PDF");

        const data = await response.json();
        const extractedText = data.text || "";
        
        setUploadedFile({ name: file.name, content: extractedText });
        setDescription(extractedText.slice(0, 2000)); // Limit to first 2000 chars
        toast({ title: `Loaded: ${file.name}` });
      } else {
        // Read text files directly
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setUploadedFile({ name: file.name, content: text });
          setDescription(text.slice(0, 2000));
          toast({ title: `Loaded: ${file.name}` });
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error("File parsing error:", error);
      toast({ title: "Failed to read file", variant: "destructive" });
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Clear uploaded file
  const clearFile = () => {
    setUploadedFile(null);
    setDescription("");
  };

  const hasResult = svg.length > 0;

  // Count nodes and edges from mermaid code
  const getStats = useCallback(() => {
    if (!mermaidCode) return { nodes: 0, edges: 0, decisions: 0 };
    const nodeMatches = mermaidCode.match(/[A-Za-z0-9_]+\[|[A-Za-z0-9_]+\{|[A-Za-z0-9_]+\(/g) || [];
    const edgeMatches = mermaidCode.match(/-->/g) || [];
    const decisionMatches = mermaidCode.match(/\{[^}]+\}/g) || [];
    return { 
      nodes: nodeMatches.length, 
      edges: edgeMatches.length,
      decisions: decisionMatches.length 
    };
  }, [mermaidCode]);

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
          flowchart: {
            curve: "basis",
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50,
            useMaxWidth: false,
            htmlLabels: true,
          },
          themeVariables: {
            primaryColor: theme.colors[0],
            primaryTextColor: "#FFFFFF",
            primaryBorderColor: theme.colors[0],
            lineColor: theme.colors[1],
            secondaryColor: theme.colors[2],
            tertiaryColor: theme.colors[3],
            fontSize: "14px",
            fontFamily: "Inter, system-ui, sans-serif",
            edgeLabelBackground: "#ffffff",
          },
        });

        // Comprehensive mermaid code sanitization
        let fixedCode = mermaidCode
          // Remove markdown code blocks
          .replace(/```mermaid\s*/gi, '')
          .replace(/```\s*/g, '')
          // Remove YAML front-matter (---)
          .replace(/^---[\s\S]*?---\s*\n?/m, '')
          // Remove any standalone --- lines (not part of arrows)
          .replace(/^---+\s*$/gm, '')
          // Remove HTML comments
          .replace(/<!--[\s\S]*?-->/g, '')
          // Remove %% comments
          .replace(/%%.*$/gm, '')
          // Fix "chart" to "flowchart"
          .replace(/^chart\s+(TD|TB|BT|RL|LR)/im, 'flowchart $1')
          .replace(/^Chart\s+(TD|TB|BT|RL|LR)/im, 'flowchart $1')
          // Fix "graph" to "flowchart" 
          .replace(/^graph\s+(TD|TB|BT|RL|LR)/im, 'flowchart $1')
          .replace(/^Graph\s+(TD|TB|BT|RL|LR)/im, 'flowchart $1')
          // Ensure flowchart or graph prefix exists
          .replace(/^(TD|TB|BT|RL|LR)\s*\n/im, 'flowchart $1\n')
          // Remove empty lines at start
          .replace(/^\s*\n+/, '')
          .trim();

        // If no valid prefix, add default
        if (!/^(flowchart|graph)\s+(TD|TB|BT|RL|LR)/im.test(fixedCode)) {
          // Check if it looks like flowchart content (has arrows)
          if (/-->|-.->|==>/.test(fixedCode)) {
            fixedCode = `flowchart ${direction}\n${fixedCode}`;
          }
        }

        // Process line by line for better sanitization
        const lines = fixedCode.split('\n');
        const sanitizedLines = lines.map((line, index) => {
          // Keep first line (flowchart declaration) as is
          if (index === 0 && /^(flowchart|graph)\s+(TD|TB|BT|RL|LR)/i.test(line)) {
            return line;
          }
          
          // Skip empty lines
          if (!line.trim()) return '';
          
          // Sanitize edge labels: |text|
          let sanitizedLine = line.replace(/\|([^|]*)\|/g, (match, label) => {
            const sanitized = label
              .replace(/[()[\]{}%#&<>]/g, '')
              .replace(/[^\w\s,.!?:;'-]/g, '')
              .trim();
            if (!sanitized) return '';
            return `|${sanitized}|`;
          });
          
          // Fix double pipes that might remain
          sanitizedLine = sanitizedLine.replace(/\|\|/g, '');
          
          // Fix malformed arrows
          sanitizedLine = sanitizedLine
            .replace(/-->\s*\|?\s*$/g, '') // Remove trailing incomplete arrows
            .replace(/\s+-->\s+/g, ' --> ') // Normalize arrow spacing
            .replace(/\s+-\.->\s+/g, ' -.-> ') // Normalize dotted arrows
            .replace(/\s+==>\s+/g, ' ==> '); // Normalize thick arrows
          
          return sanitizedLine;
        });
        
        fixedCode = sanitizedLines.filter(line => line.trim()).join('\n');

        // Final validation - must have at least a declaration and one connection
        if (!fixedCode.includes('-->') && !fixedCode.includes('-.->') && !fixedCode.includes('==>')) {
          throw new Error('Invalid flowchart: No connections found');
        }

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${Date.now()}`,
          fixedCode
        );
        
        // Inject strong custom styles - WHITE text with BLACK border
        const customStyles = `
          <style>
            .node text, .nodeLabel, text.nodeLabel, .label text, 
            .cluster-label text, tspan {
              fill: #FFFFFF !important;
              color: #FFFFFF !important;
              font-weight: 700 !important;
              font-size: 14px !important;
              font-family: Inter, system-ui, sans-serif !important;
              paint-order: stroke fill !important;
              stroke: #1a1a1a !important;
              stroke-width: 3px !important;
              stroke-linejoin: round !important;
            }
            .edgeLabel text, .edgeLabel tspan {
              fill: #374151 !important;
              stroke: white !important;
              stroke-width: 2px !important;
            }
            foreignObject span, foreignObject p, foreignObject div {
              color: #FFFFFF !important;
              font-weight: 700 !important;
              font-size: 14px !important;
              text-shadow: 
                -1px -1px 0 #1a1a1a, 1px -1px 0 #1a1a1a, 
                -1px 1px 0 #1a1a1a, 1px 1px 0 #1a1a1a,
                0 -1px 0 #1a1a1a, 0 1px 0 #1a1a1a,
                -1px 0 0 #1a1a1a, 1px 0 0 #1a1a1a !important;
            }
            .node rect, .node circle, .node ellipse, .node polygon, .node path {
              rx: 12 !important;
              ry: 12 !important;
            }
            .edgeLabel { background-color: white !important; padding: 4px 8px !important; border-radius: 6px !important; }
            .marker { fill: ${theme.colors[1]} !important; }
            .flowchart-link { stroke-width: 2px !important; }
          </style>
        `;
        
        let enhancedSvg = renderedSvg.replace(/<svg([^>]*)>/, `<svg$1>${customStyles}`);
        setSvg(enhancedSvg);

        if (isNewDiagram) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      } catch (error) {
        console.error("Mermaid render error:", error);
        toast({ title: "Failed to render flowchart. Please try regenerating.", variant: "destructive" });
      }
    };

    renderDiagram();
  }, [mermaidCode, selectedTheme, toast]);

  // Add to history when new flowchart is generated
  useEffect(() => {
    if (mermaidCode && mermaidCode !== history[historyIndex]) {
      const newHistory = [...history.slice(0, historyIndex + 1), mermaidCode];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [mermaidCode]);

  const handleGenerate = async () => {
    if (description.trim().length < 5) {
      toast({ title: "Description too short", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setShowChat(false);
    setChatHistory([]);

    try {
      const response = await fetch("/api/tools/flowchart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          direction,
          style: "detailed",
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
        inputData: { description, direction },
        outputData: { mermaidCode: data.mermaidCode || "" },
        settings: { model: selectedModel, language: aiLanguage },
        inputPreview: description.slice(0, 200),
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  // AI Improve flowchart
  const handleAIImprove = async () => {
    if (!mermaidCode || !improvePrompt.trim()) return;
    
    setIsImproving(true);
    setShowImproveInput(false);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ 
            role: "user", 
            content: `Modify this Mermaid flowchart based on the user's request. Keep it valid Mermaid flowchart syntax. Only return the modified code, nothing else.

User's request: ${improvePrompt}

Current flowchart code:
${mermaidCode}` 
          }],
          feature: "answer",
          model: selectedModel,
          language: "en",
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
      
      // Extract mermaid code from response
      const codeMatch = content.match(/```(?:mermaid)?\s*([\s\S]*?)```/) || content.match(/(flowchart\s+(?:TD|LR|BT|RL|TB)[\s\S]*)/) || content.match(/(graph\s+(?:TD|LR|BT|RL)[\s\S]*)/);
      
      if (codeMatch) {
        const newCode = codeMatch[1].trim();
        setMermaidCode(newCode);
        toast({ title: "Flowchart improved!" });
      } else {
        // If no match, try using the content directly
        if (content.includes('-->') || content.includes('-.->')) {
          setMermaidCode(content.trim());
          toast({ title: "Flowchart improved!" });
        } else {
          toast({ title: "Could not extract valid flowchart code", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to improve", variant: "destructive" });
    } finally {
      setIsImproving(false);
      setImprovePrompt("");
    }
  };

  // History navigation
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMermaidCode(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMermaidCode(history[historyIndex + 1]);
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
    
    if (!hasDraggedRef.current && svgContainerRef.current) {
      const target = e.target as HTMLElement;
      const nodeElement = target.closest(".node") || target.closest("text") || target.closest("foreignObject");
      if (nodeElement) {
        const text = nodeElement.textContent?.trim();
        if (text && text.length > 1) {
          setSelectedNode(text);
          setChatHistory([]);
          setShowChat(true);
        }
      }
    }
  }, []);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

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
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Code copied!" });
  };

  const copyShareLink = async () => {
    const encoded = btoa(encodeURIComponent(mermaidCode));
    const url = `${window.location.origin}/dashboard/visual/flowchart?code=${encoded}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Share link copied!" });
  };

  const exportSVG = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowchart-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        a.download = `flowchart-${Date.now()}.png`;
        a.click();
      };
      img.src = dataUrl;
    } catch (error) {
      console.error(error);
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Flowchart</title><style>body{margin:20px;font-family:Inter,system-ui,sans-serif;}svg{max-width:100%;height:auto;}</style></head><body>${svg}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || !selectedNode) return;
    
    const userMessage = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const contextMessage = `Context: Flowchart about "${description.slice(0, 100)}". Step: "${selectedNode}".\n\nQuestion: ${userMessage}`;
      
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

      if (!response.ok) throw new Error("Failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

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
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your question." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const stats = getStats();

  if (!mounted) return null;

  return (
    <div className={cn(
      "h-full flex flex-col bg-white transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {/* INITIAL STATE - Centered Minimalist Input */}
      {!hasResult ? (
        <div className="h-full flex items-center justify-center bg-white p-3 lg:p-6">
          <div className="w-full max-w-xl">
            {/* Title */}
            <div className="text-center mb-6 lg:mb-8">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <GitBranch className="w-6 h-6 lg:w-7 lg:h-7 text-blue-600" />
              </div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Text to Flowchart</h1>
              <p className="text-gray-500 text-sm">Describe any process to visualize it</p>
            </div>

            {/* Main Input */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* File Upload Badge */}
              {uploadedFile && (
                <div className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <File className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium truncate flex-1">{uploadedFile.name}</span>
                  <button onClick={clearFile} className="p-1 hover:bg-blue-100 rounded-full">
                    <X className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              )}

              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your process here...&#10;&#10;Example: User submits form → validate data → if valid save to database → send confirmation email → else show error message&#10;&#10;Or upload a PDF/DOC file below"
                className="min-h-[100px] lg:min-h-[120px] resize-none border-0 focus:ring-0 text-sm p-3 lg:p-4"
              />
              
              {/* Bottom Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 lg:px-4 py-2 lg:py-3 bg-gray-50 border-t border-gray-100">
                {/* Left side - File upload & Direction */}
                <div className="flex items-center gap-2 lg:gap-3">
                  {/* File Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsingFile}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
                  >
                    {isParsingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Upload</span>
                  </button>

                  {/* Direction */}
                  <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                    {DIRECTIONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDirection(d.value)}
                        className={cn(
                          "p-2 rounded-md transition-all",
                          direction === d.value ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"
                        )}
                        title={d.label}
                      >
                        <d.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model & Generate */}
                <div className="flex items-center gap-2">
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading || description.trim().length < 5}
                    className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-2" />Generate</>}
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Examples */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 lg:mt-4">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setDescription(ex)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Credits */}
            <div className="flex justify-center mt-4 lg:mt-6">
              <span className="px-3 py-1.5 bg-gray-50 text-gray-500 text-xs rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />Uses 4 credits
              </span>
            </div>
          </div>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Creating flowchart...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* RESULTS STATE - Full Canvas */
        <div 
          ref={canvasRef}
          className={cn(
            "h-full relative overflow-hidden",
            showGrid && "bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:20px_20px]",
            !showGrid && "bg-white"
          )}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDragging(false)}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
        {/* Floating Input Bar - Only when has result */}
        {hasResult && (
          <div className="absolute top-3 lg:top-4 left-2 right-2 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-2 flex flex-wrap items-center gap-2 lg:max-w-2xl">
            <GitBranch className="w-4 h-4 text-blue-600 ml-1 lg:ml-2 shrink-0" />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="Describe a process..."
              className="flex-1 h-9 min-w-0 sm:min-w-[180px] lg:min-w-[240px] border-0 bg-transparent focus:ring-0 text-sm focus:outline-none"
            />
            
            {/* Direction buttons */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 shrink-0">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDirection(d.value)}
                  className={cn(
                    "p-1.5 rounded-md transition-all",
                    direction === d.value ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  )}
                  title={d.label}
                >
                  <d.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            
            {/* Stats badge */}
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg flex items-center gap-1 shrink-0">
              <Layers className="w-3 h-3" />{stats.nodes}
            </span>
            
            <Button
              onClick={handleGenerate}
              disabled={isLoading || description.trim().length < 5}
              size="sm"
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            </Button>
          </div>
        )}

        {/* Left Toolbar */}
        <div className="absolute left-1 lg:left-3 top-1/2 -translate-y-1/2 z-20 bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-1 lg:p-1.5 flex flex-col gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))} className="h-8 w-8 p-0" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-[9px] text-gray-400 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.25))} className="h-8 w-8 p-0" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="h-px bg-gray-100 my-1" />
          <Button variant="ghost" size="sm" onClick={resetView} className="h-8 w-8 p-0" title="Reset">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={fitToView} className="h-8 w-8 p-0" title="Fit">
            <Focus className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="h-8 w-8 p-0" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <div className="h-px bg-gray-100 my-1" />
          <Button variant="ghost" size="sm" onClick={() => setShowGrid(!showGrid)} className={cn("h-8 w-8 p-0", showGrid && "bg-blue-50 text-blue-600")} title="Grid">
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>

        {/* Right Toolbar */}
        <div className="absolute right-1 lg:right-3 top-1/2 -translate-y-1/2 z-20 bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-1 lg:p-1.5 flex flex-col gap-0.5">
          <Button variant="ghost" size="sm" onClick={copyCode} className="h-8 w-8 p-0" title="Copy Code" disabled={!hasResult}>
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Code2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={exportSVG} className="h-8 w-8 p-0" title="SVG" disabled={!hasResult}>
            <FileText className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={exportPNG} className="h-8 w-8 p-0" title="PNG" disabled={!hasResult}>
            <Image className="w-4 h-4" />
          </Button>
          <div className="h-px bg-gray-100 my-1" />
          <Button variant="ghost" size="sm" onClick={handlePrint} className="h-8 w-8 p-0" title="Print" disabled={!hasResult}>
            <Printer className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={copyShareLink} className="h-8 w-8 p-0" title="Share" disabled={!hasResult}>
            <Link2 className="w-4 h-4" />
          </Button>
          <div className="h-px bg-gray-100 my-1" />
          <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 w-8 p-0" title="Undo" disabled={historyIndex <= 0}>
            <History className="w-4 h-4" />
          </Button>
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowImproveInput(!showImproveInput)} className={cn("h-8 w-8 p-0", isImproving && "animate-pulse", showImproveInput && "bg-blue-50 text-blue-600")} title="AI Improve" disabled={!hasResult || isImproving}>
              <Zap className="w-4 h-4" />
            </Button>
            {showImproveInput && (
              <div className="absolute right-full mr-2 top-0 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-30 w-72">
                <p className="text-xs font-medium text-gray-700 mb-2">AI Improve</p>
                <textarea
                  value={improvePrompt}
                  onChange={(e) => setImprovePrompt(e.target.value)}
                  placeholder="e.g. Add error handling, add more steps for validation, make it more detailed..."
                  className="w-full h-20 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowImproveInput(false); setImprovePrompt(""); }}
                    className="flex-1 h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAIImprove}
                    disabled={!improvePrompt.trim() || isImproving}
                    className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isImproving ? "Improving..." : "Apply"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="h-px bg-gray-100 my-1" />
          <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)} className={cn("h-8 w-8 p-0", showStats && "bg-blue-50 text-blue-600")} title="Stats" disabled={!hasResult}>
            <BarChart3 className="w-4 h-4" />
          </Button>
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowThemes(!showThemes)} className="h-8 w-8 p-0" title="Theme">
              <Palette className="w-4 h-4" />
            </Button>
            {showThemes && (
              <div className="absolute right-full mr-2 top-0 bg-white rounded-xl shadow-xl border border-gray-100 p-2.5 z-30 w-40">
                <p className="text-[10px] font-medium text-gray-500 mb-2">Themes</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => { setSelectedTheme(theme.id); setShowThemes(false); }}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                        selectedTheme === theme.id ? "border-gray-800 ring-2 ring-gray-200" : "border-transparent"
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

        {/* Stats Panel */}
        {showStats && hasResult && (
          <div className="absolute top-14 lg:top-3 right-10 lg:right-3 z-20 bg-white rounded-xl shadow-lg border border-gray-100 p-3 w-36">
            <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />Statistics
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Nodes</span><span className="font-medium">{stats.nodes}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Connections</span><span className="font-medium">{stats.edges}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Decisions</span><span className="font-medium">{stats.decisions}</span></div>
            </div>
          </div>
        )}

        {/* Flowchart Container */}
        <div 
          ref={svgContainerRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        {/* Bottom Hint */}
        {hasResult && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
            <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-[11px] text-gray-500 border border-gray-100 shadow-sm">
              Drag to pan • Scroll to zoom • Click node to chat
            </span>
          </div>
        )}

        {/* Chat Panel - Left Side */}
        {showChat && (
          <div className="absolute top-14 left-2 right-2 lg:top-3 lg:left-14 lg:right-auto lg:w-[320px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30 animate-in slide-in-from-left-5 duration-200">
            <div className="flex items-center justify-between px-3 lg:px-4 py-2.5 lg:py-3 bg-gradient-to-r from-blue-600 to-blue-500">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white truncate max-w-[180px]">{selectedNode}</span>
              </div>
              <button onClick={() => setShowChat(false)} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-full">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div className="h-48 lg:h-56 overflow-y-auto p-3 space-y-2.5 bg-gray-50/50">
              {chatHistory.length === 0 && (
                <div className="text-center py-6">
                  <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Ask about this step</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-100"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex gap-1.5 px-3 py-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              )}
            </div>
            
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ask a question..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="h-9 text-sm rounded-xl"
                />
                <Button onClick={handleChatSubmit} disabled={!chatMessage.trim() || isChatLoading} size="sm" className="h-9 w-9 p-0 bg-blue-600 rounded-xl">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {(isLoading || isImproving) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-700 font-medium">{isImproving ? "Improving..." : "Creating flowchart..."}</p>
            </div>
          </div>
        )}

        {/* Fullscreen hint */}
        {isFullscreen && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-black/80 text-white text-xs rounded-full">
            Click minimize to exit
          </div>
        )}
        </div>
      )}
    </div>
  );
}
