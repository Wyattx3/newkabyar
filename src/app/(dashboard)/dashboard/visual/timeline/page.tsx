"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { MermaidRenderer } from "@/components/tools/mermaid-renderer";
import { 
  Clock, 
  Loader2, 
  Sparkles,
  Search,
  Calendar,
  History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

const suggestedTopics = [
  "World War II",
  "Industrial Revolution",
  "Internet History",
  "Space Exploration",
  "Renaissance Period",
  "Ancient Rome",
];

export default function TimelinePage() {
  const [topic, setTopic] = usePersistedState("timeline-topic", "");
  const [eventCount, setEventCount] = usePersistedState("timeline-count", 8);
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("timeline-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (topic.trim().length < 3) {
      toast({ title: "Enter a topic", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setMermaidCode("");

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
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-6 mb-4 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Interactive Timeline</h1>
                <p className="text-gray-500 text-sm">Visualize historical events</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/visual" className="text-xs text-blue-600 hover:underline">Visual</Link>
            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />4 credits
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <History className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="Enter a historical topic..."
            className="h-14 pl-12 pr-40 rounded-xl bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-300"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <select
              value={eventCount}
              onChange={(e) => setEventCount(Number(e.target.value))}
              className="h-10 px-3 rounded-lg bg-gray-100 border-0 text-sm text-gray-700"
            >
              {[5, 8, 10, 12, 15].map((n) => (
                <option key={n} value={n} className="text-gray-900">{n} events</option>
              ))}
            </select>
            <Button
              onClick={handleGenerate}
              disabled={isLoading || topic.trim().length < 3}
              className="h-10 px-6 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Generate</>}
            </Button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-500">Try:</span>
          {suggestedTopics.slice(0, 4).map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-full transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Display */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {mermaidCode ? (
          <div className="h-full flex items-center justify-center p-8 overflow-auto">
            <MermaidRenderer code={mermaidCode} />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            {isLoading ? (
              <div className="text-center">
                <Calendar className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-600 font-medium">Building timeline...</p>
                <p className="text-xs text-gray-400 mt-1">Researching "{topic}"</p>
              </div>
            ) : (
              <div className="text-center max-w-md">
                <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${i <= 3 ? "bg-blue-400" : "bg-gray-200"}`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Create a Timeline</h2>
                <p className="text-gray-500">
                  Enter any historical topic to generate an interactive timeline with key events and dates
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Model Selector - Bottom */}
      <div className="mt-4 flex justify-center">
        <div className="bg-white rounded-full border border-gray-100 shadow-sm p-2">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
        </div>
      </div>
    </div>
  );
}
