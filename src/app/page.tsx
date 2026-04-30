"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ShieldCheck,
  Wand2,
  ArrowRight,
  Zap,
  Brain,
  Star,
  Check,
  Clock,
  Users,
  TrendingUp,
  Lightbulb,
  Rocket,
  Globe,
  Cpu,
  Layers,
  PenTool,
  Award,
  BarChart3,
  Sparkle,
  ScanSearch,
  BrainCircuit,
  Flame,
  Video,
  Scale,
  BookA,
  Mail,
  FileSearch,
  GraduationCap,
  ClipboardCheck,
  Target,
  Trophy,
  Radar,
  Youtube,
  Mic,
  FileAudio,
  MessageSquare,
  Network,
  GitBranch,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { HeroBg } from "@/components/landing/hero-bg";
import { LiveDemo } from "@/components/landing/live-demo";
import { AnimatedCounter } from "@/components/landing/animated-counter";
import { Magnetic } from "@/components/landing/magnetic-button";

type Tool = {
  name: string;
  slug: string;
  category: string;
  icon: LucideIcon;
  desc: string;
  features: string[];
};

const tools: Tool[] = [
  // Writing & Helpers
  { name: "Safe Paraphraser", slug: "paraphraser", category: "writing", icon: RefreshCw, desc: "Rewrite text for clarity and academic tone while preserving the original meaning", features: ["Multiple styles", "Tone control", "Side-by-side"] },
  { name: "Content Humanizer", slug: "humanizer", category: "writing", icon: Wand2, desc: "Transform AI-generated text into natural, human-sounding content that bypasses detection", features: ["AI bypass", "Natural flow", "Word match"] },
  { name: "AI Detector", slug: "ai-detector", category: "writing", icon: ShieldCheck, desc: "Check if your content appears AI-generated with detailed analysis and highlights", features: ["Circle charts", "Red highlights", "Instant"] },
  { name: "Problem Solver", slug: "image-solve", category: "writing", icon: ScanSearch, desc: "Upload a photo of any problem and get step-by-step solutions with explanations", features: ["Image & text", "Step-by-step", "Tutor chat"] },
  { name: "Assignment Worker", slug: "assignment-worker", category: "writing", icon: BrainCircuit, desc: "AI autonomously decomposes and completes your entire assignment end-to-end", features: ["Agentic", "Multi-task", "PDF/DOC"] },
  { name: "Video Explainer", slug: "video-explainer", category: "writing", icon: Video, desc: "Generate animated explainer videos with narration for any topic", features: ["Animated", "Narration", "Topic art"] },
  { name: "Devil's Advocate", slug: "devils-advocate", category: "writing", icon: Scale, desc: "Present your argument and get strong counter-arguments for debate prep", features: ["Counters", "Weakness", "Debate"] },
  { name: "Vocabulary Upgrader", slug: "vocabulary-upgrader", category: "writing", icon: BookA, desc: "Transform simple text into sophisticated academic writing with advanced vocabulary", features: ["Synonyms", "Academic", "Inline"] },
  { name: "Cold Email Generator", slug: "cold-email", category: "writing", icon: Mail, desc: "Generate personalized professional emails for internships, networking, or jobs", features: ["Personal", "Templates", "Follow-ups"] },
  { name: "Roast My Assignment", slug: "roast-assignment", category: "writing", icon: Flame, desc: "Get brutally honest feedback on your assignment with actionable improvement tips", features: ["Honest", "Grade", "Fixes"] },
  // RAG & Documents
  { name: "PDF Q&A Sniper", slug: "pdf-qa", category: "rag", icon: FileSearch, desc: "Upload any PDF and ask questions — get precise answers with page citations", features: ["Vector search", "Citations", "Follow-ups"] },
  { name: "Quiz Generator", slug: "quiz-generator", category: "rag", icon: ClipboardCheck, desc: "Transform any text or PDF into interactive quizzes with MCQs and answer keys", features: ["MCQs", "True/False", "Keys"] },
  { name: "Past Paper Analyzer", slug: "past-paper", category: "rag", icon: TrendingUp, desc: "Analyze exam papers to predict likely topics and question trends", features: ["Trends", "Frequency", "Predict"] },
  { name: "Flashcard Maker", slug: "flashcard-maker", category: "rag", icon: Layers, desc: "Convert any text or notes into study flashcards with Anki export support", features: ["Front/Back", "Anki", "Bulk"] },
  // Research
  { name: "Academic Consensus", slug: "academic-consensus", category: "research", icon: Scale, desc: "Search academic papers to find scientific consensus on any topic", features: ["Meter", "Snapshots", "Citations"] },
  { name: "Research Gap Finder", slug: "research-gap", category: "research", icon: Radar, desc: "Analyze existing research to identify unexplored areas and opportunities", features: ["Gaps", "Mapping", "Scoring"] },
  // Media
  { name: "YouTube Summarizer", slug: "youtube-summarizer", category: "media", icon: Youtube, desc: "Paste any YouTube link to get AI-generated summaries with timestamps", features: ["Transcript", "Moments", "Stamps"] },
  { name: "PDF to Podcast", slug: "pdf-podcast", category: "media", icon: Mic, desc: "Transform any PDF or text into an engaging two-person podcast dialogue", features: ["Two voices", "Natural", "Audio"] },
  { name: "Lecture Organizer", slug: "lecture-organizer", category: "media", icon: FileAudio, desc: "Transform lecture transcripts into organized notes with key points", features: ["Topics", "Key points", "Q-bank"] },
  { name: "Viva Simulator", slug: "viva-simulator", category: "media", icon: MessageSquare, desc: "Practice for oral exams with an AI examiner and get real-time feedback", features: ["Realtime", "Follow-ups", "Score"] },
  // Visual
  { name: "Mind Map Generator", slug: "mind-map", category: "visual", icon: Network, desc: "Convert any topic or text into a visual mind map for brainstorming", features: ["Mermaid", "Hierarchy", "Interactive"] },
  { name: "Interactive Timeline", slug: "timeline", category: "visual", icon: Clock, desc: "Create chronological timelines for any historical topic or project", features: ["Dates", "Events", "Periods"] },
  { name: "Text to Flowchart", slug: "flowchart", category: "visual", icon: GitBranch, desc: "Convert process descriptions into clear flowcharts and decision trees", features: ["Auto-layout", "Nodes", "SVG/PNG"] },
  { name: "Lab Report Generator", slug: "lab-report", category: "visual", icon: FlaskConical, desc: "Enter raw experimental data and get a properly structured lab report", features: ["IMRaD", "Analysis", "Conclusion"] },
];

const flagshipTools = [
  tools.find((t) => t.slug === "humanizer")!,
  tools.find((t) => t.slug === "ai-detector")!,
  tools.find((t) => t.slug === "image-solve")!,
  tools.find((t) => t.slug === "pdf-qa")!,
  tools.find((t) => t.slug === "assignment-worker")!,
  tools.find((t) => t.slug === "video-explainer")!,
  tools.find((t) => t.slug === "academic-consensus")!,
  tools.find((t) => t.slug === "mind-map")!,
];

const testimonials = [
  { name: "Sarah Mitchell", program: "IGCSE", text: "Kabyar completely transformed how I approach my studies. My essay grades improved from C to A in just two months.", avatar: "S", rating: 5 },
  { name: "Alex Kim", program: "GED", text: "Passed my GED on the first try thanks to the AI tutor. It explained concepts in ways my teachers never could.", avatar: "A", rating: 5 },
  { name: "Maya Thompson", program: "OTHM", text: "The homework helper is incredible. It doesn't just give answers, it teaches you the underlying concepts.", avatar: "M", rating: 5 },
  { name: "James Chen", program: "A-Levels", text: "Study guide generator saved me during exam season. Created perfect revision materials in minutes.", avatar: "J", rating: 5 },
  { name: "Emma Davis", program: "IB", text: "The AI detector and humanizer combo is essential. Never worried about my essays being flagged again.", avatar: "E", rating: 5 },
  { name: "Ryan Park", program: "University", text: "Best investment for my education. The presentation maker helped me ace my final project.", avatar: "R", rating: 5 },
];

const aiModels = [
  { name: "GPT-4", desc: "OpenAI", icon: Brain },
  { name: "Claude", desc: "Anthropic", icon: Cpu },
  { name: "Gemini", desc: "Google", icon: Sparkle },
  { name: "Grok", desc: "xAI", icon: Zap },
  { name: "Groq", desc: "fastest", icon: Rocket },
];

const howItWorks = [
  { step: "01", title: "Sign up free", desc: "No credit card required. 50 credits a day on the house.", icon: Users },
  { step: "02", title: "Pick a tool", desc: "24+ AI tools spanning research, writing, audio, visuals.", icon: Layers },
  { step: "03", title: "Paste or upload", desc: "Drop a PDF, paste a question, snap a photo of a problem.", icon: PenTool },
  { step: "04", title: "Ship the work", desc: "Stream-typed answers, citations, exports — submit-ready.", icon: Rocket },
];

const programs = [
  { name: "GED", students: "2,500+", icon: Award },
  { name: "IGCSE", students: "3,200+", icon: Globe },
  { name: "OTHM", students: "1,800+", icon: Trophy },
  { name: "A-Levels", students: "2,100+", icon: BarChart3 },
  { name: "IB", students: "1,500+", icon: Target },
  { name: "AP", students: "1,200+", icon: Lightbulb },
  { name: "SAT/ACT", students: "900+", icon: TrendingUp },
  { name: "University", students: "4,000+", icon: GraduationCap },
];

const stats = [
  { value: 24, suffix: "+", label: "AI tools, one platform" },
  { value: 17000, suffix: "+", label: "Students shipping work" },
  { value: 1.5, suffix: "x", label: "Avg grade lift, first term", decimals: 1 },
  { value: 99, suffix: "%", label: "Humanizer pass rate" },
];

const comparisons = [
  { feature: "AI Detection & Bypass", kay: true, others: false },
  { feature: "Content Humanizer", kay: true, others: false },
  { feature: "Image Problem Solver", kay: true, others: false },
  { feature: "Agentic Assignment Worker", kay: true, others: false },
  { feature: "Video Explainer with AI Narration", kay: true, others: false },
  { feature: "PDF Q&A with References", kay: true, others: true },
  { feature: "Smart Paraphraser", kay: true, others: true },
  { feature: "24+ Tools in One Platform", kay: true, others: false },
];

const ROTATING_VERBS = ["Write.", "Detect.", "Humanize.", "Solve.", "Summarize.", "Practice."];

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [verbIdx, setVerbIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setInterval(() => setVerbIdx((p) => (p + 1) % ROTATING_VERBS.length), 2200);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(t);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      <ScrollProgress />

      {/* === Floating Header === */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[96%] sm:w-[95%] max-w-5xl"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/80 shadow-xl shadow-blue-500/5 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center h-8">
            <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-10 sm:h-14 w-auto" priority />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#tools" className="text-gray-600 hover:text-gray-900 transition relative group">
              Tools
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-blue-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
            <a href="#demo" className="text-gray-600 hover:text-gray-900 transition relative group">
              Live demo
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-blue-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
            <a href="#how" className="text-gray-600 hover:text-gray-900 transition relative group">
              How it works
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-blue-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
            </a>
            <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition relative group">
              Blog
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-blue-600 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Link>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2.5 sm:px-4 py-2 rounded-xl hover:bg-gray-100 transition">
              Log in
            </Link>
            <Magnetic strength={0.3}>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl px-4 sm:px-5 text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all">
                <Link href="/register">Start free</Link>
              </Button>
            </Magnetic>
          </div>
        </div>
      </motion.header>

      {/* === Hero === */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-24 sm:pt-28 pb-12 overflow-hidden">
        <HeroBg scrollY={scrollY} />

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur border border-blue-100 text-[11px] sm:text-xs font-medium text-blue-700 mb-7 sm:mb-9 shadow-sm shadow-blue-500/10"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>
            <span className="font-mono uppercase tracking-wider text-[10px] sm:text-[11px]">Live</span>
            <span className="w-px h-3 bg-blue-200" />
            <span>The AI study OS for serious students</span>
          </motion.div>

          {/* Headline with rotating verb */}
          <h1 className="text-[44px] leading-[1.02] sm:text-[68px] md:text-[88px] lg:text-[104px] font-black tracking-[-0.03em] mb-6 sm:mb-7">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
            >
              <span className="text-gray-900">Study smarter</span>
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
            >
              <span className="relative inline-block min-w-[5ch] text-left text-blue-600">
                {ROTATING_VERBS.map((v, i) => (
                  <motion.span
                    key={v}
                    className="absolute inset-0"
                    initial={{ y: "100%", opacity: 0, filter: "blur(8px)" }}
                    animate={
                      i === verbIdx
                        ? { y: "0%", opacity: 1, filter: "blur(0px)" }
                        : { y: "-100%", opacity: 0, filter: "blur(8px)" }
                    }
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    aria-hidden={i !== verbIdx}
                  >
                    {v}
                  </motion.span>
                ))}
                {/* phantom for sizing */}
                <span className="invisible">{ROTATING_VERBS.reduce((a, b) => (a.length > b.length ? a : b))}</span>
              </span>
            </motion.span>
            <motion.span
              className="block text-gray-900"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.31 }}
            >
              In one platform.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.42 }}
            className="text-base sm:text-xl md:text-[22px] text-gray-600 mb-9 sm:mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            <span className="font-semibold text-gray-900">{tools.length} AI tools</span> built for GED, IGCSE, OTHM and beyond. Humanize, detect, solve, summarize, build. One subscription, every workflow.
          </motion.p>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.55 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 mb-12 sm:mb-16"
          >
            <Magnetic strength={0.2}>
              <Button asChild size="lg" className="group bg-blue-600 hover:bg-blue-700 h-14 px-9 text-base sm:text-lg rounded-2xl shadow-2xl shadow-blue-600/35 transition-all border-0 relative overflow-hidden">
                <Link href="/register">
                  <span className="relative z-10 flex items-center">
                    Start free, no card
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 bg-blue-700" aria-hidden />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild variant="outline" size="lg" className="h-14 px-9 text-base sm:text-lg rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
              <Link href="#demo">See it in action</Link>
            </Button>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-10 gap-y-3 text-[11px] sm:text-xs font-mono text-gray-500"
          >
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600" /> 50 free credits / day
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600" /> No credit card
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-blue-600" /> 6 languages
            </span>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2 text-gray-400"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest">scroll</span>
          <span className="block w-px h-10 bg-gradient-to-b from-blue-600 to-transparent animate-pulse" aria-hidden />
        </motion.div>
      </section>

      {/* === AI Models marquee === */}
      <section className="py-10 sm:py-14 border-y border-gray-100 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
          <p className="text-[10px] sm:text-xs font-mono font-semibold text-gray-400 uppercase tracking-[0.2em] text-center">
            Routed across the best models in the world
          </p>
        </div>
        <div className="flex gap-10 sm:gap-16 animate-marquee-left" style={{ animationDuration: "40s" }}>
          {[...aiModels, ...aiModels, ...aiModels, ...aiModels].map((m, i) => {
            const I = m.icon;
            return (
              <div key={`m-${i}`} className="flex-shrink-0 flex items-center gap-3 px-2">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gray-900 flex items-center justify-center">
                  <I className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="leading-tight">
                  <p className="font-bold text-gray-900 text-sm sm:text-base tracking-tight">{m.name}</p>
                  <p className="text-[10px] sm:text-xs text-gray-400 font-mono uppercase tracking-wider">{m.desc}</p>
                </div>
                <span className="w-1 h-1 rounded-full bg-gray-300 ml-6 sm:ml-10" aria-hidden />
              </div>
            );
          })}
        </div>
      </section>

      {/* === Tools — Bento + dual marquee === */}
      <section id="tools" className="py-20 sm:py-32 px-4 sm:px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            tag="Tools"
            title={
              <>
                <span className="text-blue-600">{tools.length} tools</span>. One subscription. Zero context-switching.
              </>
            }
            sub="Every workflow, from a 3am essay panic to a stack of past papers, has a tool here built specifically for it."
          />

          {/* Bento grid — 8 flagship tools, mixed sizes */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 mb-10 sm:mb-14">
            {flagshipTools.map((t, i) => (
              <BentoCard key={t.slug} tool={t} index={i} />
            ))}
          </div>
        </div>

        {/* Dual marquee of all tools */}
        <div className="space-y-3 sm:space-y-4">
          <ToolMarquee tools={tools.slice(0, 12)} direction="left" />
          <ToolMarquee tools={tools.slice(12)} direction="right" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 sm:mt-14 flex justify-center">
          <Button asChild variant="outline" size="lg" className="h-12 px-8 rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 group">
            <Link href="/tools">
              Browse all {tools.length} tools <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* === Live demo === */}
      <section id="demo" className="py-20 sm:py-32 px-4 sm:px-6 bg-gradient-to-b from-white to-blue-50/30">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            tag="Live demo"
            title={
              <>
                Watch Kabyar work in <span className="text-blue-600">real time</span>.
              </>
            }
            sub="Same engine that powers the dashboard, on autoplay. Click a tab to switch."
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <LiveDemo />
          </motion.div>
        </div>
      </section>

      {/* === How it works === */}
      <section id="how" className="py-20 sm:py-32 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            tag="Workflow"
            title={
              <>
                Sign up to submit-ready in <span className="text-blue-600">four steps</span>.
              </>
            }
            sub="No setup, no model picking, no prompt engineering. Just paste, click, ship."
          />

          <div className="relative">
            {/* Animated connector line */}
            <svg
              className="hidden lg:block absolute top-8 left-[10%] right-[10%] w-[80%] h-1"
              viewBox="0 0 800 4"
              preserveAspectRatio="none"
              aria-hidden
            >
              <motion.line
                x1="0" y1="2" x2="800" y2="2"
                stroke="#dbeafe" strokeWidth="2" strokeDasharray="6 6"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.6, ease: "easeOut" }}
              />
            </svg>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
              {howItWorks.map((s, i) => {
                const I = s.icon;
                return (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex flex-col items-center text-center group"
                  >
                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center mb-5 group-hover:border-blue-400 group-hover:shadow-xl group-hover:shadow-blue-500/10 transition-all duration-300">
                      <span className="font-mono text-xs text-gray-400 absolute top-1.5 left-2">{s.step}</span>
                      <I className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base mb-2">{s.title}</h3>
                    <p className="text-sm text-gray-500 max-w-[220px] leading-relaxed">{s.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* === Stats === */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-950 text-white relative overflow-hidden">
        {/* Subtle blue accents */}
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-blue-600/20 blur-[120px]" aria-hidden />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-blue-600/15 blur-[120px]" aria-hidden />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_50%,transparent_100%)]" aria-hidden />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="text-center"
              >
                <div className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-2 text-white">
                  {s.decimals ? (
                    <>
                      <AnimatedCounter value={Math.floor(s.value)} />
                      .{Math.round((s.value % 1) * 10)}
                      {s.suffix}
                    </>
                  ) : (
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-400 font-mono uppercase tracking-widest leading-snug">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === Programs marquee === */}
      <section className="py-16 sm:py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8 sm:mb-12">
          <SectionHeader
            tag="Programs"
            title={<>Tuned for <span className="text-blue-600">your curriculum</span>.</>}
            sub="From GED to IB to university coursework — Kabyar speaks the syllabus."
            align="center"
          />
        </div>
        <div className="flex gap-3 sm:gap-4 animate-marquee-left" style={{ animationDuration: "30s" }}>
          {[...programs, ...programs, ...programs].map((p, i) => {
            const I = p.icon;
            return (
              <div key={`p-${i}`} className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <I className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{p.students} students</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* === Testimonials dual marquee === */}
      <section id="testimonials" className="py-20 sm:py-28 bg-gradient-to-b from-blue-50/30 to-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-10 sm:mb-14">
          <SectionHeader
            tag="Reception"
            title={<>Loved by students <span className="text-blue-600">who actually graduate</span>.</>}
            sub="Real submissions, real grade lifts. Not a single fake review in the bunch."
            align="center"
          />
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex gap-3 sm:gap-4 animate-marquee-right" style={{ animationDuration: "55s" }}>
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={`t1-${i}`} t={t} />
            ))}
          </div>
          <div className="flex gap-3 sm:gap-4 animate-marquee-left" style={{ animationDuration: "65s" }}>
            {[...testimonials.slice().reverse(), ...testimonials.slice().reverse()].map((t, i) => (
              <TestimonialCard key={`t2-${i}`} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* === Comparison === */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            tag="Comparison"
            title={<>Why pay for <span className="text-blue-600">eight tools</span> when you can pay for one?</>}
            sub="The single-AI-app crowd ships you a chat box. We ship you the whole studio."
            align="center"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
          >
            <div className="grid grid-cols-3 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
              <p className="text-[10px] sm:text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">Feature</p>
              <p className="text-[10px] sm:text-xs font-mono font-bold text-blue-600 uppercase tracking-widest text-center">Kabyar</p>
              <p className="text-[10px] sm:text-xs font-mono font-semibold text-gray-300 uppercase tracking-widest text-center">Other AIs</p>
            </div>
            {comparisons.map((c, i) => (
              <motion.div
                key={c.feature}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="grid grid-cols-3 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors"
              >
                <p className="text-xs sm:text-sm text-gray-700 font-medium">{c.feature}</p>
                <div className="flex justify-center">
                  {c.kay ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 + 0.2, type: "spring", stiffness: 280 }}
                      className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30"
                    >
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </div>
                <div className="flex justify-center">
                  {c.others ? (
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* === Final CTA === */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_50%,transparent_100%)]" aria-hidden />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/15 blur-[120px] rounded-full" aria-hidden />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] sm:text-xs font-mono font-medium text-blue-700 mb-6 uppercase tracking-widest"
          >
            <Sparkles className="w-3.5 h-3.5" /> 50 free credits a day
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-gray-900 mb-6"
          >
            The hard part of school is{" "}
            <span className="relative inline-block text-blue-600">
              over.
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 right-0 -bottom-1 h-1.5 bg-blue-600 origin-left rounded-full"
              />
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
          >
            Join 17,000+ students moving faster, writing sharper, and shipping work that actually represents what they know.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4"
          >
            <Magnetic strength={0.25}>
              <Button asChild size="lg" className="group bg-blue-600 hover:bg-blue-700 h-14 px-9 text-base sm:text-lg rounded-2xl shadow-2xl shadow-blue-600/35 transition-all border-0">
                <Link href="/register">
                  Start free <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild variant="outline" size="lg" className="h-14 px-9 text-base sm:text-lg rounded-2xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </motion.div>

          <p className="mt-8 text-xs font-mono text-gray-400 uppercase tracking-widest">
            No credit card · cancel anytime · 6 languages
          </p>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="py-16 px-4 sm:px-6 bg-gray-950 text-gray-400 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-600 to-transparent" aria-hidden />

        <div className="max-w-6xl mx-auto relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center mb-4">
                <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-12 sm:h-14 w-auto invert brightness-200" />
              </div>
              <p className="text-sm leading-relaxed max-w-xs">Your intelligent study companion. AI-powered tools for students who actually want to learn.</p>
              <div className="flex items-center gap-2 mt-5 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping-slow" />
                <span>All systems operational</span>
              </div>
            </div>
            <FooterCol title="Tools" links={[
              { label: "Safe Paraphraser", href: "/tools/paraphraser" },
              { label: "Content Humanizer", href: "/tools/humanizer" },
              { label: "AI Detector", href: "/tools/ai-detector" },
              { label: "Problem Solver", href: "/tools/image-solve" },
              { label: "Assignment Worker", href: "/tools/assignment-worker" },
            ]} />
            <FooterCol title="Resources" links={[
              { label: "Blog", href: "/blog" },
              { label: "All Tools", href: "/tools" },
              { label: "Video Explainer", href: "/tools/video-explainer" },
              { label: "PDF Q&A", href: "/tools/pdf-qa" },
              { label: "Roast My Assignment", href: "/tools/roast-assignment" },
            ]} />
            <FooterCol title="Company" links={[
              { label: "About Us", href: "/about" },
              { label: "Contact", href: "/contact" },
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
            ]} />
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm">© 2026 Kabyar. Built for students who refuse to fall behind.</p>
            <div className="flex gap-6 text-xs sm:text-sm">
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
              <Link href="/contact" className="hover:text-white transition">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ====== sub-components ====== */

function SectionHeader({
  tag,
  title,
  sub,
  align = "left",
}: {
  tag: string;
  title: React.ReactNode;
  sub: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`mb-10 sm:mb-14 max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] sm:text-[11px] font-mono font-semibold text-blue-700 uppercase tracking-[0.2em] mb-5 ${align === "center" ? "" : ""}`}>
        <span className="w-1 h-1 rounded-full bg-blue-600" />
        {tag}
      </span>
      <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.05] mb-4">
        {title}
      </h2>
      <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl">{sub}</p>
    </motion.div>
  );
}

function BentoCard({ tool, index }: { tool: Tool; index: number }) {
  const Icon = tool.icon;
  // Bento sizing pattern: 0=6, 1=3, 2=3, 3=4, 4=4, 5=4, 6=6, 7=6
  const spans = [
    "col-span-12 sm:col-span-6 row-span-2",
    "col-span-6 sm:col-span-3",
    "col-span-6 sm:col-span-3",
    "col-span-6 sm:col-span-4",
    "col-span-6 sm:col-span-4",
    "col-span-12 sm:col-span-4",
    "col-span-12 sm:col-span-6",
    "col-span-12 sm:col-span-6",
  ];
  const span = spans[index] ?? "col-span-12 sm:col-span-3";
  const isLarge = index === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={`${span} group relative`}
    >
      <Link
        href={`/dashboard/${tool.category}/${tool.slug}`}
        className={`block h-full rounded-3xl border border-gray-200 bg-white p-5 sm:p-7 transition-all duration-500 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 relative overflow-hidden ${
          isLarge ? "min-h-[320px]" : "min-h-[170px]"
        }`}
      >
        {/* Hover sweep */}
        <span
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              "radial-gradient(400px circle at var(--card-mx, 50%) var(--card-my, 50%), rgba(37,99,235,0.08), transparent 60%)",
          }}
          aria-hidden
        />
        {/* Mono index */}
        <span className="absolute top-4 right-5 text-[10px] font-mono text-gray-300 group-hover:text-blue-300 transition">
          {String(index + 1).padStart(2, "0")} / {String(8).padStart(2, "0")}
        </span>

        <div className="relative flex flex-col h-full">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className={`font-bold text-gray-900 mb-2 leading-tight ${isLarge ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"}`}>
            {tool.name}
          </h3>
          <p className={`text-gray-500 leading-relaxed ${isLarge ? "text-base mb-5" : "text-xs sm:text-sm line-clamp-2"}`}>
            {tool.desc}
          </p>
          {isLarge && (
            <div className="mt-auto flex flex-wrap gap-2">
              {tool.features.map((f) => (
                <span key={f} className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono">
                  {f}
                </span>
              ))}
            </div>
          )}
          {!isLarge && (
            <div className="mt-auto pt-3 flex items-center text-xs font-mono text-gray-400 group-hover:text-blue-600 transition">
              try <ArrowRight className="ml-1 w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function ToolMarquee({
  tools,
  direction,
}: {
  tools: Tool[];
  direction: "left" | "right";
}) {
  const cls = direction === "left" ? "animate-marquee-left" : "animate-marquee-right";
  return (
    <div className="relative overflow-hidden">
      <div className={`flex gap-3 sm:gap-4 ${cls}`} style={{ animationDuration: direction === "left" ? "70s" : "80s" }}>
        {[...tools, ...tools].map((t, i) => {
          const I = t.icon;
          return (
            <Link
              key={`${direction}-${i}`}
              href={`/dashboard/${t.category}/${t.slug}`}
              className="group flex-shrink-0 w-[280px] sm:w-[320px] bg-white rounded-2xl border border-gray-200 hover:border-blue-300 p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                  <I className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{t.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function TestimonialCard({ t }: { t: typeof testimonials[number] }) {
  return (
    <div className="flex-shrink-0 w-[300px] sm:w-[380px] rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: t.rating }).map((_, j) => (
          <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-gray-700 text-sm sm:text-base mb-5 leading-relaxed line-clamp-4">&quot;{t.text}&quot;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/25">{t.avatar}</div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
          <p className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">{t.program}</p>
        </div>
      </div>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider font-mono">{title}</h4>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-white transition relative inline-block group">
              {l.label}
              <span className="absolute left-0 right-0 -bottom-0.5 h-px bg-blue-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
