"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileSearch, 
  Loader2, 
  Sparkles,
  Upload,
  Send,
  FileText,
  X,
  BookOpen,
  MessageSquare,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  List,
  Zap,
  Plus,
  Trash2,
  Quote,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import Link from "next/link";

interface Source {
  id: string;
  name: string;
  content: string;
  pages?: number;
  type: "pdf" | "txt";
}

interface Reference {
  id: number;
  source: string;
  excerpt: string;
  relevance: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  references?: Reference[];
  followUps?: string[];
}

export default function PDFQAPage() {
  const searchParams = useSearchParams();
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("pdfqa-model", "fast");
  
  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSources, setShowSources] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [expandedRefs, setExpandedRefs] = useState<Set<number>>(new Set());
  const [loadingDoc, setLoadingDoc] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("pdf-qa");

  // Load document from query parameter
  const loadDocumentFromId = useCallback(async (docId: string) => {
    setLoadingDoc(true);
    try {
      const res = await fetch(`/api/user/documents/${docId}`);
      if (!res.ok) {
        toast({ title: "Document not found", variant: "destructive" });
        return;
      }
      const data = await res.json();
      if (data.document) {
        const doc = data.document;
        const newSource: Source = {
          id: doc.id,
          name: doc.filename,
          content: doc.content || "",
          pages: doc.metadata?.pages,
          type: "pdf",
        };
        setSources([newSource]);
        toast({ title: "Document loaded", description: doc.filename });
      }
    } catch (error) {
      console.error("Failed to load document:", error);
      toast({ title: "Failed to load document", variant: "destructive" });
    } finally {
      setLoadingDoc(false);
    }
  }, [toast]);

  // Check for doc query parameter on mount
  useEffect(() => {
    const docId = searchParams.get("doc");
    if (docId && sources.length === 0 && !loadingDoc) {
      loadDocumentFromId(docId);
    }
  }, [searchParams, sources.length, loadingDoc, loadDocumentFromId]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleFile = async (file: File, isAddingMore = false) => {
    if (!file) return;
    setIsProcessing(true);

    try {
    if (file.type === "text/plain") {
      const text = await file.text();
        const newSource: Source = {
          id: generateId(),
          name: file.name,
          content: text,
          type: "txt",
        };
        setSources(prev => [...prev, newSource]);
        if (!isAddingMore) setMessages([]);
        toast({ title: "Text file added", description: file.name });
    } else if (file.type === "application/pdf") {
        toast({ title: "Processing PDF...", description: file.name });
        
        const formData = new FormData();
        formData.append("file", file);
        formData.append("toolId", "pdf-qa");
        
        const response = await fetch("/api/tools/parse-pdf", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || "Failed to parse PDF");
        }
        
        const data = await response.json();
        
        if (data.text.trim().length < 100) {
          toast({ 
            title: "PDF has limited text", 
            description: "This PDF might be image-based.",
            variant: "destructive" 
          });
        }
        
        const newSource: Source = {
          id: generateId(),
          name: file.name,
          content: data.text,
          pages: data.pages,
          type: "pdf",
        };
        setSources(prev => [...prev, newSource]);
        if (!isAddingMore) setMessages([]);
        toast({ 
          title: "PDF added", 
          description: `${file.name} - ${data.pages} pages` 
        });
    } else {
      toast({ title: "Unsupported file type", variant: "destructive" });
      }
    } catch (error) {
      console.error("File processing error:", error);
      toast({ 
        title: "Failed to process file", 
        description: "Please try a different file",
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file, i) => handleFile(file, i > 0 || sources.length > 0));
  };

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
    if (selectedSourceId === id) setSelectedSourceId(null);
    toast({ title: "Source removed" });
  };

  const clearAllSources = () => {
    setSources([]);
    setMessages([]);
    setQuestion("");
    setSelectedSourceId(null);
  };

  // Combine all source content for AI
  const getCombinedContent = () => {
    return sources.map(s => `[Source: ${s.name}]\n${s.content}`).join("\n\n---\n\n");
  };

  const askQuestion = async (customQuestion?: string) => {
    const q = customQuestion || question;
    if (sources.length === 0 || !q.trim()) return;
    
    if (q.trim().length < 5) {
      toast({ title: "Question must be at least 5 characters", variant: "destructive" });
      return;
    }

    const userMessage: Message = { role: "user", content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/tools/pdf-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          pdfContent: getCombinedContent(),
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        if (response.status === 401) {
          toast({ title: "Unauthorized", description: "Please log in again", variant: "destructive" });
          return;
        }
        // Handle different error formats
        let errorMessage = "Failed to get answer";
        if (errorData.error) {
          if (Array.isArray(errorData.error)) {
            // ZodError format (old)
            errorMessage = errorData.error.map((e: any) => e.message || e.path?.join(".")).join(", ") || "Invalid input";
          } else if (typeof errorData.error === "string") {
            errorMessage = errorData.error;
            // Include details if available
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`;
            }
          }
        }
        toast({ 
          title: "Error", 
          description: errorMessage,
          variant: "destructive" 
        });
        return;
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        references: data.references || [],
        followUps: data.followUps || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
      saveProject({
        inputData: { question: q, sources: sources.map(s => ({ name: s.name, type: s.type })) },
        outputData: { lastAnswer: data.answer, references: data.references || [] },
        settings: { model: selectedModel },
        inputPreview: q.slice(0, 200),
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleRefExpanded = (msgIndex: number) => {
    setExpandedRefs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgIndex)) {
        newSet.delete(msgIndex);
      } else {
        newSet.add(msgIndex);
      }
      return newSet;
    });
  };

  const getSourcePreview = (source: Source) => {
    const sentences = source.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim().slice(0, 80) + "...");
  };

  const suggestedQuestions = [
    { icon: List, text: "Summarize all sources" },
    { icon: Lightbulb, text: "What are the key points?" },
    { icon: Zap, text: "Compare the sources" },
  ];

  const totalChars = sources.reduce((acc, s) => acc + s.content.length, 0);

  return (
    <div className={`h-full flex flex-col transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileSearch className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">PDF Q&A Sniper</h1>
            <p className="text-xs text-gray-500">Multi-source document analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/rag" className="text-xs text-blue-600 hover:underline">RAG Tools</Link>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3 h-3" />4 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {loadingDoc ? (
          /* Loading Document from Library */
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading document...</p>
            </div>
          </div>
        ) : sources.length === 0 ? (
          /* Initial Upload State */
          <div className="h-full flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xl cursor-pointer"
            >
              <div className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-16 text-center transition-all duration-300 ${
                dragActive 
                  ? "border-blue-500 bg-blue-50 scale-[1.02]" 
                  : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
              }`}>
                <motion.div
                  animate={{ y: dragActive ? -5 : 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {isProcessing ? (
                    <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-6 animate-spin" />
                  ) : (
                  <Upload className="w-12 h-12 text-blue-600 mx-auto mb-6" />
                  )}
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your Sources</h2>
                  <p className="text-gray-500 mb-6">Upload multiple documents to analyze together</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium">PDF</span>
                    <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium">TXT</span>
                  </div>
                </motion.div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file, i) => handleFile(file, i > 0));
                }}
                className="hidden"
              />
            </motion.div>
          </div>
        ) : (
          /* NotebookLM Style Layout */
          <div className="h-full flex gap-4">
            {/* Source Panel - Left */}
            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 340, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex-shrink-0"
                >
                  <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    {/* Source Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-800">Sources</span>
                          <span className="text-xs text-gray-400">({sources.length})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={clearAllSources}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Clear all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowSources(false)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

                      {/* Add Source Button */}
                        <button
                        onClick={() => addFileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Add source
                      </button>
                      <input
                        ref={addFileInputRef}
                        type="file"
                        accept=".pdf,.txt"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach(file => handleFile(file, true));
                        }}
                        className="hidden"
                      />
                    </div>

                    {/* Source List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {sources.map((source) => (
                        <motion.div
                          key={source.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          onClick={() => setSelectedSourceId(selectedSourceId === source.id ? null : source.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedSourceId === source.id
                              ? "border-blue-200 bg-blue-50"
                              : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <FileText className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                              selectedSourceId === source.id ? "text-blue-600" : "text-gray-400"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">{source.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {source.type.toUpperCase()}
                                {source.pages ? ` • ${source.pages} pages` : ""}
                                {` • ${(source.content.length / 1000).toFixed(1)}k`}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeSource(source.id); }}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3.5 h-3.5" />
                        </button>
                          </div>
                          
                          {/* Expanded Preview */}
                          <AnimatePresence>
                            {selectedSourceId === source.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-3 pt-3 border-t border-blue-100 overflow-hidden"
                              >
                                <p className="text-xs text-gray-500 mb-2">Preview:</p>
                                <div className="space-y-1.5">
                                  {getSourcePreview(source).map((preview, i) => (
                                    <p key={i} className="text-xs text-gray-600 leading-relaxed">
                                      {preview}
                                    </p>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>

                    {/* Footer Stats */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
                        <span>{(totalChars / 1000).toFixed(1)}k total characters</span>
                      </div>
                      
                      {/* Model Selector */}
                      <div className="mt-3">
                        <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Panel - Right */}
            <div className="flex-1 h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!showSources && (
                    <button
                      onClick={() => setShowSources(true)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">Chat</span>
                  <span className="text-xs text-gray-400">
                    {sources.length} source{sources.length !== 1 ? "s" : ""} • {messages.length} messages
                  </span>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>

              {/* Messages */}
              <div ref={chatRef} className="flex-1 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <MessageSquare className="w-12 h-12 text-blue-600 mx-auto mb-6" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">Start a conversation</h3>
                      <p className="text-gray-500 text-sm mb-6">
                        Ask anything about your {sources.length} source{sources.length !== 1 ? "s" : ""}. 
                        I'll analyze and provide detailed answers.
                      </p>
                      
                      {/* Suggested Questions */}
                      <div className="space-y-2">
                        {suggestedQuestions.map((sq, idx) => (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            disabled={isLoading}
                            onClick={() => askQuestion(sq.text)}
                            className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-left transition-colors group disabled:opacity-50"
                          >
                            <sq.icon className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            <span className="text-sm text-gray-600 group-hover:text-blue-700">{sq.text}</span>
                          </motion.button>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                  <div className="space-y-6">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}
                      >
                      {msg.role === "user" ? (
                          /* User Message */
                          <>
                            <div className="bg-blue-600 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-sm max-w-[75%]">
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 flex-shrink-0 mt-1">You</span>
                          </>
                        ) : (
                          /* Perplexity-Style AI Response */
                          <div className="w-full space-y-4">
                            {/* Sources Row - Top */}
                            {msg.references && msg.references.length > 0 && (
                              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                                <span className="text-xs text-gray-400 flex-shrink-0">Sources</span>
                                <div className="flex gap-2">
                                  {msg.references.map((ref) => (
                                    <motion.button
                                      key={ref.id}
                                      whileHover={{ scale: 1.02 }}
                                      onClick={() => {
                                        const key = i * 100 + ref.id;
                                        if (expandedRefs.has(key)) {
                                          setExpandedRefs(prev => { const s = new Set(prev); s.delete(key); return s; });
                                        } else {
                                          setExpandedRefs(prev => new Set([...prev, key]));
                                        }
                                      }}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all flex-shrink-0 ${
                                        expandedRefs.has(i * 100 + ref.id)
                                          ? "bg-blue-50 border-blue-200"
                                          : "bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/50"
                                      }`}
                                    >
                                      <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                                        {ref.id}
                                </span>
                                      <span className="text-xs text-gray-700 max-w-[100px] truncate">{ref.source}</span>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Expanded Source Detail */}
                            <AnimatePresence>
                              {msg.references?.map((ref) => (
                                expandedRefs.has(i * 100 + ref.id) && (
                                  <motion.div
                                    key={`detail-${ref.id}`}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-2">
                                      <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                          {ref.id}
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-800">{ref.source}</span>
                                            <button
                                              onClick={() => {
                                                setExpandedRefs(prev => { const s = new Set(prev); s.delete(i * 100 + ref.id); return s; });
                                              }}
                                              className="p-1 hover:bg-gray-100 rounded"
                                            >
                                              <X className="w-3.5 h-3.5 text-gray-400" />
                                            </button>
                          </div>
                                          <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-blue-400 pl-3 italic">
                                            {ref.excerpt}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )
                              ))}
                            </AnimatePresence>

                            {/* Answer Section */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Answer</span>
                              </div>
                              
                              <div className="text-gray-800 leading-relaxed text-[15px] whitespace-pre-wrap">
                                {msg.content}
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={() => copyToClipboard(msg.content, i)}
                                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                  {copiedIndex === i ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-green-500" />
                                      <span className="text-green-600">Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Follow-up Questions */}
                            {msg.followUps && msg.followUps.length > 0 && (
                              <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                  <Search className="w-4 h-4 text-gray-400" />
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Related</span>
                                </div>
                                <div className="space-y-2">
                                  {msg.followUps.map((followUp, fIdx) => (
                                    <motion.button
                                      key={fIdx}
                                      whileHover={{ x: 4 }}
                                      disabled={isLoading}
                                      onClick={() => askQuestion(followUp)}
                                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-xl text-left transition-colors group disabled:opacity-50"
                                    >
                                      <span className="text-sm text-gray-700 group-hover:text-blue-700">{followUp}</span>
                                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                      )}
                    </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Loading State */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4"
                      >
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-1" />
                        <div className="bg-gray-50 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                className="w-2 h-2 bg-blue-400 rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                className="w-2 h-2 bg-blue-500 rounded-full"
                              />
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                className="w-2 h-2 bg-blue-600 rounded-full"
                              />
                            </div>
                            <span className="text-sm text-gray-500">Analyzing {sources.length} source{sources.length !== 1 ? "s" : ""}...</span>
                          </div>
                      </div>
                      </motion.div>
                    )}
                  </div>
              )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                <Input
                      placeholder={`Ask about your ${sources.length} source${sources.length !== 1 ? "s" : ""}...`}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && askQuestion()}
                      className="h-12 pl-4 pr-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white shadow-sm"
                />
                  </div>
                <Button
                    onClick={() => askQuestion()}
                    disabled={isLoading || !question.trim() || sources.length === 0}
                    className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                  <Send className="w-5 h-5" />
                    )}
                </Button>
                </div>
                <p className="text-xs text-center text-gray-400 mt-2">
                  AI analyzes all {sources.length} source{sources.length !== 1 ? "s" : ""} together
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
