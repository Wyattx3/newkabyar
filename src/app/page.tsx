"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  FileText,
  ShieldCheck,
  Wand2,
  ArrowRight,
  Zap,
  Brain,
  Target,
  Trophy,
  Star,
  ChevronDown,
  Check,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Lightbulb,
  Rocket,
  Heart,
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
  FileUser,
  Radar,
  Youtube,
  Mic,
  FileAudio,
  MessageSquare,
  Network,
  GitBranch,
  FlaskConical,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";

const tools = [
  // === Writing & Helpers ===
  { name: "Safe Paraphraser", slug: "paraphraser", category: "writing", icon: RefreshCw, desc: "Rewrite text for clarity and academic tone while preserving the original meaning", color: "from-blue-500 to-blue-600", features: ["Multiple styles", "Tone control", "Side-by-side view"] },
  { name: "Content Humanizer", slug: "humanizer", category: "writing", icon: Wand2, desc: "Transform AI-generated text into natural, human-sounding content that bypasses detection", color: "from-violet-500 to-violet-600", features: ["AI bypass", "Natural flow", "Word-count match"] },
  { name: "AI Detector", slug: "ai-detector", category: "writing", icon: ShieldCheck, desc: "Check if your content appears AI-generated with detailed analysis and highlights", color: "from-emerald-500 to-emerald-600", features: ["Circle charts", "Red highlights", "Instant scan"] },
  { name: "Problem Solver", slug: "image-solve", category: "writing", icon: ScanSearch, desc: "Upload a photo of any problem and get step-by-step solutions with explanations", color: "from-rose-500 to-rose-600", features: ["Image & text", "Step-by-step", "AI tutor chat"] },
  { name: "Assignment Worker", slug: "assignment-worker", category: "writing", icon: BrainCircuit, desc: "AI autonomously decomposes and completes your entire assignment end-to-end", color: "from-amber-500 to-amber-600", features: ["Agentic AI", "Multi-task", "PDF/DOC input"] },
  { name: "Video Explainer", slug: "video-explainer", category: "writing", icon: Video, desc: "Generate animated explainer videos with narration for any topic", color: "from-cyan-500 to-cyan-600", features: ["Animated scenes", "AI narration", "Topic images"] },
  { name: "Devil's Advocate", slug: "devils-advocate", category: "writing", icon: Scale, desc: "Present your argument and get strong counter-arguments for debate prep", color: "from-pink-500 to-pink-600", features: ["Counter-arguments", "Weakness finding", "Debate points"] },
  { name: "Vocabulary Upgrader", slug: "vocabulary-upgrader", category: "writing", icon: BookA, desc: "Transform simple text into sophisticated academic writing with advanced vocabulary", color: "from-indigo-500 to-indigo-600", features: ["Synonym suggestions", "Academic register", "Inline highlights"] },
  { name: "Cold Email Generator", slug: "cold-email", category: "writing", icon: Mail, desc: "Generate personalized professional emails for internships, networking, or jobs", color: "from-blue-500 to-blue-600", features: ["Personalization", "Multiple templates", "Follow-up variants"] },
  { name: "Roast My Assignment", slug: "roast-assignment", category: "writing", icon: Flame, desc: "Get brutally honest feedback on your assignment with actionable improvement tips", color: "from-rose-500 to-rose-600", features: ["Honest roasts", "Grade prediction", "Fix suggestions"] },
  // === RAG & Documents ===
  { name: "PDF Q&A Sniper", slug: "pdf-qa", category: "rag", icon: FileSearch, desc: "Upload any PDF and ask questions — get precise answers with page citations", color: "from-blue-500 to-blue-600", features: ["Vector search", "Page citations", "Follow-ups"] },
  { name: "Quiz Generator", slug: "quiz-generator", category: "rag", icon: ClipboardCheck, desc: "Transform any text or PDF into interactive quizzes with MCQs and answer keys", color: "from-emerald-500 to-emerald-600", features: ["MCQ generation", "True/False", "Answer keys"] },
  { name: "Past Paper Analyzer", slug: "past-paper", category: "rag", icon: TrendingUp, desc: "Analyze exam papers to predict likely topics and question trends", color: "from-violet-500 to-violet-600", features: ["Trend analysis", "Topic frequency", "Prediction"] },
  { name: "Flashcard Maker", slug: "flashcard-maker", category: "rag", icon: Layers, desc: "Convert any text or notes into study flashcards with Anki export support", color: "from-amber-500 to-amber-600", features: ["Front/Back cards", "Anki export", "Bulk generation"] },
  { name: "Resume/CV Tailor", slug: "resume-tailor", category: "rag", icon: FileUser, desc: "Upload your CV and a job description — get AI-powered tailoring suggestions", color: "from-cyan-500 to-cyan-600", features: ["Skill matching", "Gap analysis", "ATS optimization"] },
  // === Research & Search ===
  { name: "Academic Consensus", slug: "academic-consensus", category: "research", icon: Scale, desc: "Search academic papers to find scientific consensus on any topic", color: "from-emerald-500 to-emerald-600", features: ["Consensus meter", "Study snapshots", "Citation links"] },
  { name: "Research Gap Finder", slug: "research-gap", category: "research", icon: Radar, desc: "Analyze existing research to identify unexplored areas and opportunities", color: "from-pink-500 to-pink-600", features: ["Gap identification", "Literature mapping", "Opportunity scoring"] },
  // === Audio & Video ===
  { name: "YouTube Summarizer", slug: "youtube-summarizer", category: "media", icon: Youtube, desc: "Paste any YouTube link to get AI-generated summaries with timestamps", color: "from-rose-500 to-rose-600", features: ["Transcript extraction", "Key moments", "Timestamp links"] },
  { name: "PDF to Podcast", slug: "pdf-podcast", category: "media", icon: Mic, desc: "Transform any PDF or text into an engaging two-person podcast dialogue", color: "from-violet-500 to-violet-600", features: ["Two speakers", "Natural conversation", "Audio export"] },
  { name: "Lecture Organizer", slug: "lecture-organizer", category: "media", icon: FileAudio, desc: "Transform lecture transcripts into organized notes with key points", color: "from-blue-500 to-blue-600", features: ["Topic segmentation", "Key points", "Exam questions"] },
  { name: "Viva Simulator", slug: "viva-simulator", category: "media", icon: MessageSquare, desc: "Practice for oral exams with an AI examiner and get real-time feedback", color: "from-indigo-500 to-indigo-600", features: ["Real-time feedback", "Follow-up questions", "Performance analysis"] },
  // === Visual & Diagrams ===
  { name: "Mind Map Generator", slug: "mind-map", category: "visual", icon: Network, desc: "Convert any topic or text into a visual mind map for brainstorming", color: "from-amber-500 to-amber-600", features: ["Mermaid diagrams", "Hierarchy levels", "Interactive view"] },
  { name: "Interactive Timeline", slug: "timeline", category: "visual", icon: Clock, desc: "Create chronological timelines for any historical topic or project", color: "from-cyan-500 to-cyan-600", features: ["Date ordering", "Event descriptions", "Period grouping"] },
  { name: "Text to Flowchart", slug: "flowchart", category: "visual", icon: GitBranch, desc: "Convert process descriptions into clear flowcharts and decision trees", color: "from-emerald-500 to-emerald-600", features: ["Auto-layout", "Decision nodes", "Export SVG/PNG"] },
  { name: "Lab Report Generator", slug: "lab-report", category: "visual", icon: FlaskConical, desc: "Enter raw experimental data and get a properly structured lab report", color: "from-pink-500 to-pink-600", features: ["IMRaD format", "Data analysis", "Conclusion writing"] },
];

const testimonials = [
  { 
    name: "Sarah Mitchell", 
    program: "IGCSE", 
    text: "Kabyar completely transformed how I approach my studies. My essay grades improved from C to A in just two months.",
    avatar: "S",
    rating: 5
  },
  { 
    name: "Alex Kim", 
    program: "GED", 
    text: "Passed my GED on the first try thanks to the AI tutor. It explained concepts in ways my teachers never could.",
    avatar: "A",
    rating: 5
  },
  { 
    name: "Maya Thompson", 
    program: "OTHM", 
    text: "The homework helper is incredible. It doesn't just give answers - it teaches you the underlying concepts.",
    avatar: "M",
    rating: 5
  },
  { 
    name: "James Chen", 
    program: "A-Levels", 
    text: "Study guide generator saved me during exam season. Created perfect revision materials in minutes.",
    avatar: "J",
    rating: 5
  },
  { 
    name: "Emma Davis", 
    program: "IB", 
    text: "The AI detector and humanizer combo is essential. Never worried about my essays being flagged again.",
    avatar: "E",
    rating: 5
  },
  { 
    name: "Ryan Park", 
    program: "University", 
    text: "Best investment for my education. The presentation maker helped me ace my final project.",
    avatar: "R",
    rating: 5
  },
];

const aiModels = [
  { name: "GPT-4", desc: "OpenAI's most capable model", icon: Brain },
  { name: "Claude", desc: "Anthropic's advanced AI", icon: Cpu },
  { name: "Gemini", desc: "Google's multimodal AI", icon: Sparkle },
  { name: "Grok", desc: "xAI's reasoning model", icon: Zap },
];

const howItWorks = [
  { step: "01", title: "Sign Up Free", desc: "Create your account in seconds. No credit card required.", icon: Users },
  { step: "02", title: "Choose Your Tool", desc: "Select from 20+ powerful AI tools designed for students.", icon: Layers },
  { step: "03", title: "Enter Your Request", desc: "Describe what you need - essay topic, homework question, etc.", icon: PenTool },
  { step: "04", title: "Get Results", desc: "Receive high-quality, academic-ready content instantly.", icon: Rocket },
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

const benefits = [
  { 
    title: "Save 10+ Hours Weekly", 
    desc: "Automate repetitive tasks and focus on what matters - actually learning the material.",
    icon: Clock,
    stat: "10hrs+"
  },
  { 
    title: "Improve Your Grades", 
    desc: "Students report an average grade improvement of 1.5 letter grades within the first semester.",
    icon: TrendingUp,
    stat: "+1.5"
  },
  { 
    title: "Learn Faster", 
    desc: "Our AI tutor adapts to your learning style, helping you understand concepts 3x faster.",
    icon: Zap,
    stat: "3x"
  },
  { 
    title: "Stay Undetected", 
    desc: "Our humanizer ensures your content passes all major AI detection tools with flying colors.",
    icon: Shield,
    stat: "99%"
  },
];

const comparisons = [
  { feature: "AI Detection & Bypass", kay: true, others: false },
  { feature: "Content Humanizer", kay: true, others: false },
  { feature: "Image Problem Solver", kay: true, others: false },
  { feature: "Agentic Assignment Worker", kay: true, others: false },
  { feature: "Video Explainer with AI Narration", kay: true, others: false },
  { feature: "PDF Q&A with References", kay: true, others: true },
  { feature: "Smart Paraphraser", kay: true, others: true },
  { feature: "20+ Tools in One Platform", kay: true, others: false },
];

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isVisible, setIsVisible] = useState<{[key: string]: boolean}>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    
    // Intersection Observer for animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[data-animate]").forEach((el) => {
      observerRef.current?.observe(el);
    });

    // Auto-rotate featured tool in the expanded card
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % tools.length);
    }, 5000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observerRef.current?.disconnect();
      clearInterval(interval);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Floating Header */}
      <header className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 z-50 w-[96%] sm:w-[95%] max-w-5xl">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center h-8">
            <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-10 sm:h-16 w-auto" priority />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition">Features</a>
            <Link href="/tools" className="text-gray-600 hover:text-gray-900 transition">Tools</Link>
            <Link href="/blog" className="text-gray-600 hover:text-gray-900 transition">Blog</Link>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition">Reviews</a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2.5 sm:px-4 py-2 rounded-xl hover:bg-gray-100 transition">
              Log in
            </Link>
            <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-xl px-4 sm:px-5 text-xs sm:text-sm shadow-lg shadow-blue-500/25">
              <Link href="/register">Start Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] sm:min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-20 sm:pt-24 pb-10 sm:pb-0 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        </div>

        {/* Floating 3D Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-10 sm:w-16 lg:w-20 h-10 sm:h-16 lg:h-20 rounded-xl sm:rounded-2xl bg-blue-500 shadow-xl shadow-blue-500/20 sm:shadow-2xl sm:shadow-blue-500/30 opacity-60 sm:opacity-100"
            style={{ top: "12%", left: "5%", transform: `translateY(${scrollY * 0.1}px) rotate(${12 + scrollY * 0.02}deg)`, transition: "transform 0.3s ease-out" }}
          />
          <div 
            className="absolute w-8 sm:w-12 lg:w-16 h-8 sm:h-12 lg:h-16 rounded-lg sm:rounded-xl bg-emerald-500 shadow-xl shadow-emerald-500/20 sm:shadow-2xl sm:shadow-emerald-500/30 opacity-60 sm:opacity-100"
            style={{ top: "20%", right: "8%", transform: `translateY(${scrollY * 0.15}px) rotate(${-15 + scrollY * 0.03}deg)`, transition: "transform 0.3s ease-out" }}
          />
          <div 
            className="absolute w-12 sm:w-20 lg:w-24 h-12 sm:h-20 lg:h-24 rounded-2xl sm:rounded-3xl bg-violet-500 shadow-xl shadow-violet-500/20 sm:shadow-2xl sm:shadow-violet-500/30 opacity-50 sm:opacity-100"
            style={{ top: "65%", left: "3%", transform: `translateY(${scrollY * 0.08}px) rotate(${8 + scrollY * 0.01}deg)`, transition: "transform 0.3s ease-out" }}
          />
          <div 
            className="absolute w-7 sm:w-10 lg:w-14 h-7 sm:h-10 lg:h-14 rounded-lg sm:rounded-xl bg-amber-500 shadow-xl shadow-amber-500/20 sm:shadow-2xl sm:shadow-amber-500/30 opacity-60 sm:opacity-100"
            style={{ top: "72%", right: "6%", transform: `translateY(${scrollY * 0.12}px) rotate(${-20 + scrollY * 0.02}deg)`, transition: "transform 0.3s ease-out" }}
          />
          <div 
            className="absolute w-6 sm:w-9 h-6 sm:h-9 rounded-md sm:rounded-lg bg-cyan-500 shadow-xl shadow-cyan-500/20 opacity-50 sm:opacity-80 hidden xs:block"
            style={{ top: "45%", left: "8%", transform: `translateY(${scrollY * 0.14}px) rotate(${20 + scrollY * 0.03}deg)`, transition: "transform 0.3s ease-out" }}
          />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-blue-50 border border-blue-100 text-xs sm:text-sm font-medium text-blue-600 mb-6 sm:mb-8 animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>The #1 AI Study Platform for Students</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-gray-900 leading-[1.05] mb-6 sm:mb-8 tracking-tight">
            <span className="block animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Study Smarter.
            </span>
            <span className="block bg-blue-600 bg-clip-text text-transparent animate-slide-up" style={{ animationDelay: "0.2s" }}>
              Achieve More.
            </span>
          </h1>

          <p className="text-base sm:text-xl md:text-2xl text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto animate-slide-up leading-relaxed px-2" style={{ animationDelay: "0.3s" }}>
            20+ powerful AI tools in one platform. Paraphrase, humanize, detect AI, 
            solve problems, and more.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-12 sm:mb-16 animate-slide-up px-4 sm:px-0" style={{ animationDelay: "0.4s" }}>
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg rounded-2xl shadow-xl shadow-blue-500/30 transition-all hover:scale-105 border-0">
              <Link href="/register">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 group">
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block">
          <ChevronDown className="w-6 h-6 text-gray-400 animate-bounce" />
        </div>
      </section>

      {/* Feature Showcase - Animated Marquee Slides */}
      <section id="features" className="pt-8 pb-16 sm:py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16" id="features-header" data-animate>
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
              {tools.length} Tools. One Platform.
            </h2>
            <p className="text-base sm:text-xl text-gray-500 max-w-2xl mx-auto px-2">
              Everything you need to excel — click any tool to try it.
            </p>
          </div>
        </div>

        {/* Row 1 — slides left */}
        <div className="relative mb-3 sm:mb-5">
          <div className="flex gap-3 sm:gap-5 animate-marquee-left">
            {[...tools.slice(0, 13), ...tools.slice(0, 13)].map((tool, i) => {
              const IconComponent = tool.icon;
              return (
                <Link
                  key={`r1-${i}`}
                  href={`/dashboard/${tool.category}/${tool.slug}`}
                  className="group flex-shrink-0 w-[260px] sm:w-[320px] bg-white rounded-2xl border border-gray-100 hover:border-blue-200 p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1 truncate">{tool.name}</h3>
                      <p className="text-[11px] sm:text-xs text-gray-400 line-clamp-2 leading-relaxed">{tool.desc}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Row 2 — slides right (hidden on very small screens) */}
        <div className="relative mb-3 sm:mb-5 hidden sm:block">
          <div className="flex gap-3 sm:gap-5 animate-marquee-right">
            {[...tools.slice(13), ...tools.slice(0, 13), ...tools.slice(13)].map((tool, i) => {
              const IconComponent = tool.icon;
              return (
                <Link
                  key={`r2-${i}`}
                  href={`/dashboard/${tool.category}/${tool.slug}`}
                  className="group flex-shrink-0 w-[260px] sm:w-[320px] bg-white rounded-2xl border border-gray-100 hover:border-blue-200 p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1 truncate">{tool.name}</h3>
                      <p className="text-[11px] sm:text-xs text-gray-400 line-clamp-2 leading-relaxed">{tool.desc}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured tool — expanded card */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 sm:mt-16">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Left — active tool detail */}
              <div className="flex-1 p-6 sm:p-10 lg:p-14">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    {(() => { const Icon = tools[activeFeature < tools.length ? activeFeature : 0].icon; return <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />; })()}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{tools[activeFeature < tools.length ? activeFeature : 0].name}</h3>
                </div>
                <p className="text-gray-500 text-sm sm:text-lg mb-6 sm:mb-8 leading-relaxed">{tools[activeFeature < tools.length ? activeFeature : 0].desc}</p>
                <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
                  {tools[activeFeature < tools.length ? activeFeature : 0].features.map((f) => (
                    <span key={f} className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs sm:text-sm font-medium">{f}</span>
                  ))}
                </div>
                <Button asChild className="h-10 sm:h-12 px-6 sm:px-8 rounded-xl bg-blue-600 hover:bg-blue-700 border-0 text-sm sm:text-base">
                  <Link href={`/dashboard/${tools[activeFeature < tools.length ? activeFeature : 0].category}/${tools[activeFeature < tools.length ? activeFeature : 0].slug}`}>
                    Try {tools[activeFeature < tools.length ? activeFeature : 0].name} <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>

              {/* Right — tool selector pills */}
              <div className="lg:w-[340px] bg-gray-50 p-4 sm:p-6 lg:p-8 border-t lg:border-t-0 lg:border-l border-gray-100 overflow-y-auto max-h-[300px] sm:max-h-[400px]">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">All Tools</p>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                  {tools.map((tool, i) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.slug}
                        onClick={() => setActiveFeature(i)}
                        className={`w-full flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-left transition-all duration-200 ${
                          activeFeature === i
                            ? "bg-white shadow-md border border-blue-100"
                            : "hover:bg-white/60"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeFeature === i ? "text-blue-600" : "text-gray-400"}`} />
                        <span className={`text-xs sm:text-sm truncate ${activeFeature === i ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                          {tool.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Models — Horizontal scroll strip */}
      <section className="py-14 sm:py-24 px-4 sm:px-6 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-6 sm:mb-10">Powered by world-class AI</p>
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-center gap-6 sm:gap-12 md:gap-20">
            {aiModels.map((model) => {
              const IconComponent = model.icon;
              return (
                <div key={model.name} className="flex items-center gap-2.5 sm:gap-3 group cursor-default">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-900 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-xs sm:text-sm">{model.name}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400">{model.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works — Minimal steps */}
      <section id="how-it-works" className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 text-center mb-3 sm:mb-4">How It Works</h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-10 sm:mb-16 max-w-lg mx-auto">Get started in minutes. No setup required.</p>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-px bg-gray-200" />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-0">
              {howItWorks.map((step) => (
                <div key={step.step} className="relative flex flex-col items-center text-center group">
                  <div className="relative z-10 w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center mb-3 sm:mb-5 group-hover:border-blue-200 group-hover:shadow-lg transition-all duration-300">
                    <span className="text-lg sm:text-2xl font-black text-blue-600">{step.step}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-1 sm:mb-2">{step.title}</h3>
                  <p className="text-[11px] sm:text-xs text-gray-400 max-w-[160px] sm:max-w-[180px] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits — Bento style */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 text-center mb-3 sm:mb-4">Real Results. Real Impact.</h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-10 sm:mb-16 max-w-lg mx-auto">See how Kabyar helps students achieve their goals.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {benefits.map((benefit, i) => {
              const IconComponent = benefit.icon;
              return (
                <div
                  key={benefit.title}
                  className={`group relative rounded-2xl border border-gray-100 p-5 sm:p-8 transition-all duration-300 hover:shadow-lg hover:border-blue-100 overflow-hidden ${i === 0 ? "md:col-span-2" : ""}`}
                >
                  <div className="absolute top-4 right-6 sm:top-6 sm:right-8 text-4xl sm:text-6xl font-black text-gray-50 group-hover:text-blue-50 transition-colors select-none">{benefit.stat}</div>
                  <div className="relative z-10 flex items-start gap-3 sm:gap-5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-600 transition-colors duration-300">
                      <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1">{benefit.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{benefit.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Programs — Animated horizontal marquee */}
      <section className="py-14 sm:py-24 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 text-center mb-3 sm:mb-4">Every Program Supported</h2>
          <p className="text-sm sm:text-base text-gray-400 text-center max-w-lg mx-auto">From GED to University — we&apos;ve got you covered.</p>
        </div>
        <div className="flex gap-4 animate-marquee-left" style={{ animationDuration: "30s" }}>
          {[...programs, ...programs, ...programs].map((prog, i) => (
            <div key={`prog-${i}`} className="flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all duration-300">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                {(() => { const Icon = prog.icon; return <Icon className="w-4 h-4 text-blue-600" />; })()}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{prog.name}</p>
                <p className="text-[10px] text-gray-400">{prog.students} students</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials — Clean cards with marquee */}
      <section id="testimonials" className="py-16 sm:py-28 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 text-center mb-3 sm:mb-4">Loved by Students</h2>
          <p className="text-sm sm:text-base text-gray-400 text-center max-w-lg mx-auto">Join thousands already achieving more with Kabyar.</p>
        </div>

        <div className="flex gap-3 sm:gap-5 animate-marquee-right" style={{ animationDuration: "45s" }}>
          {[...testimonials, ...testimonials].map((t, i) => (
            <div key={`test-${i}`} className="flex-shrink-0 w-[280px] sm:w-[360px] rounded-2xl border border-gray-100 p-4 sm:p-6 hover:border-blue-100 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-1 mb-3 sm:mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-gray-600 text-xs sm:text-sm mb-4 sm:mb-5 leading-relaxed line-clamp-3">&quot;{t.text}&quot;</p>
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm">{t.avatar}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm">{t.name}</p>
                  <p className="text-[10px] sm:text-[11px] text-gray-400">{t.program}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Kabyar — Minimal comparison */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 text-center mb-3 sm:mb-4">Why Kabyar?</h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-8 sm:mb-14 max-w-md mx-auto">See how we compare to other AI tools.</p>

          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-3 px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-100">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Feature</p>
              <p className="text-[10px] sm:text-xs font-semibold text-blue-600 uppercase tracking-wider text-center">Kabyar</p>
              <p className="text-[10px] sm:text-xs font-semibold text-gray-300 uppercase tracking-wider text-center">Others</p>
            </div>
            {comparisons.map((c, i) => (
              <div key={i} className="grid grid-cols-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors duration-200">
                <p className="text-xs sm:text-sm text-gray-700">{c.feature}</p>
                <div className="flex justify-center">
                  {c.kay ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs sm:text-sm">—</span>
                  )}
                </div>
                <div className="flex justify-center">
                  {c.others ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs sm:text-sm">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — Clean minimal */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Ready to Start?
          </h2>
          <p className="text-base sm:text-xl text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto">
            Join thousands of students. Free to start — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 px-4 sm:px-0">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:scale-[1.02] border-0">
              <Link href="/register">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 sm:h-14 px-8 sm:px-10 text-base sm:text-lg rounded-2xl border-2 border-gray-200 hover:border-gray-300 text-gray-600">
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-16 px-4 sm:px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-10 sm:mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center mb-4">
                <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-12 sm:h-16 w-auto" />
              </div>
              <p className="text-xs sm:text-sm">Your intelligent study companion. AI-powered tools for better learning.</p>
            </div>
            
            {/* Tools */}
            <div>
              <h4 className="font-semibold text-white mb-4">Tools</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/tools/paraphraser" className="hover:text-white transition">Safe Paraphraser</Link></li>
                <li><Link href="/tools/humanizer" className="hover:text-white transition">Content Humanizer</Link></li>
                <li><Link href="/tools/ai-detector" className="hover:text-white transition">AI Detector</Link></li>
                <li><Link href="/tools/image-solve" className="hover:text-white transition">Problem Solver</Link></li>
                <li><Link href="/tools/assignment-worker" className="hover:text-white transition">Assignment Worker</Link></li>
              </ul>
            </div>
            
            {/* Resources */}
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="/tools" className="hover:text-white transition">All Tools</Link></li>
                <li><Link href="/tools/video-explainer" className="hover:text-white transition">Video Explainer</Link></li>
                <li><Link href="/tools/pdf-qa" className="hover:text-white transition">PDF Q&A</Link></li>
                <li><Link href="/tools/roast-assignment" className="hover:text-white transition">Roast My Assignment</Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">&copy; 2026 Kabyar. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
              <Link href="/contact" className="hover:text-white transition">Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        .animate-slide-up {
          opacity: 0;
          animation: slide-up 1s ease-out forwards;
        }
        .animate-marquee-left {
          animation: marquee-left 60s linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right 60s linear infinite;
        }
        .animate-marquee-left:hover,
        .animate-marquee-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
