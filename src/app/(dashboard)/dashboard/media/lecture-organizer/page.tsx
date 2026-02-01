"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import {
  FileText,
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
  ChevronRight,
  FolderPlus,
  Search,
  Star,
  Trash2,
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Brain,
  MessageSquare,
  Send,
  X,
  ChevronLeft,
  ChevronDown,
  Folder,
  File,
  Clock,
  Upload,
  Mic,
  Volume2,
  Shuffle,
  RotateCcw,
  Share2,
  Link as LinkIcon,
  Archive,
  Pin,
  Edit3,
  Save,
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

interface Flashcard {
  front: string;
  back: string;
}

interface LectureNotes {
  id: string;
  title: string;
  subject?: string;
  overview: string;
  topics: Topic[];
  keyPoints: string[];
  definitions: Definition[];
  questions: string[];
  flashcards?: Flashcard[];
  createdAt: number;
  updatedAt: number;
  folderId?: string;
  tags: string[];
  isPinned?: boolean;
  isStarred?: boolean;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function LectureOrganizerPage() {
  // Input state
  const [transcript, setTranscript] = usePersistedState("lecture-transcript", "");
  const [subject, setSubject] = usePersistedState("lecture-subject", "");
  const [noteStyle, setNoteStyle] = usePersistedState("lecture-style", "detailed");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("lecture-model", "fast");

  // Library state
  const [savedNotes, setSavedNotes] = usePersistedState<LectureNotes[]>("lecture-saved-notes", []);
  const [folders, setFolders] = usePersistedState<Folder[]>("lecture-folders", []);
  const [selectedNote, setSelectedNote] = useState<LectureNotes | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"library" | "create" | "note">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "topics" | "definitions" | "questions" | "flashcards">("overview");

  // Feature state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Filter notes
  const filteredNotes = savedNotes.filter((note) => {
    const matchesSearch = searchQuery
      ? note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    const matchesFolder = selectedFolderId ? note.folderId === selectedFolderId : true;
    return matchesSearch && matchesFolder;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const regularNotes = filteredNotes.filter((n) => !n.isPinned);

  // Generate notes
  const handleOrganize = async () => {
    if (transcript.trim().length < 100) {
      toast({ title: "Transcript must be at least 100 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);

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

      // Generate flashcards
      const flashcards: Flashcard[] = data.definitions?.map((d: Definition) => ({
        front: d.term,
        back: d.definition,
      })) || [];

      const newNote: LectureNotes = {
        id: `note_${Date.now()}`,
        ...data,
        flashcards,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: data.subject ? [data.subject] : [],
        isPinned: false,
        isStarred: false,
      };

      setSavedNotes((prev) => [newNote, ...prev]);
      setSelectedNote(newNote);
      setView("note");
      setTranscript("");
      setSubject("");
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  // Save note updates
  const updateNote = (updates: Partial<LectureNotes>) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote, ...updates, updatedAt: Date.now() };
    setSavedNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? updated : n)));
    setSelectedNote(updated);
  };

  // Delete note
  const deleteNote = (id: string) => {
    setSavedNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setView("library");
    }
  };

  // Create folder
  const createFolder = () => {
    if (!newFolderName.trim()) return;
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name: newFolderName,
      color: colors[folders.length % colors.length],
      createdAt: Date.now(),
    };
    setFolders((prev) => [...prev, newFolder]);
    setNewFolderName("");
    setShowNewFolder(false);
  };

  // Chat with AI about notes
  const handleChat = async () => {
    if (!chatInput.trim() || !selectedNote) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/tools/youtube/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: chatInput,
          context: `${selectedNote.overview}\n\n${selectedNote.topics.map((t) => `${t.title}: ${t.content}`).join("\n")}`,
          title: selectedNote.title,
          history: chatMessages.slice(-6),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate audio summary
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const generateAudio = async () => {
    if (!selectedNote) return;
    if (isGeneratingAudio) return;

    setIsGeneratingAudio(true);
    setIsPlaying(false);

    try {
      const textToSpeak = `${selectedNote.title}. ${selectedNote.overview}. Key points: ${selectedNote.keyPoints.slice(0, 5).join(". ")}`;
      
      const response = await fetch("/api/tools/youtube/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak.slice(0, 3000),
          voice: "hannah",
          style: "teacher",
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        setAudioUrl(URL.createObjectURL(blob));
        toast({ title: "Audio generated!" });
      } else {
        const err = await response.json();
        toast({ title: err.error || "Failed to generate audio", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to generate audio", variant: "destructive" });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Export note
  const exportNote = (format: "md" | "txt" | "json") => {
    if (!selectedNote) return;

    let content = "";
    let mimeType = "text/plain";
    let ext = format;

    if (format === "md") {
      content = `# ${selectedNote.title}\n\n`;
      if (selectedNote.subject) content += `**Subject:** ${selectedNote.subject}\n\n`;
      content += `## Overview\n${selectedNote.overview}\n\n`;
      if (selectedNote.keyPoints.length > 0) {
        content += `## Key Points\n${selectedNote.keyPoints.map((p) => `- ${p}`).join("\n")}\n\n`;
      }
      if (selectedNote.topics.length > 0) {
        content += `## Topics\n\n${selectedNote.topics.map((t) => `### ${t.title}\n${t.content}`).join("\n\n")}\n\n`;
      }
      if (selectedNote.definitions.length > 0) {
        content += `## Definitions\n${selectedNote.definitions.map((d) => `- **${d.term}:** ${d.definition}`).join("\n")}\n\n`;
      }
      if (selectedNote.questions.length > 0) {
        content += `## Exam Questions\n${selectedNote.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`;
      }
      mimeType = "text/markdown";
    } else if (format === "json") {
      content = JSON.stringify(selectedNote, null, 2);
      mimeType = "application/json";
    } else {
      content = `${selectedNote.title}\n\n${selectedNote.overview}\n\nKey Points:\n${selectedNote.keyPoints.map((p) => `• ${p}`).join("\n")}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedNote.title.slice(0, 30)}.${ext}`;
    a.click();
  };

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("toolId", "lecture-organizer");
      try {
        const response = await fetch("/api/tools/parse-pdf", { method: "POST", body: formData });
        if (response.ok) {
          const data = await response.json();
          setTranscript(data.text || "");
          toast({ title: "PDF uploaded successfully" });
        } else {
          const err = await response.json();
          toast({ title: err.error || "Failed to parse PDF", variant: "destructive" });
        }
      } catch (err) {
        console.error(err);
        toast({ title: "Failed to upload PDF", variant: "destructive" });
      }
    } else {
      const text = await file.text();
      setTranscript(text);
      toast({ title: "File uploaded successfully" });
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
          onTimeUpdate={() => setAudioProgress(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h1 className="text-sm font-semibold text-gray-900">Lecture Notes</h1>
          <span className="text-[10px] text-gray-400">{savedNotes.length} notes</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setView("create")} size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700">
            <Plus className="w-3 h-3 mr-1" /> New Note
          </Button>
          <Link href="/dashboard/media" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
            Media <ChevronRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-[220px_1fr] gap-2 overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-b border-gray-100 space-y-0.5">
            <button
              onClick={() => { setSelectedFolderId(null); setView("library"); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                !selectedFolderId && view === "library" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <File className="w-3.5 h-3.5" /> All Notes
              <span className="ml-auto text-[10px] text-gray-400">{savedNotes.length}</span>
            </button>
            <button
              onClick={() => { setSelectedFolderId("starred"); setView("library"); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                selectedFolderId === "starred" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Star className="w-3.5 h-3.5" /> Starred
              <span className="ml-auto text-[10px] text-gray-400">{savedNotes.filter((n) => n.isStarred).length}</span>
            </button>
          </div>

          {/* Folders */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-gray-500">FOLDERS</span>
              <button onClick={() => setShowNewFolder(true)} className="p-0.5 hover:bg-gray-100 rounded">
                <Plus className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            {showNewFolder && (
              <div className="flex gap-1 mb-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createFolder()}
                  placeholder="Folder name"
                  autoFocus
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button onClick={createFolder} className="p-1 bg-blue-600 text-white rounded">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => { setSelectedFolderId(folder.id); setView("library"); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                    selectedFolderId === folder.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" style={{ color: folder.color }} />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {savedNotes.filter((n) => n.folderId === folder.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent */}
          <div className="p-2 border-t border-gray-100">
            <span className="text-[10px] font-medium text-gray-500 mb-1 block">RECENT</span>
            <div className="space-y-0.5">
              {savedNotes.slice(0, 3).map((note) => (
                <button
                  key={note.id}
                  onClick={() => { setSelectedNote(note); setView("note"); }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="truncate">{note.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col min-h-0">
          {view === "create" ? (
            /* Create Note View */
            <div className="h-full grid grid-cols-[1fr_260px] gap-3">
              {/* Input */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.md"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs"
                  >
                    <Upload className="w-3 h-3" /> Upload
                  </button>
                  <span className="text-[10px] text-gray-400 ml-auto">{transcript.length} chars</span>
                </div>
                <div className="flex-1 p-3">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your lecture transcript, notes, or upload a file..."
                    className="w-full h-full resize-none text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Biology"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Style</label>
                  <div className="grid grid-cols-3 gap-1">
                    {["detailed", "summary", "bullet"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setNoteStyle(s)}
                        className={`py-1.5 rounded text-[10px] font-medium ${
                          noteStyle === s ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Model</label>
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>

                <Button
                  onClick={handleOrganize}
                  disabled={isLoading || transcript.length < 100}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Notes</>
                  )}
                </Button>

                <button onClick={() => setView("library")} className="w-full text-xs text-gray-400 hover:text-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          ) : view === "note" && selectedNote ? (
            /* Note View */
            <div className="h-full grid grid-cols-[1fr_280px] gap-3">
              {/* Note Content */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                {/* Note Header */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setView("library"); setSelectedNote(null); }} className="p-1 hover:bg-gray-100 rounded">
                      <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    {editingTitle ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => { updateNote({ title: editTitle }); setEditingTitle(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateNote({ title: editTitle }); setEditingTitle(false); }}}
                        autoFocus
                        className="flex-1 font-medium text-gray-900 focus:outline-none border-b border-blue-500"
                      />
                    ) : (
                      <h2
                        onClick={() => { setEditTitle(selectedNote.title); setEditingTitle(true); }}
                        className="flex-1 font-medium text-gray-900 cursor-text hover:bg-gray-50 rounded px-1"
                      >
                        {selectedNote.title}
                      </h2>
                    )}
                    <button
                      onClick={() => updateNote({ isStarred: !selectedNote.isStarred })}
                      className={`p-1 rounded ${selectedNote.isStarred ? "text-yellow-500" : "text-gray-300 hover:text-gray-400"}`}
                    >
                      <Star className="w-4 h-4" fill={selectedNote.isStarred ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => updateNote({ isPinned: !selectedNote.isPinned })}
                      className={`p-1 rounded ${selectedNote.isPinned ? "text-blue-500" : "text-gray-300 hover:text-gray-400"}`}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedNote.subject && (
                    <span className="text-[10px] text-gray-500 ml-7">{selectedNote.subject}</span>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
                  {[
                    { key: "overview", label: "Overview", icon: BookOpen },
                    { key: "topics", label: "Topics", icon: List },
                    { key: "definitions", label: "Terms", icon: Tag },
                    { key: "questions", label: "Quiz", icon: HelpCircle },
                    { key: "flashcards", label: "Cards", icon: Brain },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                        activeTab === tab.key
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {activeTab === "overview" && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedNote.overview}</p>
                      {selectedNote.keyPoints.length > 0 && (
                        <div className="p-3 bg-blue-50 rounded-xl">
                          <h3 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" /> Key Takeaways
                          </h3>
                          <ul className="space-y-1.5">
                            {selectedNote.keyPoints.map((point, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
                                <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                  {i + 1}
                                </span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "topics" && (
                    <div className="space-y-3">
                      {selectedNote.topics.map((topic, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl">
                          <h4 className="font-medium text-gray-900 text-sm mb-1">{topic.title}</h4>
                          <p className="text-xs text-gray-600">{topic.content}</p>
                          {topic.keyTerms && topic.keyTerms.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {topic.keyTerms.map((term, j) => (
                                <span key={j} className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {term}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "definitions" && (
                    <div className="space-y-2">
                      {selectedNote.definitions.map((def, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl">
                          <span className="font-medium text-gray-900 text-sm">{def.term}</span>
                          <p className="text-xs text-gray-600 mt-0.5">{def.definition}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "questions" && (
                    <div className="space-y-3">
                      {!quizMode ? (
                        <>
                          {selectedNote.questions.map((q, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-xl flex items-start gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">
                                {i + 1}
                              </span>
                              <p className="text-sm text-gray-700">{q}</p>
                            </div>
                          ))}
                          <Button onClick={() => setQuizMode(true)} variant="outline" className="w-full">
                            <Brain className="w-4 h-4 mr-2" /> Start Quiz Mode
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Quiz Mode</span>
                            <button onClick={() => { setQuizMode(false); setQuizAnswers({}); }} className="text-xs text-blue-600">
                              Exit Quiz
                            </button>
                          </div>
                          {selectedNote.questions.map((q, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-xl">
                              <p className="text-sm text-gray-700 mb-2">{i + 1}. {q}</p>
                              <textarea
                                value={quizAnswers[i] || ""}
                                onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                                placeholder="Write your answer..."
                                className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "flashcards" && selectedNote.flashcards && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Card {currentFlashcard + 1} of {selectedNote.flashcards.length}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => setCurrentFlashcard(Math.floor(Math.random() * selectedNote.flashcards!.length))} className="p-1 hover:bg-gray-100 rounded">
                            <Shuffle className="w-4 h-4 text-gray-400" />
                          </button>
                          <button onClick={() => { setCurrentFlashcard(0); setIsFlipped(false); }} className="p-1 hover:bg-gray-100 rounded">
                            <RotateCcw className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="h-48 bg-gradient-to-br from-blue-50 to-white rounded-2xl border-2 border-blue-100 flex flex-col cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                      >
                        <div className="absolute top-2 right-2 text-[10px] text-blue-400 font-medium">
                          {isFlipped ? "ANSWER" : "QUESTION"}
                        </div>
                        <div className="flex-1 flex items-center justify-center p-6 text-center">
                          <p className="text-gray-800 font-medium">
                            {isFlipped
                              ? selectedNote.flashcards[currentFlashcard]?.back
                              : selectedNote.flashcards[currentFlashcard]?.front}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={() => { setCurrentFlashcard((prev) => Math.max(0, prev - 1)); setIsFlipped(false); }}
                          variant="outline"
                          size="sm"
                          disabled={currentFlashcard === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => { setCurrentFlashcard((prev) => Math.min(selectedNote.flashcards!.length - 1, prev + 1)); setIsFlipped(false); }}
                          variant="outline"
                          size="sm"
                          disabled={currentFlashcard === selectedNote.flashcards.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Features */}
              <div className="space-y-3">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <span className="text-[10px] font-medium text-gray-500 mb-2 block">ACTIONS</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={generateAudio}
                      disabled={isGeneratingAudio}
                      className="flex flex-col items-center gap-1 p-2 bg-gray-50 hover:bg-blue-50 rounded-lg text-xs disabled:opacity-50"
                    >
                      {isGeneratingAudio ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="text-gray-600">{isGeneratingAudio ? "Loading..." : "Listen"}</span>
                    </button>
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className="flex flex-col items-center gap-1 p-2 bg-gray-50 hover:bg-blue-50 rounded-lg text-xs"
                    >
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600">Ask AI</span>
                    </button>
                    <button
                      onClick={() => exportNote("md")}
                      className="flex flex-col items-center gap-1 p-2 bg-gray-50 hover:bg-blue-50 rounded-lg text-xs"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600">Export</span>
                    </button>
                    <button
                      onClick={() => toast({ title: "Coming soon!" })}
                      className="flex flex-col items-center gap-1 p-2 bg-gray-50 hover:bg-blue-50 rounded-lg text-xs"
                    >
                      <Share2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Share</span>
                    </button>
                  </div>
                </div>

                {/* Audio Player */}
                {audioUrl && (
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-gray-500">AUDIO SUMMARY</span>
                      <span className="text-[10px] text-gray-400">
                        {Math.floor(audioProgress / 60)}:{String(Math.floor(audioProgress % 60)).padStart(2, "0")} / 
                        {Math.floor(audioDuration / 60)}:{String(Math.floor(audioDuration % 60)).padStart(2, "0")}
                      </span>
                    </div>
                    
                    {/* Waveform Animation */}
                    <div className="flex items-center gap-0.5 h-8 mb-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all duration-150 ${
                            isPlaying ? "bg-blue-500" : "bg-gray-200"
                          }`}
                          style={{
                            height: isPlaying
                              ? `${Math.random() * 60 + 40}%`
                              : `${((i % 5) + 1) * 15}%`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Progress Bar */}
                    <div
                      className="h-1 bg-gray-100 rounded-full mb-3 cursor-pointer"
                      onClick={(e) => {
                        if (audioRef.current && audioDuration) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const percent = (e.clientX - rect.left) / rect.width;
                          audioRef.current.currentTime = percent * audioDuration;
                        }
                      }}
                    >
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (isPlaying) {
                            audioRef.current?.pause();
                          } else {
                            audioRef.current?.play();
                          }
                          setIsPlaying(!isPlaying);
                        }}
                        className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <button
                        onClick={() => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = Math.min(audioDuration, audioRef.current.currentTime + 10);
                          }
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex-1 text-right">
                        <p className="text-[10px] text-gray-500 truncate">{selectedNote.title}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Move to Folder */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <span className="text-[10px] font-medium text-gray-500 mb-2 block">ORGANIZE</span>
                  <select
                    value={selectedNote.folderId || ""}
                    onChange={(e) => updateNote({ folderId: e.target.value || undefined })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <span className="text-[10px] font-medium text-gray-500 mb-2 block">TAGS</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNote.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full flex items-center gap-1 group"
                      >
                        {tag}
                        <button
                          onClick={() => updateNote({ tags: selectedNote.tags.filter((_, idx) => idx !== i) })}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    {showAddTag ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTag.trim()) {
                              updateNote({ tags: [...selectedNote.tags, newTag.trim()] });
                              setNewTag("");
                              setShowAddTag(false);
                            } else if (e.key === "Escape") {
                              setNewTag("");
                              setShowAddTag(false);
                            }
                          }}
                          placeholder="Tag name"
                          autoFocus
                          className="w-16 px-1.5 py-0.5 text-[10px] border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            if (newTag.trim()) {
                              updateNote({ tags: [...selectedNote.tags, newTag.trim()] });
                              setNewTag("");
                              setShowAddTag(false);
                            }
                          }}
                          className="p-0.5 bg-blue-600 text-white rounded"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => { setNewTag(""); setShowAddTag(false); }}
                          className="p-0.5 bg-gray-200 text-gray-500 rounded"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddTag(true)}
                        className="px-2 py-0.5 border border-dashed border-gray-300 text-gray-400 text-[10px] rounded-full hover:border-blue-400 hover:text-blue-400"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteNote(selectedNote.id)}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-3 h-3" /> Delete Note
                </button>
              </div>
            </div>
          ) : (
            /* Library View */
            <div className="h-full bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              {/* Library Header */}
              <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-medium text-gray-900 text-sm">
                  {selectedFolderId === "starred"
                    ? "Starred Notes"
                    : selectedFolderId
                    ? folders.find((f) => f.id === selectedFolderId)?.name || "Notes"
                    : "All Notes"}
                </h2>
                <span className="text-[10px] text-gray-400">{filteredNotes.length} notes</span>
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto p-3">
                {filteredNotes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <FileText className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No notes yet</p>
                    <button onClick={() => setView("create")} className="text-xs text-blue-600 mt-1">
                      Create your first note
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pinnedNotes.length > 0 && (
                      <>
                        <p className="text-[10px] font-medium text-gray-500 px-1">PINNED</p>
                        {pinnedNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            onClick={() => { setSelectedNote(note); setView("note"); }}
                            onStar={() => {
                              setSavedNotes((prev) =>
                                prev.map((n) => (n.id === note.id ? { ...n, isStarred: !n.isStarred } : n))
                              );
                            }}
                            onDelete={() => deleteNote(note.id)}
                          />
                        ))}
                      </>
                    )}
                    {regularNotes.length > 0 && (
                      <>
                        {pinnedNotes.length > 0 && <p className="text-[10px] font-medium text-gray-500 px-1 mt-3">ALL</p>}
                        {regularNotes.map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            onClick={() => { setSelectedNote(note); setView("note"); }}
                            onStar={() => {
                              setSavedNotes((prev) =>
                                prev.map((n) => (n.id === note.id ? { ...n, isStarred: !n.isStarred } : n))
                              );
                            }}
                            onDelete={() => deleteNote(note.id)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && selectedNote && (
        <div className="fixed bottom-4 right-4 w-80 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-blue-50">
            <span className="text-xs font-medium text-blue-700">Ask about this note</span>
            <button onClick={() => setShowChat(false)} className="p-0.5 hover:bg-blue-100 rounded">
              <X className="w-4 h-4 text-blue-600" />
            </button>
          </div>
          <div className="h-64 overflow-y-auto p-3 space-y-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs ${
                  msg.role === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 bg-gray-100 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>
          <div className="p-2 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChat()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button onClick={handleChat} disabled={!chatInput.trim()} className="p-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <p className="text-gray-900 font-medium text-sm">Organizing notes...</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Analyzing content</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Note Card Component
function NoteCard({
  note,
  onClick,
  onStar,
  onDelete,
}: {
  note: LectureNotes;
  onClick: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="p-3 bg-gray-50 hover:bg-blue-50 rounded-xl cursor-pointer group transition-all"
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-medium text-gray-900 text-sm truncate flex-1">{note.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onStar(); }}
            className={`p-0.5 rounded ${note.isStarred ? "text-yellow-500" : "text-gray-300 hover:text-yellow-500"}`}
          >
            <Star className="w-3.5 h-3.5" fill={note.isStarred ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 rounded text-gray-300 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 line-clamp-2">{note.overview}</p>
      <div className="flex items-center gap-2 mt-2">
        {note.subject && (
          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{note.subject}</span>
        )}
        <span className="text-[10px] text-gray-400">{new Date(note.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
