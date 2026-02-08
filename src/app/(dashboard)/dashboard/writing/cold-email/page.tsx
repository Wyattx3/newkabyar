"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import {
  Mail, Loader2, Copy, Check, Send, Lightbulb,
  ChevronDown, RefreshCw, Download, Trash2
} from "lucide-react";

interface EmailResult {
  subject: string;
  body: string;
  tips?: string[];
}

const TONES = [
  { value: "professional", label: "Professional", icon: "💼" },
  { value: "friendly", label: "Friendly", icon: "😊" },
  { value: "persuasive", label: "Persuasive", icon: "🎯" },
  { value: "formal", label: "Formal", icon: "📋" },
];

export default function ColdEmailPage() {
  const [mounted, setMounted] = useState(false);

  // Form states
  const [purpose, setPurpose] = usePersistedState("coldemail-purpose", "");
  const [recipient, setRecipient] = usePersistedState("coldemail-recipient", "");
  const [background, setBackground] = usePersistedState("coldemail-background", "");
  const [ask, setAsk] = usePersistedState("coldemail-ask", "");
  const [tone, setTone] = usePersistedState("coldemail-tone", "professional");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("coldemail-model", "fast");

  // Result states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  // UI states
  const [showTone, setShowTone] = useState(false);

  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  // Fit view
  useEffect(() => {
    const parent = document.querySelector('main > div') as HTMLElement;
    const html = document.documentElement;
    const body = document.body;
    const origParentClass = parent?.className;
    html.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    if (parent) {
      parent.classList.remove('overflow-y-auto');
      parent.classList.add('overflow-hidden', 'p-0');
      parent.style.setProperty('overflow', 'hidden', 'important');
      parent.style.setProperty('padding', '0', 'important');
    }
    return () => {
      html.style.overflow = '';
      body.style.overflow = '';
      if (parent && origParentClass) {
        parent.className = origParentClass;
        parent.style.removeProperty('overflow');
        parent.style.removeProperty('padding');
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (purpose.length < 10 || recipient.length < 5 || ask.length < 10) {
      toast({ title: "Fill in required fields (Purpose, Recipient, Ask)", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose, recipient, background, ask, tone,
          model: selectedModel, language: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json();
          toast({
            title: "Insufficient Credits",
            description: `You need ${data.creditsNeeded} credits but have ${data.creditsRemaining} remaining.`,
            variant: "destructive",
          });
          return;
        }
        const errorData = await response.json().catch(() => ({ error: "Failed" }));
        const errMsg = typeof errorData.error === "string" ? errorData.error : "Something went wrong";
        toast({ title: "Error", description: errMsg, variant: "destructive" });
        return;
      }

      const data = await response.json();
      setResult(data);
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyText = (text: string, type: "subject" | "body" | "all") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    if (!result) return;
    const full = `Subject: ${result.subject}\n\n${result.body}`;
    copyText(full, "all");
  };

  const exportEmail = () => {
    if (!result) return;
    const content = `Subject: ${result.subject}\n\n${result.body}\n\n---\nTone: ${tone}\nPurpose: ${purpose}\nRecipient: ${recipient}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cold_email_${Date.now()}.txt`;
    a.click();
  };

  const reset = () => {
    setPurpose("");
    setRecipient("");
    setBackground("");
    setAsk("");
    setResult(null);
  };

  const canGenerate = purpose.length >= 10 && recipient.length >= 5 && ask.length >= 10;

  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Minimal Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Cold Email Generator</h1>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            {/* Tone Selector */}
            <div className="relative">
              <button
                onClick={() => setShowTone(!showTone)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span>{TONES.find(t => t.value === tone)?.icon}</span>
                <span className="font-medium">{TONES.find(t => t.value === tone)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showTone && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-[180px]">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => { setTone(t.value); setShowTone(false); }}
                      className={cn(
                        "w-full p-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-2",
                        tone === t.value && "bg-blue-50"
                      )}
                    >
                      <span>{t.icon}</span>
                      <span className={cn("text-sm font-medium", tone === t.value && "text-blue-600")}>{t.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="px-2">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !canGenerate}
            className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" /> Generate</>}
          </Button>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Form */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <span className="text-sm font-medium text-gray-700">Email Details</span>
            <div className="flex items-center gap-1">
              {(purpose || recipient || ask) && (
                <button
                  onClick={reset}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-lg space-y-5">
              {/* Purpose */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Purpose <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g., Request for internship, Partnership inquiry"
                  value={purpose}
                  onChange={(e) => { setPurpose(e.target.value); setResult(null); }}
                  className="h-11 rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none transition-none"
                  style={{ transition: 'none' }}
                />
                <p className="text-xs text-gray-400 mt-1">What is the main goal of this email?</p>
              </div>

              {/* Recipient */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Recipient <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g., HR Manager at Google, CEO of StartupXYZ"
                  value={recipient}
                  onChange={(e) => { setRecipient(e.target.value); setResult(null); }}
                  className="h-11 rounded-lg border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none transition-none"
                  style={{ transition: 'none' }}
                />
                <p className="text-xs text-gray-400 mt-1">Who are you writing to?</p>
              </div>

              {/* Background */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Your Background <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Textarea
                  placeholder="Brief intro about yourself and relevant experience..."
                  value={background}
                  onChange={(e) => { setBackground(e.target.value); setResult(null); }}
                  className="min-h-[80px] rounded-lg resize-none border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none transition-none"
                  style={{ transition: 'none' }}
                />
              </div>

              {/* Ask */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Your Ask <span className="text-red-400">*</span>
                </label>
                <Textarea
                  placeholder="What do you want from this email? Be specific..."
                  value={ask}
                  onChange={(e) => { setAsk(e.target.value); setResult(null); }}
                  className="min-h-[80px] rounded-lg resize-none border-gray-300 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:outline-none transition-none"
                  style={{ transition: 'none' }}
                />
                <p className="text-xs text-gray-400 mt-1">Be specific about what you&apos;re requesting</p>
              </div>

              {/* Validation hint */}
              {!canGenerate && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500">
                    Fill in Purpose (10+ chars), Recipient (5+ chars), and Ask (10+ chars) to generate
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right - Output */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Generated Email</span>
              {result && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  Ready
                </span>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <button
                  onClick={copyAll}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Copy all"
                >
                  {copied === "all" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={exportEmail}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors disabled:opacity-50"
                  title="Regenerate"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {result ? (
              <div className="space-y-5 max-w-lg mx-auto">
                {/* Subject Line */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject Line</span>
                    <button
                      onClick={() => copyText(result.subject, "subject")}
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copied === "subject" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-[15px] font-medium text-gray-900">{result.subject}</p>
                </div>

                {/* Email Body */}
                <div className="p-5 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Body</span>
                    <button
                      onClick={() => copyText(result.body, "body")}
                      className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {copied === "body" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-[15px] text-gray-700 whitespace-pre-wrap leading-relaxed">{result.body}</p>
                </div>

                {/* Tips */}
                {result.tips && result.tips.length > 0 && (
                  <div className="p-5 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Pro Tips</span>
                    </div>
                    <ul className="space-y-2">
                      {result.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-600 font-medium">Crafting your email...</p>
                    <p className="text-xs text-gray-400 mt-1">Using {tone} tone</p>
                  </div>
                ) : (
                  <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Generated email will appear here</p>
                    <p className="text-xs text-gray-400 mt-2">Fill in the details and click Generate</p>
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
