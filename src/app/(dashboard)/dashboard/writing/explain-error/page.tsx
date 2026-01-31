"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Bug, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  Code,
  Zap,
  Shield,
  Terminal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface ErrorExplanation {
  errorType: string;
  summary: string;
  cause: string;
  solution: string[];
  codeExample?: string;
  prevention: string[];
  relatedErrors?: string[];
}

export default function ExplainErrorPage() {
  const [errorText, setErrorText] = usePersistedState("error-text", "");
  const [context, setContext] = usePersistedState("error-context", "");
  const [language, setLanguage] = usePersistedState("error-lang", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("error-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<ErrorExplanation | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleExplain = async () => {
    if (errorText.trim().length < 10) {
      toast({ title: "Paste an error message", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setExplanation(null);

    try {
      const response = await fetch("/api/tools/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: errorText,
          context,
          programmingLanguage: language,
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
      setExplanation(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyCode = () => {
    if (explanation?.codeExample) {
      navigator.clipboard.writeText(explanation.codeExample);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bug className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Explain Error</h1>
            <p className="text-xs text-gray-500">Get help from a senior developer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-xs text-red-600 hover:underline">Writing</Link>
          <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />3 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-4">
        {/* Left - Input */}
        <div className="flex flex-col gap-4">
          {/* Error Input */}
          <div className="flex-1 bg-gray-900 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-gray-800 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-gray-300">Error / Stack Trace</span>
            </div>
            <Textarea
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              placeholder="Paste your error message or stack trace here...

Example:
TypeError: Cannot read property 'map' of undefined
    at UserList (UserList.js:15:23)
    at renderWithHooks (react-dom.development.js:14985:18)"
              className="flex-1 resize-none border-0 bg-transparent text-green-400 font-mono text-sm p-4 focus:ring-0 placeholder:text-gray-600"
            />
          </div>

          {/* Context */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Language/Framework</label>
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g., Python, React, Node.js"
                  className="h-10 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Additional Context</label>
                <Input
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="What were you trying to do?"
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              <Button
                onClick={handleExplain}
                disabled={isLoading || errorText.trim().length < 10}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Bug className="w-4 h-4 mr-2" />Explain</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Right - Explanation */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          {explanation ? (
            <>
              <div className="px-5 py-4 border-b border-gray-100 bg-red-50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-bold text-red-900">{explanation.errorType}</span>
                </div>
                <p className="text-sm text-red-700">{explanation.summary}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Cause */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Why This Happened
                  </h3>
                  <p className="text-sm text-gray-700">{explanation.cause}</p>
                </div>

                {/* Solution */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-500" /> How to Fix
                  </h3>
                  <ol className="space-y-2">
                    {explanation.solution.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Code Example */}
                {explanation.codeExample && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Code className="w-4 h-4 text-blue-500" /> Fixed Code
                      </h3>
                      <button onClick={copyCode} className="p-1 hover:bg-gray-100 rounded">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    <pre className="p-4 bg-gray-900 rounded-xl text-green-400 text-sm font-mono overflow-x-auto">
                      {explanation.codeExample}
                    </pre>
                  </div>
                )}

                {/* Prevention */}
                <div className="p-4 bg-blue-50 rounded-xl">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Prevent This in Future
                  </h3>
                  <ul className="space-y-1">
                    {explanation.prevention.map((tip, i) => (
                      <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 mt-1 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              {isLoading ? (
                <div className="text-center">
                  <Bug className="w-10 h-10 text-red-500 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-600 font-medium">Analyzing error...</p>
                  <p className="text-xs text-gray-400 mt-1">A senior dev is reviewing</p>
                </div>
              ) : (
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Bug className="w-8 h-8 text-gray-300" />
                  </div>
                  <h2 className="font-bold text-gray-900 mb-2">Paste an Error</h2>
                  <p className="text-gray-500 text-sm">
                    Copy any error message, stack trace, or exception and get a clear explanation with solutions
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
