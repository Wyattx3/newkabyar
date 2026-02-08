"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Loader2, Copy, Check, FileText, Trash2,
  ChevronDown, ArrowRight, RefreshCw, Download,
  ClipboardPaste, BookOpen, Eye, EyeOff
} from "lucide-react";

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

const LEVELS = [
  { value: "academic", label: "Academic", desc: "Scholarly writing", icon: "🎓" },
  { value: "professional", label: "Professional", desc: "Business context", icon: "💼" },
  { value: "sophisticated", label: "Sophisticated", desc: "Elevated vocabulary", icon: "✨" },
];

export default function VocabularyUpgraderPage() {
  const [mounted, setMounted] = useState(false);

  // Form states
  const [text, setText] = usePersistedState("vocab-text", "");
  const [level, setLevel] = usePersistedState("vocab-level", "academic");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("vocab-model", "fast");

  // Result states
  const [result, setResult] = useState<UpgradeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);

  // UI states
  const [showLevel, setShowLevel] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const wordCount = (str: string) => str.split(/\s+/).filter(Boolean).length;

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

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.upgradedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInputToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const pasteText = await navigator.clipboard.readText();
      setText(pasteText);
      setResult(null);
    } catch {
      toast({ title: "Failed to paste", variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportResult = () => {
    if (!result) return;
    const content = `Original:\n${text}\n\n---\n\nUpgraded (${level}):\n${result.upgradedText}\n\n---\n\nReplacements:\n${result.replacements.map(r => `${r.original} → ${r.upgraded} (${r.reason})`).join("\n")}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocab_upgraded_${Date.now()}.txt`;
    a.click();
  };

  const reset = () => {
    setText("");
    setResult(null);
  };

  // Build highlighted upgraded text with replacements marked
  const buildHighlightedHtml = (): string => {
    if (!result || !result.replacements || result.replacements.length === 0) {
      return result?.upgradedText || "";
    }

    let html = result.upgradedText;
    // Sort by length descending to avoid partial replacements
    const sorted = [...result.replacements].sort((a, b) => b.upgraded.length - a.upgraded.length);

    for (const rep of sorted) {
      const escaped = rep.upgraded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escaped})`, "gi");
      html = html.replace(regex, (match) => {
        return `<mark class="bg-blue-100 text-blue-800 px-0.5 rounded cursor-help" title="${rep.original} → ${rep.upgraded}: ${rep.reason}">${match}</mark>`;
      });
    }

    return html;
  };


  if (!mounted) return null;

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Minimal Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Vocabulary Upgrader</h1>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            {/* Level Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLevel(!showLevel)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span>{LEVELS.find(l => l.value === level)?.icon}</span>
                <span className="font-medium">{LEVELS.find(l => l.value === level)?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {showLevel && (
                <div className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 min-w-[200px]">
                  {LEVELS.map(l => (
                    <button
                      key={l.value}
                      onClick={() => { setLevel(l.value); setShowLevel(false); }}
                      className={cn(
                        "w-full p-2.5 text-left hover:bg-gray-50 transition-colors",
                        level === l.value && "bg-blue-50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span>{l.icon}</span>
                        <span className={cn("text-sm font-medium", level === l.value && "text-blue-600")}>{l.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">{l.desc}</p>
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
            onClick={handleUpgrade}
            disabled={isLoading || text.trim().length < 20}
            className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium text-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GraduationCap className="w-4 h-4 mr-1.5" /> Upgrade</>}
          </Button>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left - Input */}
        <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Original Text</span>
              {text && (
                <span className="text-xs text-gray-400">{wordCount(text)} words</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {text && (
                <button
                  onClick={copyInputToClipboard}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Copy input"
                >
                  {copiedInput ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Upload file"
              >
                <FileText className="w-4 h-4" />
              </button>
              <input ref={fileInputRef} type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
              {text && (
                <button
                  onClick={reset}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto relative">
            {!text && (
              <button
                onClick={handlePaste}
                className="absolute inset-0 flex items-center justify-center z-10 bg-white hover:bg-gray-50 transition-colors group"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <ClipboardPaste className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-500 font-medium">Click to paste</span>
                </div>
              </button>
            )}
            <Textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); }}
              placeholder="Enter text you want to upgrade to more sophisticated vocabulary..."
              className="h-full resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none text-[15px] leading-relaxed text-gray-900 placeholder:text-gray-400 bg-transparent transition-none"
              style={{ transition: 'none' }}
            />
          </div>
        </div>

        {/* Right - Output */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Upgraded Text</span>
              {result && (
                <>
                  <span className="text-xs text-gray-400">{wordCount(result.upgradedText)} words</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {result.replacements.length} upgrades
                  </span>
                </>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHighlights(!showHighlights)}
                  className={cn("p-1.5 rounded-lg transition-colors", showHighlights ? "bg-blue-50 text-blue-600" : "hover:bg-gray-100 text-gray-500")}
                  title={showHighlights ? "Hide highlights" : "Show highlights"}
                >
                  {showHighlights ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Copy"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={exportResult}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors disabled:opacity-50"
                  title="Re-upgrade"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Upgraded Text Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              {result ? (
                <div className="space-y-0">
                  {/* Highlighted Text */}
                  {showHighlights && result.replacements.length > 0 ? (
                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 pb-3 mb-4 border-b border-gray-100">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Upgraded words</span>
                        <span className="text-gray-400">Hover to see original</span>
                      </div>
                      <div
                        className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: buildHighlightedHtml() }}
                      />
                    </div>
                  ) : (
                    <p className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">{result.upgradedText}</p>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  {isLoading ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
                      <p className="text-sm text-gray-600 font-medium">Upgrading vocabulary...</p>
                      <p className="text-xs text-gray-400 mt-1">Elevating your writing style</p>
                    </div>
                  ) : (
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                        <GraduationCap className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Upgraded text will appear here</p>
                      <p className="text-xs text-gray-400 mt-2">Replaced words will be highlighted in <span className="text-blue-600 font-medium">blue</span></p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Replacements Panel - Bottom Section */}
            {result && result.replacements.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 shrink-0">
                <div className="px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Word Replacements ({result.replacements.length})</span>
                  </div>
                </div>
                <div className="px-6 pb-4 max-h-[180px] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.replacements.map((r, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 group hover:border-blue-200 transition-colors min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-500 line-through truncate flex-shrink-0 max-w-[80px]">{r.original}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-sm text-blue-700 font-medium truncate min-w-0 flex-1">{r.upgraded}</span>
                        </div>
                        <div className="mt-1.5 text-xs text-gray-400 truncate" title={r.reason}>
                          {r.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
