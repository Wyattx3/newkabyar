"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { ContentInput } from "@/components/tools/content-input";
import { 
  FileAudio, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  Download,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Tag,
  List,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface Topic {
  title: string;
  content: string;
  keyTerms?: string[];
}

interface Definition {
  term: string;
  definition: string;
}

interface LectureNotes {
  title: string;
  subject?: string;
  overview: string;
  topics: Topic[];
  keyPoints: string[];
  definitions: Definition[];
  questions: string[];
}

const noteStyleOptions = [
  { value: "detailed", label: "Detailed", icon: FileText, desc: "Comprehensive notes" },
  { value: "summary", label: "Summary", icon: List, desc: "Key points only" },
  { value: "bullet", label: "Bullets", icon: Tag, desc: "Quick reference" },
];

export default function LectureOrganizerPage() {
  const [transcript, setTranscript] = usePersistedState("lecture-transcript", "");
  const [subject, setSubject] = usePersistedState("lecture-subject", "");
  const [noteStyle, setNoteStyle] = usePersistedState("lecture-style", "detailed");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("lecture-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<LectureNotes | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "topics" | "definitions" | "questions">("overview");
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleOrganize = async () => {
    if (transcript.trim().length < 100) {
      toast({ title: "Transcript must be at least 100 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setNotes(null);

    try {
      const response = await fetch("/api/tools/lecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          subject: subject || undefined,
          noteStyle,
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
      setNotes(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const exportNotes = () => {
    if (!notes) return;
    
    let text = `# ${notes.title}\n\n`;
    if (notes.subject) text += `**Subject:** ${notes.subject}\n\n`;
    text += `## Overview\n${notes.overview}\n\n`;
    
    if (notes.keyPoints.length > 0) {
      text += `## Key Points\n`;
      notes.keyPoints.forEach(p => text += `- ${p}\n`);
      text += `\n`;
    }
    
    if (notes.topics.length > 0) {
      text += `## Topics\n\n`;
      notes.topics.forEach(topic => {
        text += `### ${topic.title}\n${topic.content}\n\n`;
      });
    }
    
    if (notes.definitions.length > 0) {
      text += `## Definitions\n`;
      notes.definitions.forEach(d => text += `- **${d.term}:** ${d.definition}\n`);
      text += `\n`;
    }
    
    if (notes.questions.length > 0) {
      text += `## Potential Exam Questions\n`;
      notes.questions.forEach((q, i) => text += `${i + 1}. ${q}\n`);
    }
    
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notes.title.replace(/\s+/g, "_")}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyNotes = () => {
    if (!notes) return;
    const text = `${notes.title}\n\n${notes.overview}\n\nKey Points:\n${notes.keyPoints.map(p => `• ${p}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileAudio className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Lecture Organizer</h1>
            <p className="text-xs text-gray-500">Transform transcripts into notes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/media" className="text-xs text-purple-600 hover:underline">Media</Link>
          <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />5 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!notes ? (
          /* Input View */
          <div className="h-full grid lg:grid-cols-[1fr_280px] gap-4">
            {/* Transcript Input */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-900 text-sm">Lecture Transcript</span>
                </div>
                <span className="text-xs text-purple-500">{transcript.split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <div className="flex-1 p-4">
                <ContentInput
                  value={transcript}
                  onChange={setTranscript}
                  placeholder="Paste your lecture transcript, upload a PDF, or notes here..."
                  minHeight="300px"
                  color="purple"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <label className="text-xs font-medium text-gray-500 mb-2 block">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Biology, Economics"
                  className="rounded-xl"
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <label className="text-xs font-medium text-gray-500 mb-3 block">Note Style</label>
                <div className="space-y-2">
                  {noteStyleOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setNoteStyle(s.value)}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                        noteStyle === s.value
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      <s.icon className="w-4 h-4" />
                      <div>
                        <span className="text-sm font-medium block">{s.label}</span>
                        <span className="text-[10px] text-gray-400">{s.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              </div>

              <Button
                onClick={handleOrganize}
                disabled={isLoading || transcript.trim().length < 100}
                className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 font-semibold"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Organizing...</>
                ) : (
                  <><BookOpen className="w-5 h-5 mr-2" />Organize Notes</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Notes View */
          <div className="h-full flex gap-4">
            {/* Navigation */}
            <div className="w-48 shrink-0 space-y-2">
              {[
                { key: "overview", label: "Overview", icon: BookOpen },
                { key: "topics", label: "Topics", icon: Tag },
                { key: "definitions", label: "Definitions", icon: FileText },
                { key: "questions", label: "Exam Questions", icon: HelpCircle },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key as any)}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl transition-all text-left ${
                    activeSection === item.key
                      ? "bg-purple-100 text-purple-700"
                      : "bg-white hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto ${activeSection === item.key ? "text-purple-400" : "text-gray-300"}`} />
                </button>
              ))}

              <div className="pt-4 space-y-2">
                <Button onClick={exportNotes} variant="outline" className="w-full rounded-xl">
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
                <Button onClick={copyNotes} variant="outline" className="w-full rounded-xl">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button onClick={() => setNotes(null)} variant="ghost" className="w-full rounded-xl text-gray-500">
                  New Notes
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 bg-purple-50">
                <h2 className="font-bold text-purple-900">{notes.title}</h2>
                {notes.subject && <p className="text-xs text-purple-600">{notes.subject}</p>}
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {activeSection === "overview" && (
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">{notes.overview}</p>
                    
                    {notes.keyPoints.length > 0 && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />Key Takeaways
                        </h3>
                        <ul className="space-y-2">
                          {notes.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                              <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "topics" && (
                  <div className="space-y-4">
                    {notes.topics.map((topic, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-medium text-gray-900 mb-2">{topic.title}</h4>
                        <p className="text-sm text-gray-600">{topic.content}</p>
                        {topic.keyTerms && topic.keyTerms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {topic.keyTerms.map((term, j) => (
                              <span key={j} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{term}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === "definitions" && (
                  <div className="space-y-3">
                    {notes.definitions.map((def, i) => (
                      <div key={i} className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <span className="font-semibold text-blue-900">{def.term}:</span>
                        <span className="text-blue-700 ml-2">{def.definition}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === "questions" && (
                  <div className="space-y-3">
                    {notes.questions.map((q, i) => (
                      <div key={i} className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-green-200 text-green-800 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                        <p className="text-green-800">{q}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
