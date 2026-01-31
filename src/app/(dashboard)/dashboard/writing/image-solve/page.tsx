"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Camera, 
  Loader2, 
  Sparkles,
  Upload,
  X,
  Clipboard,
  Lightbulb,
  CheckCircle,
  BookOpen,
  Calculator,
  Beaker,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface SolutionStep {
  step: number;
  title: string;
  content: string;
}

interface Solution {
  problemType: string;
  givenInfo: string[];
  steps: SolutionStep[];
  finalAnswer: string;
  concepts: string[];
  tips: string[];
}

export default function ImageSolvePage() {
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("imagesolve-model", "fast");
  const [subject, setSubject] = usePersistedState("imagesolve-subject", "math");
  const [detailLevel, setDetailLevel] = usePersistedState("imagesolve-detail", "standard");
  
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) handleFile(file);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please upload an image", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setSolution(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const solve = async () => {
    if (!image) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/tools/image-solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          subject,
          detailLevel,
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
      setSolution(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Could not solve problem", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const subjects = [
    { value: "math", label: "Math", icon: Calculator },
    { value: "physics", label: "Physics", icon: Beaker },
    { value: "chemistry", label: "Chem", icon: Beaker },
  ];

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Camera className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Image to Solution</h1>
            <p className="text-xs text-gray-500">Snap a problem, get the answer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-xs text-violet-600 hover:underline">Writing</Link>
          <span className="px-2 py-1 bg-violet-50 text-violet-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />5 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-4">
        {/* Left - Image Area */}
        <div className="flex flex-col">
          {!image ? (
            /* Upload Area */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 rounded-3xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center ${
                dragActive 
                  ? "border-violet-500 bg-violet-50 scale-[1.02]" 
                  : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/50"
              }`}
            >
              <div className="text-center p-8">
                <div className="relative mx-auto mb-6 w-fit">
                  <Camera className="w-12 h-12 text-violet-600" />
                  <Sparkles className="w-5 h-5 text-amber-600 absolute -right-2 -bottom-1" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Problem Image</h2>
                <p className="text-gray-500 mb-4">Drag & drop, click to browse, or paste from clipboard</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                    <Upload className="w-3 h-3" /> Browse
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    <Clipboard className="w-3 h-3" /> Ctrl+V
                  </span>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            /* Image Preview */
            <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="relative flex-1 bg-gray-900 flex items-center justify-center p-4">
                <img src={image} alt="Problem" className="max-w-full max-h-full object-contain rounded-lg" />
                <button
                  onClick={() => { setImage(null); setSolution(null); }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Controls */}
              <div className="p-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    {subjects.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setSubject(s.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                          subject === s.value
                            ? "bg-white text-violet-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <s.icon className="w-3.5 h-3.5" />
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>
                
                <Button
                  onClick={solve}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 font-semibold"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Solving...</>
                  ) : (
                    <>Solve Problem</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right - Solution */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-600" />
              <span className="font-medium text-gray-900 text-sm">Solution</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {solution ? (
              <div className="space-y-5">
                {/* Problem Type */}
                <div className="p-4 bg-violet-50 rounded-2xl">
                  <p className="text-xs text-violet-600 font-medium mb-1">Problem Type</p>
                  <p className="text-lg font-bold text-violet-900">{solution.problemType}</p>
                </div>

                {/* Given Info */}
                {solution.givenInfo && solution.givenInfo.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Given Information</p>
                    <div className="space-y-1">
                      {solution.givenInfo.map((info, i) => (
                        <p key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2" />
                          {info}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps */}
                {solution.steps && solution.steps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-3">Step-by-Step Solution</p>
                    <div className="space-y-3">
                      {solution.steps.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {step.step}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="font-medium text-gray-900 text-sm mb-1">{step.title}</p>
                            <p className="text-sm text-gray-600">{step.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final Answer */}
                <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-xs font-medium text-green-600">Final Answer</p>
                  </div>
                  <p className="text-xl font-bold text-green-800">{solution.finalAnswer}</p>
                </div>

                {/* Concepts & Tips */}
                <div className="grid grid-cols-2 gap-3">
                  {solution.concepts && solution.concepts.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <p className="text-xs font-medium text-blue-600 mb-2">Concepts Used</p>
                      <div className="flex flex-wrap gap-1">
                        {solution.concepts.map((c, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {solution.tips && solution.tips.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <p className="text-xs font-medium text-amber-600 mb-2 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" /> Tips
                      </p>
                      {solution.tips.slice(0, 2).map((t, i) => (
                        <p key={i} className="text-[10px] text-amber-700">{t}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  {isLoading ? (
                    <>
                      <Camera className="w-10 h-10 text-violet-500 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-600 font-medium">Analyzing image...</p>
                      <p className="text-xs text-gray-400 mt-1">AI is working on your problem</p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-400">Solution will appear here</p>
                      <p className="text-xs text-gray-300 mt-1">Upload an image to get started</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
