"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { MermaidRenderer } from "@/components/tools/mermaid-renderer";
import { 
  GitBranch, 
  Loader2, 
  Sparkles,
  Download,
  Copy,
  Check,
  Wand2,
  ArrowDown,
  ArrowRight as ArrowRightIcon,
  ArrowUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

const directions = [
  { value: "TD", label: "Top → Down", icon: ArrowDown },
  { value: "LR", label: "Left → Right", icon: ArrowRightIcon },
  { value: "BT", label: "Bottom → Top", icon: ArrowUp },
];

export default function FlowchartPage() {
  const [description, setDescription] = usePersistedState("flowchart-desc", "");
  const [direction, setDirection] = usePersistedState("flowchart-dir", "TD");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("flowchart-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (description.trim().length < 10) {
      toast({ title: "Description too short", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setMermaidCode("");

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
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GitBranch className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Text to Flowchart</h1>
            <p className="text-xs text-gray-500">Visualize any process</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/visual" className="text-xs text-indigo-600 hover:underline">Visual</Link>
          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />4 credits
          </span>
        </div>
      </div>

      {/* Main - Vertical Split */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Input Section - Top */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex gap-4">
            {/* Description */}
            <div className="flex-1">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the process you want to visualize...

Example: User login flow: User enters credentials, system validates, if valid show dashboard else show error and retry"
                className="min-h-[100px] resize-none rounded-xl border-gray-200"
              />
            </div>

            {/* Controls */}
            <div className="w-[200px] space-y-3">
              {/* Direction */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Direction</label>
                <div className="grid grid-cols-3 gap-1">
                  {directions.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDirection(d.value)}
                      className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                        direction === d.value
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      <d.icon className="w-4 h-4" />
                      <span className="text-[10px]">{d.label.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <ModelSelector value={selectedModel} onChange={setSelectedModel} />

              <Button
                onClick={handleGenerate}
                disabled={isLoading || description.trim().length < 10}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-2" />Generate</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Output Section - Bottom */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
          {mermaidCode ? (
            <>
              {/* Controls */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="p-2 bg-white/90 backdrop-blur rounded-lg shadow border border-gray-100 text-gray-600 hover:text-indigo-600"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button className="p-2 bg-white/90 backdrop-blur rounded-lg shadow border border-gray-100 text-gray-600 hover:text-indigo-600">
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Diagram */}
              <div className="h-full flex items-center justify-center p-8 overflow-auto">
                <MermaidRenderer code={mermaidCode} />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              {isLoading ? (
                <div className="text-center">
                  <GitBranch className="w-10 h-10 text-indigo-500 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-600 font-medium">Creating flowchart...</p>
                </div>
              ) : (
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <GitBranch className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-400">Your flowchart will appear here</p>
                  <p className="text-xs text-gray-300 mt-1">Describe a process above</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
