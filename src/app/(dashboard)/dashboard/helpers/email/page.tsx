"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import {
  Mail, Loader2, Sparkles, Copy, Check, Trash2, 
  X, History, MessageSquare, Send, RefreshCw,
  Zap, User, Building2, Target, ChevronDown, Download,
  PenTool, Wand2, RotateCcw, FileText, Star, Eye, ArrowRight, Lightbulb
} from "lucide-react";

interface EmailHistory {
  id: string;
  subject: string;
  purpose: string;
  timestamp: number;
}

interface EmailVariation {
  subject: string;
  body: string;
  tone: string;
}

interface EmailResult {
  subject: string;
  body: string;
  tips?: string[];
  variations?: EmailVariation[];
  callToAction?: string;
}

const EMAIL_PURPOSES = [
  { value: "intro", label: "Introduction", desc: "First contact" },
  { value: "followup", label: "Follow-up", desc: "After meeting" },
  { value: "pitch", label: "Sales Pitch", desc: "Offer services" },
  { value: "networking", label: "Networking", desc: "Build connection" },
  { value: "job", label: "Job Application", desc: "Career opportunity" },
  { value: "partnership", label: "Partnership", desc: "Collaboration" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "persuasive", label: "Persuasive" },
  { value: "urgent", label: "Urgent" },
];

const LENGTHS = [
  { value: "short", label: "Short", desc: "~50 words" },
  { value: "medium", label: "Medium", desc: "~100 words" },
  { value: "detailed", label: "Detailed", desc: "~200 words" },
];

export default function ColdEmailGeneratorPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [recipientName, setRecipientName] = usePersistedState("email-recipient", "");
  const [recipientRole, setRecipientRole] = usePersistedState("email-role", "");
  const [company, setCompany] = usePersistedState("email-company", "");
  const [yourName, setYourName] = usePersistedState("email-yourname", "");
  const [yourRole, setYourRole] = usePersistedState("email-yourrole", "");
  const [context, setContext] = usePersistedState("email-context", "");
  const [purpose, setPurpose] = usePersistedState("email-purpose", "intro");
  const [tone, setTone] = usePersistedState("email-tone", "professional");
  const [length, setLength] = usePersistedState("email-length", "medium");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("email-model", "fast");
  
  // Result states
  const [result, setResult] = useState<EmailResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  
  // UI states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeVariation, setActiveVariation] = useState(0);
  const [showTips, setShowTips] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  
  // Feature states
  const [history, setHistory] = usePersistedState<EmailHistory[]>("email-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [savedTemplates, setSavedTemplates] = usePersistedState<EmailResult[]>("email-templates", []);
  const [showTemplates, setShowTemplates] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleGenerate = async () => {
    if (!context.trim()) {
      toast({ title: "Please describe what you want to communicate", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);
    setIsEditing(false);

    try {
      const response = await fetch("/api/tools/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientRole,
          company,
          yourName,
          yourRole,
          context,
          purpose,
          tone,
          length,
          model: selectedModel,
          uiLanguage: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const data = await response.json();
          toast({
            title: "Insufficient Credits",
            description: `Need ${data.creditsNeeded} credits, have ${data.creditsRemaining}`,
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed");
      }

      const data = await response.json();
      setResult(data);

      // Save to history
      const historyItem: EmailHistory = {
        id: Date.now().toString(),
        subject: data.subject?.substring(0, 40) || "Email",
        purpose,
        timestamp: Date.now(),
      };
      setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new Event("credits-updated"));
    }
  };

  const handleRegenerate = async () => {
    await handleGenerate();
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a professional email writing expert. Help users craft effective cold emails. Current context: ${context.substring(0, 200)}` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
          feature: "answer",
          model: "fast",
          language: aiLanguage || "en",
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      let content = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      setChatMessages(prev => [...prev, { role: "assistant", content }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, couldn't process your request." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyEmail = () => {
    if (!result) return;
    const displayBody = isEditing ? editedBody : result.body;
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${displayBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySubject = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const saveAsTemplate = () => {
    if (!result) return;
    setSavedTemplates(prev => [...prev, { ...result, body: isEditing ? editedBody : result.body }]);
    toast({ title: "Template saved!" });
  };

  const exportEmail = () => {
    if (!result) return;
    const displayBody = isEditing ? editedBody : result.body;
    const content = `Subject: ${result.subject}\n\n${displayBody}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email_${Date.now()}.txt`;
    a.click();
  };

  const startEditing = () => {
    if (result) {
      setEditedBody(result.body);
      setIsEditing(true);
    }
  };

  const reset = () => {
    setRecipientName("");
    setRecipientRole("");
    setCompany("");
    setContext("");
    setResult(null);
    setChatMessages([]);
  };

  if (!mounted) return null;

  const displayBody = isEditing ? editedBody : result?.body || "";

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">Cold Email Generator</h1>
            <p className="text-xs text-gray-500">Create professional outreach emails</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowTemplates(!showTemplates)} className={cn("h-8 rounded-lg", showTemplates && "bg-blue-50 text-blue-600")}>
            <FileText className="w-4 h-4" />
            {savedTemplates.length > 0 && <span className="ml-1 text-xs">{savedTemplates.length}</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className={cn("h-8 rounded-lg", showHistory && "bg-blue-50 text-blue-600")}>
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)} className={cn("h-8 rounded-lg", showChat && "bg-blue-50 text-blue-600")}>
            <MessageSquare className="w-4 h-4" />
          </Button>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> 3 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input Form */}
        <div className="w-[45%] flex flex-col border-r border-gray-100 overflow-y-auto">
          {/* Recipient Info */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">Recipient</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Name (e.g., John)"
                className="rounded-xl border-gray-200"
              />
              <Input
                value={recipientRole}
                onChange={(e) => setRecipientRole(e.target.value)}
                placeholder="Role (e.g., CEO)"
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company name"
                className="rounded-xl border-gray-200"
              />
            </div>
          </div>

          {/* Your Info */}
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="p-4 bg-white border-b border-gray-100 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">Your Info</span>
              <span className="text-xs text-gray-400">(optional)</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showAdvanced && "rotate-180")} />
          </button>
          {showAdvanced && (
            <div className="p-4 bg-white border-b border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-xl border-gray-200"
                />
                <Input
                  value={yourRole}
                  onChange={(e) => setYourRole(e.target.value)}
                  placeholder="Your role"
                  className="rounded-xl border-gray-200"
                />
              </div>
            </div>
          )}

          {/* Purpose */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">Email Purpose</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {EMAIL_PURPOSES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPurpose(p.value)}
                  className={cn(
                    "p-2 rounded-xl border text-left transition-all",
                    purpose === p.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <p className={cn("text-xs font-medium", purpose === p.value ? "text-blue-700" : "text-gray-900")}>{p.label}</p>
                  <p className="text-[10px] text-gray-500">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Message Context */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <PenTool className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">What do you want to say?</span>
            </div>
            <Textarea
              value={context}
              onChange={(e) => { setContext(e.target.value); setResult(null); }}
              placeholder="Describe the main point of your email...

Example: I want to introduce our AI tool that helps marketing teams save 10 hours per week on content creation. I'd like to schedule a demo."
              className="min-h-[120px] resize-none border-gray-200 rounded-xl"
            />
          </div>

          {/* Tone & Length */}
          <div className="p-4 bg-white border-b border-gray-100">
            <div className="flex gap-6">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2">Tone</p>
                <div className="flex flex-wrap gap-1">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={cn(
                        "px-2 py-1 text-xs rounded-lg border transition-all",
                        tone === t.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Length</p>
                <div className="flex gap-1">
                  {LENGTHS.map(l => (
                    <button
                      key={l.value}
                      onClick={() => setLength(l.value)}
                      className={cn(
                        "px-2 py-1 text-xs rounded-lg border transition-all",
                        length === l.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Model & Actions */}
          <div className="p-4 bg-white border-t border-gray-100 mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              {(recipientName || company || context) && (
                <Button variant="ghost" size="sm" onClick={reset} className="h-8 px-2 rounded-lg text-gray-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <Button onClick={handleGenerate} disabled={isLoading || !context.trim()} className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4 mr-2" /> Generate</>}
            </Button>
          </div>
        </div>

        {/* Right - Results */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Generated Email</span>
              {result?.variations && result.variations.length > 0 && (
                <div className="flex gap-1 ml-2">
                  {[{ subject: result.subject, body: result.body, tone: tone }, ...result.variations].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveVariation(i)}
                      className={cn(
                        "w-6 h-6 text-xs rounded-lg border",
                        activeVariation === i
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowTips(!showTips)} className={cn("h-7 px-2 rounded-lg", showTips && "bg-blue-50 text-blue-600")}>
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={startEditing} className={cn("h-7 px-2 rounded-lg", isEditing && "bg-blue-50 text-blue-600")}>
                  <PenTool className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={saveAsTemplate} className="h-7 px-2 rounded-lg">
                  <Star className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={copyEmail} className="h-7 px-2 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={exportEmail} className="h-7 px-2 rounded-lg">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRegenerate} className="h-7 px-2 rounded-lg">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {result ? (
              <div className="p-6 space-y-4">
                {/* Subject Line */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-600 font-medium">Subject Line</span>
                    <button onClick={copySubject} className="text-blue-600 hover:text-blue-700">
                      {copiedSubject ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{result.subject}</p>
                </div>

                {/* Email Body */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 font-medium">Email Body</span>
                    {isEditing && (
                      <button onClick={() => setIsEditing(false)} className="text-xs text-blue-600 hover:text-blue-700">
                        Done Editing
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="min-h-[200px] bg-white border-gray-200 rounded-xl"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{displayBody}</p>
                  )}
                </div>

                {/* Call to Action */}
                {result.callToAction && (
                  <div className="p-3 bg-green-50 rounded-xl border border-green-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-700">{result.callToAction}</p>
                  </div>
                )}

                {/* Tips */}
                {showTips && result.tips && result.tips.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-800">Pro Tips</span>
                    </div>
                    <ul className="space-y-1">
                      {result.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                          <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={copyEmail} className="flex-1 rounded-xl">
                    <Copy className="w-4 h-4 mr-2" /> Copy Full Email
                  </Button>
                  <Button variant="outline" onClick={handleRegenerate} disabled={isLoading} className="flex-1 rounded-xl">
                    <RotateCcw className="w-4 h-4 mr-2" /> Regenerate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                {isLoading ? (
                  <div className="text-center">
                    <Mail className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600 font-medium">Crafting your email...</p>
                    <p className="text-xs text-gray-400 mt-1">Making it personal and effective</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-400">Fill in details and click Generate</p>
                    <p className="text-xs text-gray-300 mt-1">Create professional cold emails</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Templates Panel */}
        {showTemplates && (
          <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">Saved Templates</span>
              <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {savedTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No templates saved</p>
                </div>
              ) : (
                savedTemplates.map((t, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-600 font-medium truncate flex-1">{t.subject}</span>
                      <button onClick={() => setSavedTemplates(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 ml-2">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{t.body.substring(0, 80)}...</p>
                    <button
                      onClick={() => { setResult(t); setShowTemplates(false); }}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Use Template
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="w-64 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">History</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No history yet</p>
              ) : (
                history.map(h => (
                  <div key={h.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-blue-600 font-medium">{h.purpose}</span>
                      <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{h.subject}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {showChat && (
          <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4">
              <span className="font-medium text-gray-900 text-sm">Email Assistant</span>
              <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Ask for email advice</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("max-w-[90%] p-3 rounded-2xl text-sm", msg.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-700")}>
                  {msg.content}
                </div>
              ))}
              {isChatLoading && <div className="bg-gray-100 p-3 rounded-2xl w-fit"><Loader2 className="w-4 h-4 animate-spin" /></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="How can I improve this?"
                  onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleChatSubmit} size="sm" className="rounded-xl px-3 bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
