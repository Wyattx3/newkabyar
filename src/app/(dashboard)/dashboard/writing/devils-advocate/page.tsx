"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Scale, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  Sword,
  Shield,
  Flame,
  Snowflake,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import type { Components } from "react-markdown";

const intensities = [
  { value: "gentle", label: "Gentle", icon: Snowflake, desc: "Constructive critique", color: "bg-blue-100 text-blue-700" },
  { value: "balanced", label: "Balanced", icon: Scale, desc: "Fair analysis", color: "bg-amber-100 text-amber-700" },
  { value: "aggressive", label: "Aggressive", icon: Flame, desc: "No mercy", color: "bg-red-100 text-red-700" },
];

interface InitialData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
}

export default function DevilsAdvocatePage({ initialData }: { initialData?: InitialData } = {}) {
  const [argument, setArgument] = usePersistedState("advocate-arg", (initialData?.inputData?.argument as string) || "");
  const [intensity, setIntensity] = usePersistedState("advocate-intensity", (initialData?.settings?.intensity as string) || "balanced");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("advocate-model", (initialData?.settings?.model as ModelType) || "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [counterArgument, setCounterArgument] = useState((initialData?.outputData?.counterArgument as string) || "");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("devils-advocate");

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (argument.trim().length < 20) {
      toast({ title: "Enter a longer argument", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setCounterArgument("");

    try {
      // Map intensity values to API expected values
      const intensityMap: Record<string, string> = {
        gentle: "gentle",
        balanced: "moderate",
        moderate: "moderate",
        aggressive: "aggressive",
      };
      const apiIntensity = intensityMap[intensity] || "moderate";

      const response = await fetch("/api/tools/advocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          argument,
          intensity: apiIntensity,
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json();
          toast({ 
            title: "Insufficient Credits", 
            description: `You need ${data.creditsNeeded} credits but have ${data.creditsRemaining} remaining.`,
            variant: "destructive" 
          });
          return;
        }
        const errorData = await response.json().catch(() => ({ error: "Failed to generate counter-arguments" }));
        toast({ 
          title: "Error", 
          description: typeof errorData.error === "string" ? errorData.error : "Something went wrong",
          variant: "destructive" 
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let result = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setCounterArgument(result);
      }
      saveProject({
        inputData: { argument },
        outputData: { counterArgument: result },
        settings: { intensity, model: selectedModel },
        inputPreview: argument.slice(0, 200),
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(counterArgument);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Custom markdown components for better styling
  const markdownComponents: Components = {
    h1: ({ node, ...props }) => (
      <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mt-8 mb-5 pb-3 border-b-2 border-gray-200" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mt-7 mb-4 flex items-center gap-3 group" {...props}>
        <div className="w-1.5 h-7 bg-gradient-to-b from-red-500 to-red-400 rounded-full shadow-sm" />
        <span className="flex-1">{props.children}</span>
      </h2>
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-base lg:text-lg font-semibold text-gray-800 mt-6 mb-3 pl-2 border-l-3 border-red-300" {...props} />
    ),
    p: ({ node, ...props }) => (
      <p className="text-[15px] text-gray-700 leading-[1.8] mb-4 first:mt-0" {...props} />
    ),
    ul: ({ node, ...props }) => (
      <ul className="space-y-3 mb-5 ml-0 list-none" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="space-y-3 mb-5 ml-6 list-decimal list-outside marker:text-red-500 marker:font-semibold" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="text-[15px] text-gray-700 leading-relaxed flex items-start gap-3 group" {...props}>
        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 group-hover:bg-red-500 transition-colors" />
        <span className="flex-1">{props.children}</span>
      </li>
    ),
    strong: ({ node, ...props }) => (
      <strong className="font-semibold text-gray-900 bg-yellow-50 px-1 rounded" {...props} />
    ),
    em: ({ node, ...props }) => (
      <em className="italic text-gray-700" {...props} />
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      return inline ? (
        <code className="px-1.5 py-0.5 bg-gray-100 text-red-600 rounded text-sm font-mono border border-gray-200" {...props}>
          {children}
        </code>
      ) : (
        <div className="my-5 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-xs text-gray-400 ml-auto font-mono">Code</span>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto">
            <code className="text-sm font-mono leading-relaxed" {...props}>
              {String(children).replace(/\n$/, "")}
            </code>
          </pre>
        </div>
      );
    },
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-4 border-red-400 pl-5 py-3 my-5 bg-gradient-to-r from-red-50 to-transparent rounded-r-lg italic text-gray-700 shadow-sm" {...props} />
    ),
    hr: ({ node, ...props }) => (
      <div className="my-7 flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>
    ),
    a: ({ node, ...props }) => (
      <a className="text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-2 decoration-blue-300 hover:decoration-blue-500 transition-colors" {...props} />
    ),
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-5 rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full border-collapse" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className="bg-gradient-to-r from-gray-100 to-gray-50" {...props} />
    ),
    tbody: ({ node, ...props }) => (
      <tbody className="bg-white divide-y divide-gray-200" {...props} />
    ),
    tr: ({ node, ...props }) => (
      <tr className="hover:bg-gray-50 transition-colors" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm border-b border-gray-200" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="px-4 py-3 text-gray-700 text-sm border-b border-gray-100" {...props} />
    ),
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 lg:mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Scale className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-base lg:text-lg font-bold text-gray-900">Devil's Advocate</h1>
            <p className="text-xs text-gray-500">Challenge your arguments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-xs text-slate-600 hover:underline">Writing</Link>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />3 credits
          </span>
        </div>
      </div>

      {/* Main - VS Layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 lg:gap-4">
        {/* Left - Your Argument */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="px-3 lg:px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900 text-sm">Your Argument</span>
          </div>
          <Textarea
            value={argument}
            onChange={(e) => setArgument(e.target.value)}
            placeholder="Present your argument, thesis, or position that you want challenged...

Example: 'Remote work is better than office work because it offers more flexibility, reduces commute stress, and allows for better work-life balance.'"
            className="flex-1 resize-none border-0 focus:ring-0 p-3 lg:p-4 text-gray-800"
          />
          <div className="p-3 lg:p-4 border-t border-gray-100 space-y-3">
            {/* Intensity Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Critique Intensity</label>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {intensities.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setIntensity(i.value)}
                    className={`p-2 sm:p-3 rounded-xl text-center transition-all border-2 ${
                      intensity === i.value
                        ? `${i.color} border-current`
                        : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                    }`}
                  >
                    <i.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium block">{i.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              <Button
                onClick={handleGenerate}
                disabled={isLoading || argument.trim().length < 20}
                className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-900"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sword className="w-4 h-4 mr-2" />Challenge</>}
              </Button>
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="flex lg:flex-col items-center justify-center py-1 lg:py-0">
          <Zap className="w-6 h-6 lg:w-8 lg:h-8 text-amber-500" />
          <span className="text-xs font-bold text-gray-400 ml-2 lg:ml-0 lg:mt-2">VS</span>
        </div>

        {/* Right - Counter Argument */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="px-3 lg:px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sword className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-900 text-sm">Counter Arguments</span>
            </div>
            {counterArgument && (
              <button onClick={copyResult} className="p-1.5 hover:bg-red-100 rounded-lg">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-red-400" />}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 lg:p-6 bg-gradient-to-b from-white to-gray-50/30">
            {counterArgument ? (
              <div className="max-w-none prose prose-sm prose-headings:scroll-mt-6">
                <ReactMarkdown 
                  components={markdownComponents}
                  className="markdown-content"
                >
                  {counterArgument}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Sword className="w-9 h-9 text-red-500 mx-auto mb-3 animate-pulse" />
                    <p className="text-gray-600 text-sm">Preparing counter-arguments...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Sword className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-sm">Counter arguments appear here</p>
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
