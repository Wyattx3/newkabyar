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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; light: string; border: string }> = {
  blue: { bg: "bg-blue-600", text: "text-blue-600", light: "bg-blue-50", border: "border-blue-100" },
  emerald: { bg: "bg-emerald-600", text: "text-emerald-600", light: "bg-emerald-50", border: "border-emerald-100" },
  purple: { bg: "bg-violet-600", text: "text-violet-600", light: "bg-violet-50", border: "border-violet-100" },
  amber: { bg: "bg-amber-600", text: "text-amber-600", light: "bg-amber-50", border: "border-amber-100" },
  rose: { bg: "bg-rose-600", text: "text-rose-600", light: "bg-rose-50", border: "border-rose-100" },
};

const categories: ToolCategory[] = ["rag", "research", "media", "visual", "writing"];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center h-8">
              <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-16 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
              <Link href="/tools" className="text-sm font-medium text-blue-600">Tools</Link>
              <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900">Blog</Link>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Login</Link>
              <Link 
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started Free
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {TOOLS.length}+ AI-Powered Tools
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            From essay paraphrasing to problem solving, video explainers to assignment automation — everything you need in one platform.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try All Tools Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Tools by Category */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {categories.map((cat) => {
            const catMeta = TOOL_CATEGORIES[cat];
            const tools = getToolsByCategory(cat);
            const colors = CATEGORY_COLORS[catMeta.color] || CATEGORY_COLORS.blue;
            const CatIcon = ICON_MAP[catMeta.icon] || Sparkles;

            return (
              <div key={cat} className="mb-16 last:mb-0">
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-8">
                  <div className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center`}>
                    <CatIcon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{catMeta.name}</h2>
                    <p className="text-sm text-gray-500">{catMeta.description}</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    {tools.length} tools
                  </span>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tools.map((tool) => {
                    const ToolIcon = ICON_MAP[tool.icon] || Sparkles;
                    const isComingSoon = tool.status === "coming-soon";

                    return (
                      <Link
                        key={tool.slug}
                        href={isComingSoon ? "#" : getToolPath(tool)}
                        className={`group relative p-6 rounded-2xl border transition-all bg-white ${
                          isComingSoon
                            ? "border-gray-100 opacity-60 cursor-default"
                            : "border-gray-200 hover:border-blue-200 hover:shadow-xl hover:-translate-y-1"
                        }`}
                      >
                        {isComingSoon && (
                          <span className="absolute top-4 right-4 px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-semibold rounded-full">
                            Coming Soon
                          </span>
                        )}

                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.light} mb-4 group-hover:scale-110 transition-transform`}>
                          <ToolIcon className={`w-6 h-6 ${colors.text}`} />
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {tool.name}
                        </h3>

                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {tool.shortDescription}
                        </p>

                        {/* Features */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {tool.features.slice(0, 3).map((f) => (
                            <span key={f} className="px-2 py-0.5 rounded-md bg-gray-50 text-[11px] text-gray-500 font-medium">
                              {f}
                            </span>
                          ))}
                        </div>

                        {/* Credits & Arrow */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {tool.credits} credits / use
                          </span>
                          {!isComingSoon && (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Try it <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Study Smarter?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of students using Kabyar&apos;s {TOOLS.length}+ AI tools to improve their grades.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center h-8">
              <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-16 w-auto" />
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            </div>
            <p className="text-sm">&copy; 2026 Kabyar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
