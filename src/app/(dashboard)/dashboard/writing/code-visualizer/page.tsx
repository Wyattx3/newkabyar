"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { MermaidRenderer } from "@/components/tools/mermaid-renderer";
import { 
  Code2, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  GitBranch,
  MessageSquare,
  Boxes,
  FileCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface VisualResult {
  explanation: string;
  mermaidCode: string;
  complexity: string;
  keyPoints: string[];
}

const visualTypes = [
  { value: "flowchart", label: "Flowchart", icon: GitBranch, desc: "Step-by-step flow" },
  { value: "sequence", label: "Sequence", icon: MessageSquare, desc: "Function calls" },
  { value: "class", label: "Class Diagram", icon: Boxes, desc: "Structure view" },
];

export default function CodeVisualizerPage() {
  const [code, setCode] = usePersistedState("codeviz-code", "");
  const [visualType, setVisualType] = usePersistedState("codeviz-type", "flowchart");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("codeviz-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VisualResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"diagram" | "explain">("diagram");
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleVisualize = async () => {
    if (code.trim().length < 20) {
      toast({ title: "Enter some code", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/code-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          visualType,
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
      setResult(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyCode = () => {
    if (result?.mermaidCode) {
      navigator.clipboard.writeText(result.mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Code2 className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Code Logic Visualizer</h1>
            <p className="text-xs text-gray-500">See how your code flows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-xs text-sky-600 hover:underline">Writing</Link>
          <span className="px-2 py-1 bg-sky-50 text-sky-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />4 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-4">
        {/* Left - Code Input */}
        <div className="flex flex-col gap-4">
          {/* Code Editor */}
          <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-gray-800 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-medium text-gray-300">Code Input</span>
            </div>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Paste your code here

function example(data) {
  if (data.length === 0) {
    return null;
  }
  
  for (const item of data) {
    processItem(item);
  }
  
  return result;
}`}
              className="flex-1 resize-none border-0 bg-transparent text-green-400 font-mono text-sm p-4 focus:ring-0 placeholder:text-gray-600"
            />
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs font-medium text-gray-500">Visualization Type</label>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {visualTypes.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setVisualType(v.value)}
                  className={`p-3 rounded-xl text-center transition-all border-2 ${
                    visualType === v.value
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-gray-100 hover:border-sky-200 text-gray-600"
                  }`}
                >
                  <v.icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium block">{v.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              <Button
                onClick={handleVisualize}
                disabled={isLoading || code.trim().length < 20}
                className="flex-1 h-10 rounded-xl bg-sky-600 hover:bg-sky-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GitBranch className="w-4 h-4 mr-2" />Visualize</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Right - Output */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("diagram")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "diagram"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Diagram
              </button>
              <button
                onClick={() => setActiveTab("explain")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "explain"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Explanation
              </button>
            </div>
            {result && (
              <button onClick={copyCode} className="p-1.5 hover:bg-gray-100 rounded-lg">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {result ? (
              activeTab === "diagram" ? (
                <div className="h-full flex items-center justify-center">
                  <MermaidRenderer code={result.mermaidCode} />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Complexity Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      result.complexity === "Simple" ? "bg-green-100 text-green-700" :
                      result.complexity === "Moderate" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {result.complexity}
                    </span>
                  </div>

                  {/* Explanation */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
                  </div>

                  {/* Key Points */}
                  {result.keyPoints && result.keyPoints.length > 0 && (
                    <div className="p-4 bg-sky-50 rounded-xl">
                      <h3 className="text-sm font-semibold text-sky-800 mb-2">Key Points</h3>
                      <ul className="space-y-1.5">
                        {result.keyPoints.map((point, i) => (
                          <li key={i} className="text-sm text-sky-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Code2 className="w-8 h-8 text-sky-500" />
                    </div>
                    <p className="text-gray-600 font-medium">Analyzing code...</p>
                    <p className="text-xs text-gray-400 mt-1">Creating {visualType}</p>
                  </div>
                ) : (
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <GitBranch className="w-8 h-8 text-gray-300" />
                    </div>
                    <h2 className="font-bold text-gray-900 mb-2">Visualize Your Code</h2>
                    <p className="text-gray-500 text-sm">
                      Paste code on the left and see it transformed into an easy-to-understand diagram
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
