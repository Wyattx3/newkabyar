"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface MermaidRendererProps {
  code: string;
  className?: string;
  onExport?: (format: "svg" | "png") => void;
}

export function MermaidRenderer({
  code,
  className = "",
  onExport,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!code) {
      setSvg("");
      return;
    }

    const renderDiagram = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "inherit",
        });

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${Date.now()}`,
          code
        );
        
        setSvg(renderedSvg);
        setError("");
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
        setSvg("");
      }
    };

    renderDiagram();
  }, [code]);

  const handleCopy = async () => {
    if (!svg) return;
    
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleExportSVG = () => {
    if (!svg) return;
    
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
    
    onExport?.("svg");
  };

  const handleExportPNG = async () => {
    if (!svg || !containerRef.current) return;
    
    try {
      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Create image from SVG
      const img = new Image();
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        canvas.width = img.width * 2; // 2x for better quality
        canvas.height = img.height * 2;
        ctx.scale(2, 2);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Download
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "diagram.png";
        a.click();
        
        URL.revokeObjectURL(url);
        onExport?.("png");
      };
      
      img.src = url;
    } catch (err) {
      console.error("PNG export failed:", err);
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const toggleFullscreen = () => setIsFullscreen((f) => !f);

  if (!code) {
    return (
      <div className={`flex items-center justify-center p-8 text-gray-400 ${className}`}>
        <p>No diagram to display</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-1">Diagram Error</h4>
          <p className="text-sm text-red-600">{error}</p>
          <details className="mt-2">
            <summary className="text-xs text-red-500 cursor-pointer">View code</summary>
            <pre className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded overflow-x-auto">
              {code}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-white" : ""} ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-500 min-w-[3rem] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 gap-1 text-xs"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Code"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportSVG}
            className="h-8 gap-1 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            SVG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportPNG}
            className="h-8 gap-1 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            PNG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Diagram */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 bg-white"
        style={{ minHeight: 200 }}
      >
        <div
          className="flex items-center justify-center min-h-full"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      
      {/* Fullscreen close hint */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full">
          Press Esc or click the button to exit fullscreen
        </div>
      )}
    </div>
  );
}

// Helper to generate basic mermaid code
export function generateMindMap(topic: string, nodes: string[]): string {
  const sanitize = (text: string) => text.replace(/[[\]()]/g, "");
  
  let code = `mindmap\n  root((${sanitize(topic)}))\n`;
  nodes.forEach((node) => {
    code += `    ${sanitize(node)}\n`;
  });
  
  return code;
}

export function generateFlowchart(
  steps: Array<{ id: string; text: string; next?: string[] }>
): string {
  let code = "flowchart TD\n";
  
  steps.forEach((step) => {
    const sanitizedText = step.text.replace(/"/g, "'");
    code += `  ${step.id}["${sanitizedText}"]\n`;
  });
  
  code += "\n";
  
  steps.forEach((step) => {
    step.next?.forEach((nextId) => {
      code += `  ${step.id} --> ${nextId}\n`;
    });
  });
  
  return code;
}

export function generateTimeline(
  events: Array<{ date: string; title: string; description?: string }>
): string {
  let code = "timeline\n";
  
  events.forEach((event) => {
    const sanitizedTitle = event.title.replace(/:/g, "-");
    code += `  ${event.date} : ${sanitizedTitle}\n`;
    if (event.description) {
      code += `           : ${event.description.replace(/:/g, "-")}\n`;
    }
  });
  
  return code;
}
