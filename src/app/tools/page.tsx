import Link from "next/link";
import Image from "next/image";
import {
  TOOLS,
  TOOL_CATEGORIES,
  getToolsByCategory,
  getToolPath,
  type ToolCategory,
} from "@/lib/tools-registry";
import { 
  ArrowRight,
  FileSearch,
  Globe,
  Video,
  Shapes,
  PenTool,
  ClipboardCheck,
  TrendingUp,
  Layers,
  FileUser,
  Scale,
  Radar,
  Youtube,
  Mic,
  FileAudio,
  MessageSquare,
  Network,
  Clock,
  GitBranch,
  FlaskConical,
  ScanSearch,
  Flame,
  RefreshCw,
  Wand2,
  ShieldCheck,
  BrainCircuit,
  BookA,
  Mail,
  Sparkles,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

export const metadata = {
  title: "AI Tools for Students - Kabyar | 25+ Powerful Study Tools",
  description: "Explore Kabyar's 25+ AI-powered tools: Paraphraser, Humanizer, AI Detector, Problem Solver, Assignment Worker, Video Explainer, PDF Q&A, and more.",
};

const ICON_MAP: Record<string, LucideIcon> = {
  FileSearch, Globe, Video, Shapes, PenTool, ClipboardCheck,
  TrendingUp, Layers, FileUser, Scale, Radar, Youtube, Mic,
  FileAudio, MessageSquare, Network, Clock, GitBranch, FlaskConical,
  ScanSearch, Flame, RefreshCw, Wand2, ShieldCheck, BrainCircuit,
  BookA, Mail, Sparkles,
};

const categories: ToolCategory[] = ["writing", "rag", "research", "media", "visual"];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-10 sm:h-14 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-900 transition">Home</Link>
              <Link href="/tools" className="font-medium text-gray-900">Tools</Link>
              <Link href="/blog" className="text-gray-500 hover:text-gray-900 transition">Blog</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                Log in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — compact & clean */}
      <section className="pt-12 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase tracking-widest mb-3">{TOOLS.length} tools available</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">
            All Tools
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto">
            AI-powered tools for every academic need. Click any tool to get started.
          </p>
        </div>
      </section>

      {/* Tools by Category — minimal list */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {categories.map((cat, catIdx) => {
            const catMeta = TOOL_CATEGORIES[cat];
            const tools = getToolsByCategory(cat);
            const CatIcon = ICON_MAP[catMeta.icon] || Sparkles;

            return (
              <div key={cat} className={catIdx > 0 ? "mt-10 sm:mt-14" : ""}>
                {/* Category label */}
                <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-900 flex items-center justify-center">
                    <CatIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wide">{catMeta.name}</h2>
                  <span className="text-[10px] sm:text-xs text-gray-300 font-medium ml-1">{tools.length}</span>
                </div>

                {/* Tool rows */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                  {tools.map((tool) => {
                    const ToolIcon = ICON_MAP[tool.icon] || Sparkles;
                    const isComingSoon = tool.status === "coming-soon";

                    return (
                      <Link
                        key={tool.slug}
                        href={isComingSoon ? "#" : getToolPath(tool)}
                        className={`group flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 transition-all duration-200 ${
                          isComingSoon
                            ? "opacity-40 cursor-default"
                            : "hover:bg-blue-50/40"
                        }`}
                      >
                        {/* Icon */}
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors duration-200">
                          <ToolIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:text-white transition-colors duration-200" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-[15px] font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {tool.name}
                            </h3>
                            {isComingSoon && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[9px] font-semibold rounded-md shrink-0">
                                Soon
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5 hidden sm:block">
                            {tool.shortDescription}
                          </p>
                        </div>

                        {/* Features — desktop only */}
                        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                          {tool.features.slice(0, 2).map((f) => (
                            <span key={f} className="px-2 py-0.5 rounded-md bg-gray-50 text-[10px] text-gray-400 font-medium">
                              {f}
                            </span>
                          ))}
                        </div>

                        {/* Credits */}
                        <span className="text-[10px] sm:text-xs text-gray-300 font-medium shrink-0 hidden sm:block">
                          {tool.credits}cr
                        </span>

                        {/* Arrow */}
                        {!isComingSoon && (
                          <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA — minimal */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
            Ready to Start?
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mb-8">
            All {TOOLS.length} tools, one account. Free to start.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer — minimal */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-10 sm:h-12 w-auto" />
          <div className="flex gap-5 text-xs sm:text-sm">
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
          <p className="text-xs sm:text-sm">&copy; 2026 Kabyar</p>
        </div>
      </footer>
    </div>
  );
}
