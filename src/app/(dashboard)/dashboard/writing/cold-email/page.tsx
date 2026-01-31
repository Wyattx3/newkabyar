"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Mail, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  Send,
  User,
  Target,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface EmailResult {
  subject: string;
  body: string;
  tips?: string[];
}

const tones = [
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "friendly", label: "Friendly", emoji: "😊" },
  { value: "persuasive", label: "Persuasive", emoji: "🎯" },
  { value: "formal", label: "Formal", emoji: "📋" },
];

export default function ColdEmailPage() {
  const [purpose, setPurpose] = usePersistedState("coldemail-purpose", "");
  const [recipient, setRecipient] = usePersistedState("coldemail-recipient", "");
  const [background, setBackground] = usePersistedState("coldemail-background", "");
  const [ask, setAsk] = usePersistedState("coldemail-ask", "");
  const [tone, setTone] = usePersistedState("coldemail-tone", "professional");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("coldemail-model", "fast");
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (purpose.length < 10 || recipient.length < 5 || ask.length < 10) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          recipient,
          background,
          ask,
          tone,
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
      setStep(3);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyText = (text: string, type: "subject" | "body") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Mail className="w-7 h-7 text-rose-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Cold Email Generator</h1>
            <p className="text-xs text-gray-500">Create effective outreach emails</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/writing" className="text-xs text-pink-600 hover:underline">Writing</Link>
          <span className="px-2 py-1 bg-pink-50 text-pink-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />3 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex gap-4">
          {/* Left - Form */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Steps */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              {[1, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                    step >= s
                      ? "bg-pink-100 text-pink-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs font-bold">{s}</span>
                  <span className="text-xs font-medium">{s === 1 ? "Details" : "Tone"}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {step === 1 && (
                <div className="space-y-5 max-w-lg">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Target className="w-4 h-4 text-pink-500" /> Purpose *
                    </label>
                    <Input
                      placeholder="e.g., Request for internship, Partnership inquiry"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 text-pink-500" /> Recipient *
                    </label>
                    <Input
                      placeholder="e.g., HR Manager at Google, CEO of StartupXYZ"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Your Background</label>
                    <Textarea
                      placeholder="Brief intro about yourself and relevant experience..."
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className="min-h-[80px] rounded-xl resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Your Ask *</label>
                    <Textarea
                      placeholder="What do you want from this email? Be specific..."
                      value={ask}
                      onChange={(e) => setAsk(e.target.value)}
                      className="min-h-[80px] rounded-xl resize-none"
                    />
                  </div>
                  
                  <Button
                    onClick={() => setStep(2)}
                    disabled={purpose.length < 10 || recipient.length < 5 || ask.length < 10}
                    className="w-full h-12 rounded-xl bg-pink-600 hover:bg-pink-700"
                  >
                    Continue <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5 max-w-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Select Tone</label>
                    <div className="grid grid-cols-2 gap-3">
                      {tones.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            tone === t.value
                              ? "border-pink-500 bg-pink-50"
                              : "border-gray-100 hover:border-pink-200"
                          }`}
                        >
                          <span className="text-2xl mb-2 block">{t.emoji}</span>
                          <span className="font-medium text-gray-900">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl">
                    <label className="text-xs font-medium text-gray-500 mb-2 block">AI Model</label>
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
                      Back
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={isLoading}
                      className="flex-1 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <><Send className="w-4 h-4 mr-2" /> Generate</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right - Result */}
          <div className="w-[450px] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-rose-50">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-pink-600" />
                <span className="font-medium text-gray-900 text-sm">Generated Email</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {result ? (
                <div className="space-y-4">
                  {/* Subject */}
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Subject Line</span>
                      <button
                        onClick={() => copyText(result.subject, "subject")}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {copied === "subject" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                    <p className="font-medium text-gray-900">{result.subject}</p>
                  </div>

                  {/* Body */}
                  <div className="p-4 bg-white border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-500">Email Body</span>
                      <button
                        onClick={() => copyText(result.body, "body")}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {copied === "body" ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{result.body}</p>
                  </div>

                  {/* Tips */}
                  {result.tips && result.tips.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-800">Pro Tips</span>
                      </div>
                      <ul className="space-y-1">
                        {result.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    {isLoading ? (
                      <>
                        <Mail className="w-10 h-10 text-pink-500 mx-auto mb-4 animate-pulse" />
                        <p className="text-gray-600 font-medium">Crafting your email...</p>
                        <p className="text-xs text-gray-400 mt-1">Using {tone} tone</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <Mail className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400">Your email will appear here</p>
                        <p className="text-xs text-gray-300 mt-1">Fill in the form and generate</p>
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
