"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Trash2,
  ChevronDown,
  Filter,
  Sparkles,
  FileSearch,
  Globe,
  Video,
  Shapes,
  PenTool,
  Brain,
  Zap,
  ChevronRight,
  Calendar,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Document {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  toolId: string | null;
  createdAt: string;
  metadata: any;
  _count: {
    chunks: number;
  };
}

interface Activity {
  id: string;
  toolSlug: string;
  toolName: string;
  category: string;
  timestamp: string;
  inputPreview: string;
  creditsUsed: number;
}

type LibraryItem = {
  type: "document" | "activity";
  id: string;
  name: string;
  category: string;
  toolId: string;
  createdAt: string;
  metadata?: any;
  size?: number;
  creditsUsed?: number;
  documentId?: string;
};

const categoryConfig: Record<string, { icon: any; bg: string; text: string; label: string }> = {
  rag: { icon: FileSearch, bg: "bg-blue-100", text: "text-blue-600", label: "RAG & Documents" },
  research: { icon: Globe, bg: "bg-emerald-100", text: "text-emerald-600", label: "Research" },
  media: { icon: Video, bg: "bg-purple-100", text: "text-purple-600", label: "Audio & Video" },
  visual: { icon: Shapes, bg: "bg-amber-100", text: "text-amber-600", label: "Visual" },
  writing: { icon: PenTool, bg: "bg-rose-100", text: "text-rose-600", label: "Writing" },
};

// Tool categories for new project modal
const toolCategories = [
  {
    name: "RAG & Documents",
    category: "rag",
    icon: FileSearch,
    bg: "bg-blue-100",
    text: "text-blue-600",
    tools: [
      { name: "PDF Q&A", slug: "pdf-qa" },
      { name: "Quiz Generator", slug: "quiz-generator" },
      { name: "Flashcard Maker", slug: "flashcard-maker" },
      { name: "Past Paper Analyzer", slug: "past-paper" },
      { name: "Resume Tailor", slug: "resume-tailor" },
    ],
  },
  {
    name: "Research",
    category: "research",
    icon: Globe,
    bg: "bg-emerald-100",
    text: "text-emerald-600",
    tools: [
      { name: "Academic Consensus", slug: "academic-consensus" },
      { name: "Research Gap Finder", slug: "research-gap" },
      { name: "Job Matcher", slug: "job-matcher" },
    ],
  },
  {
    name: "Audio & Video",
    category: "media",
    icon: Video,
    bg: "bg-purple-100",
    text: "text-purple-600",
    tools: [
      { name: "YouTube Summarizer", slug: "youtube-summarizer" },
      { name: "PDF to Podcast", slug: "pdf-podcast" },
      { name: "Lecture Organizer", slug: "lecture-organizer" },
      { name: "Viva Simulator", slug: "viva-simulator" },
    ],
  },
  {
    name: "Visual",
    category: "visual",
    icon: Shapes,
    bg: "bg-amber-100",
    text: "text-amber-600",
    tools: [
      { name: "Mind Map", slug: "mind-map" },
      { name: "Timeline", slug: "timeline" },
      { name: "Flowchart", slug: "flowchart" },
      { name: "Lab Report", slug: "lab-report" },
    ],
  },
  {
    name: "Writing",
    category: "writing",
    icon: PenTool,
    bg: "bg-rose-100",
    text: "text-rose-600",
    tools: [
      { name: "AI Detector", slug: "ai-detector" },
      { name: "Humanizer", slug: "humanizer" },
      { name: "Paraphraser", slug: "paraphraser" },
      { name: "Roast My Assignment", slug: "roast-assignment" },
      { name: "Code Visualizer", slug: "code-visualizer" },
    ],
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsRes, activityRes] = await Promise.all([
        fetch("/api/user/documents"),
        fetch("/api/user/activity"),
      ]);

      const docsData = await docsRes.json();
      const activityData = await activityRes.json();

      if (docsData.documents) setDocuments(docsData.documents);
      if (activityData.activities) setActivities(activityData.activities);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const res = await fetch("/api/user/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        toast({ title: "Document deleted successfully" });
      }
    } catch (error) {
      toast({ title: "Failed to delete document", variant: "destructive" });
    }
    setActiveMenu(null);
  };

  // Combine documents and activities into unified library items
  const libraryItems: LibraryItem[] = [
    ...documents.map((doc) => ({
      type: "document" as const,
      id: doc.id,
      name: doc.filename,
      category: doc.toolId ? getCategoryFromTool(doc.toolId) : "rag",
      toolId: doc.toolId || "pdf-qa",
      createdAt: doc.createdAt,
      metadata: doc.metadata,
      size: doc.size,
      documentId: doc.id, // For loading the actual document
    })),
    ...activities.map((act) => ({
      type: "activity" as const,
      id: act.id,
      name: act.toolName,
      category: act.category,
      toolId: act.toolSlug,
      createdAt: act.timestamp,
      creditsUsed: act.creditsUsed,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Helper to get category from tool ID
  function getCategoryFromTool(toolId: string): string {
    for (const cat of toolCategories) {
      if (cat.tools.some(t => t.slug === toolId)) {
        return cat.category;
      }
    }
    return "rag";
  }

  // Filter items
  const filteredItems = libraryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by date
  const groupedItems = filteredItems.reduce((groups, item) => {
    const date = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let group: string;
    if (date.toDateString() === today.toDateString()) {
      group = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = "Yesterday";
    } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
      group = "This Week";
    } else {
      group = "Earlier";
    }

    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, LibraryItem[]>);

  const uniqueCategories = [...new Set(libraryItems.map((item) => item.category))];

  return (
    <div className="-m-4 lg:-m-5 -mt-16 lg:-mt-5 min-h-[calc(100vh-0px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="w-6 h-6 text-blue-600" />
                My Library
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {libraryItems.length} items • {documents.length} documents • {activities.length} activities
              </p>
            </div>
            <Button
              onClick={() => setShowNewProjectModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 shrink-0">
        <div className="max-w-[1400px] mx-auto px-6 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Filter Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="gap-2 h-8 text-xs"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {filterCategory ? categoryConfig[filterCategory]?.label : "All Categories"}
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                    >
                      <button
                        onClick={() => {
                          setFilterCategory(null);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                          !filterCategory ? "bg-blue-50 text-blue-600" : "text-gray-700"
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        All Categories
                      </button>
                      {Object.entries(categoryConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        const count = libraryItems.filter(i => i.category === key).length;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setFilterCategory(key);
                              setShowFilterMenu(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                              filterCategory === key ? "bg-blue-50 text-blue-600" : "text-gray-700"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {config.label}
                            <span className="ml-auto text-xs text-gray-400">({count})</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                    viewMode === "grid"
                      ? "bg-gray-200 text-gray-900"
                      : "hover:bg-gray-100 text-gray-500"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-gray-200 text-gray-900"
                      : "hover:bg-gray-100 text-gray-500"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-56 pl-3 pr-8 text-sm"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="w-10 h-10 text-gray-400 mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-1">No items yet</h3>
              <p className="text-sm text-gray-500 mb-3">
                Start using tools to see your project history here
              </p>
              <Button
                onClick={() => setShowNewProjectModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Start a Project
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([group, items]) => (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group}</h2>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </div>

                  {viewMode === "grid" ? (
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
                    >
                      {items.map((item) => {
                        const catConfig = categoryConfig[item.category] || categoryConfig.rag;
                        const Icon = catConfig.icon;
                        const toolPath = item.documentId 
                          ? `/dashboard/${item.category}/${item.toolId}?doc=${item.documentId}`
                          : `/dashboard/${item.category}/${item.toolId}`;

                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group relative flex flex-col rounded-xl overflow-hidden h-[150px] border border-gray-200 bg-white hover:shadow-md hover:border-blue-200 transition-all"
                          >
                            <Link href={toolPath} className="flex-1 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gray-50" />
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                                <Icon className={`w-8 h-8 ${catConfig.text} mb-2`} />
                                <p className="text-xs text-gray-700 text-center line-clamp-2 font-medium">
                                  {item.name}
                                </p>
                              </div>
                              <div className="absolute top-2 right-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/80 ${catConfig.text}`}>
                                  {catConfig.label.split(" ")[0]}
                                </span>
                              </div>
                            </Link>

                            <div className="flex items-center gap-2 h-10 px-3 border-t border-gray-100 bg-white">
                              <span className="text-[10px] text-gray-400 flex-1">{formatDate(item.createdAt)}</span>
                              {item.creditsUsed && (
                                <div className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                  <Zap className="w-3 h-3" />
                                  {item.creditsUsed}
                                </div>
                              )}
                              <Link href={toolPath}>
                                <ChevronRight className="w-4 h-4 text-gray-300 hover:text-blue-500" />
                              </Link>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {items.map((item, idx) => {
                        const catConfig = categoryConfig[item.category] || categoryConfig.rag;
                        const Icon = catConfig.icon;
                        const toolPath = item.documentId 
                          ? `/dashboard/${item.category}/${item.toolId}?doc=${item.documentId}`
                          : `/dashboard/${item.category}/${item.toolId}`;

                        return (
                          <Link
                            key={item.id}
                            href={toolPath}
                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                              idx !== items.length - 1 ? "border-b border-gray-100" : ""
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${catConfig.text}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-gray-400">{formatFullDate(item.createdAt)}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 ${catConfig.text}`}>
                              {catConfig.label}
                            </span>
                            <ExternalLink className="w-4 h-4 text-gray-300" />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          {libraryItems.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const count = libraryItems.filter((i) => i.category === key).length;
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterCategory(filterCategory === key ? null : key)}
                    className={`bg-white rounded-xl border p-3 transition-all hover:shadow-sm ${
                      filterCategory === key ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${config.text}`} />
                      <div className="text-left">
                        <p className="text-lg font-bold text-gray-900">{count}</p>
                        <p className="text-[10px] text-gray-500 truncate">{config.label}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewProjectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Start a New Project</h2>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  {toolCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center gap-2 mb-3">
                          <Icon className={`w-4 h-4 ${cat.text}`} />
                          <h3 className="text-sm font-semibold text-gray-700">{cat.name}</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {cat.tools.map((tool) => (
                            <Link
                              key={tool.slug}
                              href={`/dashboard/${cat.category}/${tool.slug}`}
                              onClick={() => setShowNewProjectModal(false)}
                              className={`flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group`}
                            >
                              <Icon className={`w-5 h-5 ${cat.text} group-hover:scale-110 transition-transform`} />
                              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                                {tool.name}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
