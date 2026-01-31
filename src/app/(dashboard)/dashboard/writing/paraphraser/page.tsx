"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  RefreshCw, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

const styles = [
  { value: "academic", label: "Academic", desc: "Formal & scholarly" },
  { value: "simple", label: "Simple", desc: "Easy to understand" },
  { value: "creative", label: "Creative", desc: "Engaging & fresh" },
  { value: "formal", label: "Formal", desc: "Professional tone" },
  { value: "casual", label: "Casual", desc: "Conversational" },
];

export default function ParaphraserPage() {
  const [text, setText] = usePersistedState("paraphrase-text", "");
  const [style, setStyle] = usePersistedState("paraphrase-style", "academic");
  const [preserveLength, setPreserveLength] = usePersistedState("paraphrase-length", true);
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("paraphrase-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleParaphrase = async () => {
    if (text.trim().length < 20) {
      toast({ title: "Enter at least 20 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/tools/paraphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          style,
          preserveLength,
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

      let output = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += decoder.decode(value, { stream: true });
        setResult(output);
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
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = (str: string) => str.split(/\s+/).filter(Boolean).length;

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Safe Paraphraser</h1>
            <p className="text-xs text-gray-500">Rewrite text while keeping meaning</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-xs text-cyan-600 hover:underline">Writing</Link>
          <span className="px-2 py-1 bg-cyan-50 text-cyan-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />2 credits
          </span>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 min-h-0">
        <div className="h-full flex gap-4">
          {/* Original */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-900 text-sm">Original</span>
              <span className="text-xs text-gray-400">{wordCount(text)} words</span>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the text you want to paraphrase..."
              className="flex-1 resize-none border-0 focus:ring-0 p-4 text-gray-800"
            />
          </div>

          {/* Center Controls */}
          <div className="w-[200px] flex flex-col justify-center gap-3">
            {/* Style Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 text-center">Style</p>
              <div className="space-y-1">
                {styles.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                      style === s.value
                        ? "bg-cyan-50 border border-cyan-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <p className={`text-xs font-medium ${style === s.value ? "text-cyan-700" : "text-gray-700"}`}>{s.label}</p>
                    <p className="text-[10px] text-gray-400">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Length Toggle */}
            <button
              onClick={() => setPreserveLength(!preserveLength)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                preserveLength
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-gray-50 text-gray-500 border border-gray-200"
              }`}
            >
              {preserveLength ? "✓ Keep length" : "Flexible length"}
            </button>

            {/* Model */}
            <div className="bg-white rounded-xl border border-gray-100 p-2">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>

            {/* Transform Button */}
            <Button
              onClick={handleParaphrase}
              disabled={isLoading || text.trim().length < 20}
              className="h-14 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 font-semibold shadow-lg shadow-cyan-500/30"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Paraphrase
                </>
              )}
            </Button>
          </div>

          {/* Result */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-900 text-sm">Paraphrased</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{wordCount(result)} words</span>
                {result && (
                  <button
                    onClick={copyResult}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {result ? (
                <p className="text-gray-800 whitespace-pre-wrap">{result}</p>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-8 h-8 text-cyan-500 mx-auto mb-3 animate-pulse" />
                        <p className="text-gray-500 text-sm">Rewriting...</p>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Result appears here</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
