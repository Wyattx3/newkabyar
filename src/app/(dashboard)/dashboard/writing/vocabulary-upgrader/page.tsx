"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  GraduationCap, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface Replacement {
  original: string;
  upgraded: string;
  reason: string;
}

interface UpgradeResult {
  upgradedText: string;
  replacements: Replacement[];
  beforeScore: number;
  afterScore: number;
}

const levels = [
  { value: "academic", label: "Academic", desc: "Scholarly writing" },
  { value: "professional", label: "Professional", desc: "Business context" },
  { value: "sophisticated", label: "Sophisticated", desc: "Elevated vocabulary" },
];

export default function VocabularyUpgraderPage() {
  const [text, setText] = usePersistedState("vocab-text", "");
  const [level, setLevel] = usePersistedState("vocab-level", "academic");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("vocab-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UpgradeResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showReplacements, setShowReplacements] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleUpgrade = async () => {
    if (text.trim().length < 20) {
      toast({ title: "Enter at least 20 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          level,
          preserveMeaning: true,
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

  const copyResult = () => {
    if (result?.upgradedText) {
      navigator.clipboard.writeText(result.upgradedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-indigo-600";
    if (score >= 40) return "from-amber-500 to-orange-500";
    return "from-gray-400 to-gray-500";
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Vocabulary Upgrader</h1>
            <p className="text-xs text-gray-500">Elevate your writing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-xs text-violet-600 hover:underline">Writing</Link>
          <span className="px-2 py-1 bg-violet-50 text-violet-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />3 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Score Cards */}
        {result && (
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Before</p>
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getScoreColor(result.beforeScore)} flex items-center justify-center text-white`}>
                <span className="text-2xl font-black">{result.beforeScore}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gray-300" />
              <TrendingUp className="w-6 h-6 text-green-500" />
              <div className="w-8 h-0.5 bg-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">After</p>
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getScoreColor(result.afterScore)} flex items-center justify-center text-white shadow-lg`}>
                <span className="text-2xl font-black">{result.afterScore}</span>
              </div>
            </div>
          </div>
        )}

        {/* Text Areas */}
        <div className="flex-1 flex gap-4">
          {/* Original */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-medium text-gray-900 text-sm">Original Text</span>
              <span className="text-xs text-gray-400">{text.split(/\s+/).filter(Boolean).length} words</span>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text you want to upgrade to more sophisticated vocabulary..."
              className="flex-1 resize-none border-0 focus:ring-0 p-4 text-gray-800"
            />
          </div>

          {/* Controls */}
          <div className="w-[180px] flex flex-col gap-3">
            {/* Level */}
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <label className="text-xs font-medium text-gray-500 mb-2 block">Level</label>
              <div className="space-y-1.5">
                {levels.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`w-full px-3 py-2 rounded-lg text-left transition-all ${
                      level === l.value
                        ? "bg-violet-100 text-violet-700"
                        : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <span className="text-xs font-medium block">{l.label}</span>
                    <span className="text-[10px] text-gray-400">{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={isLoading || text.trim().length < 20}
              className="h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 font-semibold"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Upgrade<ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>

            {result && (
              <button
                onClick={() => setShowReplacements(!showReplacements)}
                className="text-xs text-violet-600 hover:underline text-center"
              >
                {showReplacements ? "Hide" : "Show"} replacements ({result.replacements.length})
              </button>
            )}
          </div>

          {/* Upgraded */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-600" />
                <span className="font-medium text-violet-900 text-sm">Upgraded Text</span>
              </div>
              {result && (
                <button onClick={copyResult} className="p-1.5 hover:bg-violet-100 rounded-lg">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-violet-400" />}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {result ? (
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{result.upgradedText}</p>
              ) : (
                <div className="h-full flex items-center justify-center">
                  {isLoading ? (
                    <div className="text-center">
                      <GraduationCap className="w-8 h-8 text-violet-500 mx-auto mb-3 animate-pulse" />
                      <p className="text-gray-500 text-sm">Upgrading vocabulary...</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ArrowRight className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Upgraded text appears here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replacements Panel */}
        {result && showReplacements && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Word Replacements</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {result.replacements.map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500 line-through">{r.original}</span>
                  <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
                  <span className="text-sm text-violet-700 font-medium">{r.upgraded}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
