"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Filter,
  Sparkles,
  FileSearch,
  Globe,
  Video,
  Shapes,
  PenTool,
  ChevronRight,
  Clock,
  FolderOpen,
  MoreHorizontal,
  X,
  Mic,
  FlaskConical,
  Network,
  RefreshCw,
  ShieldCheck,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectItem {
  id: string;
  slug: string;
  toolId: string;
  caption: string;
  createdAt: string;
  updatedAt: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const categoryConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  writing: { icon: PenTool, color: "text-rose-500", label: "Writing" },
  rag: { icon: FileSearch, color: "text-blue-500", label: "Documents" },
  visual: { icon: Shapes, color: "text-amber-500", label: "Visual" },
  research: { icon: Globe, color: "text-emerald-500", label: "Research" },
  media: { icon: Video, color: "text-purple-500", label: "Media" },
};

const toolMeta: Record<string, { name: string; icon: LucideIcon; category: string }> = {
  "paraphraser": { name: "Paraphraser", icon: RefreshCw, category: "writing" },
  "humanizer": { name: "Humanizer", icon: Wand2, category: "writing" },
  "ai-detector": { name: "AI Detector", icon: ShieldCheck, category: "writing" },
  "devils-advocate": { name: "Devil's Advocate", icon: Zap, category: "writing" },
  "vocabulary-upgrader": { name: "Vocabulary Upgrader", icon: FileText, category: "writing" },
  "cold-email": { name: "Cold Email", icon: PenTool, category: "writing" },
  "assignment-worker": { name: "Assignment Worker", icon: FileText, category: "writing" },
  "video-explainer": { name: "Video Explainer", icon: Video, category: "writing" },
  "roast-assignment": { name: "Roast Assignment", icon: Zap, category: "writing" },
  "image-solve": { name: "Image Solver", icon: Sparkles, category: "writing" },
  "pdf-qa": { name: "PDF Q&A", icon: FileSearch, category: "rag" },
  "quiz-generator": { name: "Quiz Generator", icon: Sparkles, category: "rag" },
  "flashcard-maker": { name: "Flashcard Maker", icon: FileText, category: "rag" },
  "past-paper": { name: "Past Paper", icon: FileText, category: "rag" },
  "resume-tailor": { name: "Resume Tailor", icon: FileText, category: "rag" },
  "mind-map": { name: "Mind Map", icon: Network, category: "visual" },
  "timeline": { name: "Timeline", icon: Clock, category: "visual" },
  "flowchart": { name: "Flowchart", icon: Shapes, category: "visual" },
  "lab-report": { name: "Lab Report", icon: FlaskConical, category: "visual" },
  "research-gap": { name: "Research Gap", icon: Globe, category: "research" },
  "academic-consensus": { name: "Academic Consensus", icon: Globe, category: "research" },
  "youtube-summarizer": { name: "YouTube Summarizer", icon: Video, category: "media" },
  "pdf-podcast": { name: "PDF Podcast", icon: Mic, category: "media" },
  "lecture-organizer": { name: "Lecture Organizer", icon: FileText, category: "media" },
  "viva-simulator": { name: "Viva Simulator", icon: Mic, category: "media" },
};

const toolCategories = [
  {
    name: "Writing", category: "writing", icon: PenTool, color: "text-rose-500",
    tools: [
      { name: "Paraphraser", slug: "paraphraser" },
      { name: "Humanizer", slug: "humanizer" },
      { name: "AI Detector", slug: "ai-detector" },
      { name: "Assignment Worker", slug: "assignment-worker" },
      { name: "Video Explainer", slug: "video-explainer" },
      { name: "Devil's Advocate", slug: "devils-advocate" },
      { name: "Vocabulary Upgrader", slug: "vocabulary-upgrader" },
      { name: "Cold Email", slug: "cold-email" },
      { name: "Roast Assignment", slug: "roast-assignment" },
      { name: "Image Solver", slug: "image-solve" },
    ],
  },
  {
    name: "Documents", category: "rag", icon: FileSearch, color: "text-blue-500",
    tools: [
      { name: "PDF Q&A", slug: "pdf-qa" },
      { name: "Quiz Generator", slug: "quiz-generator" },
      { name: "Flashcard Maker", slug: "flashcard-maker" },
      { name: "Past Paper", slug: "past-paper" },
      { name: "Resume Tailor", slug: "resume-tailor" },
    ],
  },
  {
    name: "Visual", category: "visual", icon: Shapes, color: "text-amber-500",
    tools: [
      { name: "Mind Map", slug: "mind-map" },
      { name: "Timeline", slug: "timeline" },
      { name: "Flowchart", slug: "flowchart" },
      { name: "Lab Report", slug: "lab-report" },
    ],
  },
  {
    name: "Research", category: "research", icon: Globe, color: "text-emerald-500",
    tools: [
      { name: "Academic Consensus", slug: "academic-consensus" },
      { name: "Research Gap", slug: "research-gap" },
    ],
  },
  {
    name: "Media", category: "media", icon: Video, color: "text-purple-500",
    tools: [
      { name: "YouTube Summarizer", slug: "youtube-summarizer" },
      { name: "PDF Podcast", slug: "pdf-podcast" },
      { name: "Lecture Organizer", slug: "lecture-organizer" },
      { name: "Viva Simulator", slug: "viva-simulator" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  if (d > new Date(now.getTime() - 7 * 86400000)) return "This Week";
  return "Earlier";
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { toast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch { /* */ } finally { setLoading(false); }
  };

  const deleteProject = async (slug: string) => {
    try {
      const res = await fetch(`/api/projects/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.slug !== slug));
        toast({ title: "Project deleted" });
      }
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
    setOpenMenu(null);
  };

  // Filter + search
  const filtered = projects.filter(p => {
    const meta = toolMeta[p.toolId];
    const matchSearch = p.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meta?.name || p.toolId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !filterCategory || meta?.category === filterCategory;
    return matchSearch && matchCat;
  });

  // Group
  const grouped = filtered.reduce((acc, p) => {
    const g = dateGroup(p.createdAt);
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {} as Record<string, ProjectItem[]>);

  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];

  // Stats
  const stats = Object.entries(categoryConfig).map(([key, cfg]) => ({
    key, ...cfg,
    count: projects.filter(p => toolMeta[p.toolId]?.category === key).length,
  }));

  return (
    <div className="-m-4 lg:-m-5 -mt-16 lg:-mt-5 h-full flex flex-col bg-[#fafafa] overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200/80">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-gray-900">My Library</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {projects.length} project{projects.length !== 1 ? "s" : ""} saved
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-2.5">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setFilterCategory(null)}
                className={`h-7 px-2.5 rounded-md text-[10px] font-medium transition-all ${
                  !filterCategory ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              {stats.filter(s => s.count > 0).map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => setFilterCategory(filterCategory === s.key ? null : s.key)}
                    className={`h-7 px-2.5 rounded-md text-[10px] font-medium flex items-center gap-1 transition-all ${
                      filterCategory === s.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {s.label}
                    <span className="opacity-60">{s.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {searchQuery || filterCategory ? "No matching projects" : "No projects yet"}
              </p>
              <p className="text-xs text-gray-400 mb-4 max-w-xs">
                {searchQuery || filterCategory
                  ? "Try a different search or filter."
                  : "Use any tool to automatically save your work here."}
              </p>
              {!searchQuery && !filterCategory && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Start a Project
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {groupOrder.map(group => {
                const items = grouped[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{group}</span>
                      <div className="flex-1 h-px bg-gray-200/60" />
                      <span className="text-[10px] text-gray-300">{items.length}</span>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200/80 divide-y divide-gray-100 overflow-hidden">
                      {items.map(project => {
                        const meta = toolMeta[project.toolId];
                        const catCfg = categoryConfig[meta?.category || "writing"];
                        const ToolIcon = meta?.icon || FileText;

                        return (
                          <div key={project.id} className="group relative">
                            <Link
                              href={`/dashboard/project/${project.slug}`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors"
                            >
                              {/* Icon */}
                              <div className={`w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors`}>
                                <ToolIcon className={`w-4 h-4 ${catCfg?.color || "text-gray-500"} group-hover:text-blue-600 transition-colors`} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                  {project.caption}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-400">{meta?.name || project.toolId}</span>
                                  <span className="text-[10px] text-gray-300">·</span>
                                  <span className="text-[10px] text-gray-400">{relativeTime(project.createdAt)}</span>
                                </div>
                              </div>

                              {/* Arrow */}
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                            </Link>

                            {/* Menu */}
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" ref={openMenu === project.id ? menuRef : null}>
                              <button
                                onClick={e => { e.preventDefault(); e.stopPropagation(); setOpenMenu(openMenu === project.id ? null : project.id); }}
                                className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              {openMenu === project.id && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                                  <button
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); deleteProject(project.slug); }}
                                    className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats Cards */}
          {projects.length > 0 && (
            <div className="mt-6 grid grid-cols-5 gap-2">
              {stats.map(s => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => setFilterCategory(filterCategory === s.key ? null : s.key)}
                    className={`py-3 rounded-xl border text-center transition-all ${
                      filterCategory === s.key ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                    <p className="text-lg font-bold text-gray-900">{s.count}</p>
                    <p className="text-[9px] text-gray-400">{s.label}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── New Project Modal ─────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">New Project</h2>
              <button onClick={() => setShowNewModal(false)} className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              {toolCategories.map(cat => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{cat.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {cat.tools.map(tool => (
                        <Link
                          key={tool.slug}
                          href={`/dashboard/${cat.category}/${tool.slug}`}
                          onClick={() => setShowNewModal(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-xs text-gray-700 hover:text-blue-700 transition-colors"
                        >
                          <Filter className="w-3 h-3 text-gray-400" />
                          {tool.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
