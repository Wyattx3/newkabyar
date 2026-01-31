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
import ReactMarkdown from "react-markdown";
import Link from "next/link";

const intensities = [
  { value: "gentle", label: "Gentle", icon: Snowflake, desc: "Constructive critique", color: "bg-blue-100 text-blue-700" },
  { value: "balanced", label: "Balanced", icon: Scale, desc: "Fair analysis", color: "bg-amber-100 text-amber-700" },
  { value: "aggressive", label: "Aggressive", icon: Flame, desc: "No mercy", color: "bg-red-100 text-red-700" },
];

export default function DevilsAdvocatePage() {
  const [argument, setArgument] = usePersistedState("advocate-arg", "");
  const [intensity, setIntensity] = usePersistedState("advocate-intensity", "balanced");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("advocate-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [counterArgument, setCounterArgument] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (argument.trim().length < 20) {
      toast({ title: "Enter a longer argument", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setCounterArgument("");

    try {
      const response = await fetch("/api/tools/advocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          argument,
          intensity,
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

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Scale className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Devil's Advocate</h1>
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
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left - Your Argument */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900 text-sm">Your Argument</span>
          </div>
          <Textarea
            value={argument}
            onChange={(e) => setArgument(e.target.value)}
            placeholder="Present your argument, thesis, or position that you want challenged...

Example: 'Remote work is better than office work because it offers more flexibility, reduces commute stress, and allows for better work-life balance.'"
            className="flex-1 resize-none border-0 focus:ring-0 p-4 text-gray-800"
          />
          <div className="p-4 border-t border-gray-100 space-y-3">
            {/* Intensity Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">Critique Intensity</label>
              <div className="grid grid-cols-3 gap-2">
                {intensities.map((i) => (
                  <button
                    key={i.value}
                    onClick={() => setIntensity(i.value)}
                    className={`p-3 rounded-xl text-center transition-all border-2 ${
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
        <div className="flex flex-col items-center justify-center">
          <Zap className="w-8 h-8 text-amber-500" />
          <span className="text-xs font-bold text-gray-400 mt-2">VS</span>
        </div>

        {/* Right - Counter Argument */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
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
          <div className="flex-1 overflow-y-auto p-4">
            {counterArgument ? (
              <div className="prose prose-sm max-w-none prose-headings:text-red-900 prose-strong:text-red-800">
                <ReactMarkdown>{counterArgument}</ReactMarkdown>
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
