"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Data. Sourced from src/lib/tools-registry.ts (kept deliberately inline here
// so the landing page has no runtime coupling to server-side registry code).
// ---------------------------------------------------------------------------

type ToolRow = { name: string; slug: string; desc: string; credits: number };

type Category = {
  number: string;
  id: "rag" | "research" | "media" | "visual" | "writing";
  name: string;
  tagline: string;
  tools: ToolRow[];
};

const catalog: Category[] = [
  {
    number: "01",
    id: "rag",
    name: "Documents",
    tagline: "Read, quiz, flash, tailor.",
    tools: [
      { name: "PDF Q&A Sniper", slug: "pdf-qa", desc: "Ask a PDF; get answers with page citations.", credits: 4 },
      { name: "Quiz Generator", slug: "quiz-generator", desc: "Turn notes into MCQs with answer keys.", credits: 3 },
      { name: "Past Paper Analyzer", slug: "past-paper", desc: "Predict likely questions from old exams.", credits: 8 },
      { name: "Flashcard Maker", slug: "flashcard-maker", desc: "Bulk flashcards, Anki export ready.", credits: 3 },
      { name: "Resume Tailor", slug: "resume-tailor", desc: "Match your CV against a job description.", credits: 5 },
    ],
  },
  {
    number: "02",
    id: "research",
    name: "Research",
    tagline: "Evidence over opinion.",
    tools: [
      { name: "Academic Consensus", slug: "academic-consensus", desc: "Search papers for consensus on a claim.", credits: 5 },
      { name: "Research Gap Finder", slug: "research-gap", desc: "Map the literature; find the hole.", credits: 5 },
    ],
  },
  {
    number: "03",
    id: "media",
    name: "Audio & Video",
    tagline: "From a link to a lesson.",
    tools: [
      { name: "YouTube Summarizer", slug: "youtube-summarizer", desc: "Transcripts, key moments, timestamps.", credits: 3 },
      { name: "PDF to Podcast", slug: "pdf-podcast", desc: "Two-speaker audio from any reading.", credits: 8 },
      { name: "Lecture Organizer", slug: "lecture-organizer", desc: "Turn recordings into revision notes.", credits: 5 },
      { name: "Viva Simulator", slug: "viva-simulator", desc: "Practice oral exams with an AI examiner.", credits: 2 },
    ],
  },
  {
    number: "04",
    id: "visual",
    name: "Visual",
    tagline: "Think in shapes.",
    tools: [
      { name: "Mind Map", slug: "mind-map", desc: "Topic to visual hierarchy in one pass.", credits: 3 },
      { name: "Timeline", slug: "timeline", desc: "History, projects, processes; in order.", credits: 3 },
      { name: "Flowchart", slug: "flowchart", desc: "Prose to decision tree, SVG export.", credits: 3 },
      { name: "Lab Report", slug: "lab-report", desc: "Raw data to IMRaD, done properly.", credits: 5 },
    ],
  },
  {
    number: "05",
    id: "writing",
    name: "Writing",
    tagline: "Draft, defend, deliver.",
    tools: [
      { name: "Image Problem Solver", slug: "image-solve", desc: "Photo of the question; step-by-step answer.", credits: 5 },
      { name: "Roast My Assignment", slug: "roast-assignment", desc: "Honest feedback, grade prediction, fixes.", credits: 4 },
      { name: "Safe Paraphraser", slug: "paraphraser", desc: "Rewrite with tone and style control.", credits: 3 },
      { name: "Content Humanizer", slug: "humanizer", desc: "AI writing that reads human.", credits: 5 },
      { name: "AI Detector", slug: "ai-detector", desc: "Scan for AI patterns with highlights.", credits: 3 },
      { name: "Video Explainer", slug: "video-explainer", desc: "Animated scenes with AI narration.", credits: 5 },
      { name: "Assignment Worker", slug: "assignment-worker", desc: "Agentic completion of whole briefs.", credits: 6 },
      { name: "Devil's Advocate", slug: "devils-advocate", desc: "Counter-arguments for debate prep.", credits: 3 },
      { name: "Vocabulary Upgrader", slug: "vocabulary-upgrader", desc: "Plain text to academic register.", credits: 3 },
      { name: "Cold Email", slug: "cold-email", desc: "Outreach that reads like a student wrote it.", credits: 3 },
    ],
  },
];

const totalTools = catalog.reduce((n, c) => n + c.tools.length, 0);

const programs: { name: string; count: string }[] = [
  { name: "GED", count: "2,500+" },
  { name: "IGCSE", count: "3,200+" },
  { name: "OTHM", count: "1,800+" },
  { name: "A-Levels", count: "2,100+" },
  { name: "IB", count: "1,500+" },
  { name: "AP", count: "1,200+" },
  { name: "SAT / ACT", count: "900+" },
  { name: "University", count: "4,000+" },
];

const testimonials = [
  {
    text: "I used to paste essays into three different tools. Now it's one tab. My IGCSE English jumped from a C to an A*.",
    name: "Sarah M.",
    program: "IGCSE · Yangon",
  },
  {
    text: "The PDF Q&A is absurd. Dumped a 200-page chemistry textbook, asked for balanced equations, got them with page numbers.",
    name: "Alex K.",
    program: "GED · Bangkok",
  },
  {
    text: "Viva Simulator caught me saying 'um' eight times in a mock. I fixed it before the real one. Got distinction.",
    name: "Maya T.",
    program: "OTHM · Kuala Lumpur",
  },
];

const comparison = [
  { feature: "25 focused tools, not a chatbot", kay: true, others: false },
  { feature: "AI detector plus humanizer", kay: true, others: false },
  { feature: "PDF Q&A with page citations", kay: true, others: true },
  { feature: "Photo of a problem to solution", kay: true, others: false },
  { feature: "Agentic assignment worker", kay: true, others: false },
];

// ---------------------------------------------------------------------------

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Entrance observer: applies .reveal-in when a [data-reveal] element
    // intersects, using transform + opacity only (no layout props).
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    const els = rootRef.current?.querySelectorAll<HTMLElement>("[data-reveal]");
    els?.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen bg-[var(--page)] text-[var(--ink)] font-sans antialiased"
    >
      {/* Scoped design tokens and motion primitives. Kept local to the page so
          the rest of the app is not affected. */}
      <style jsx global>{`
        :root {
          --page: oklch(0.985 0.004 250);
          --surface: oklch(0.995 0.003 250);
          --ink: oklch(0.18 0.01 250);
          --charcoal: oklch(0.32 0.015 250);
          --ash: oklch(0.58 0.012 250);
          --mist: oklch(0.93 0.006 250);
          --mist-strong: oklch(0.88 0.008 250);
          --blue: oklch(0.56 0.19 253);
          --blue-deep: oklch(0.42 0.17 253);
          --blue-tint: oklch(0.96 0.04 253);
        }
        [data-reveal] {
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          transition:
            opacity 480ms cubic-bezier(0.2, 0.9, 0.2, 1),
            transform 480ms cubic-bezier(0.2, 0.9, 0.2, 1);
          will-change: transform, opacity;
        }
        [data-reveal].reveal-in {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        [data-reveal-delay="1"] { transition-delay: 60ms; }
        [data-reveal-delay="2"] { transition-delay: 120ms; }
        [data-reveal-delay="3"] { transition-delay: 180ms; }
        [data-reveal-delay="4"] { transition-delay: 240ms; }
        @media (prefers-reduced-motion: reduce) {
          [data-reveal] { opacity: 1 !important; transform: none !important; }
        }
        .kay-hero-grid {
          background-image:
            linear-gradient(to right, oklch(0.93 0.006 250) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(0.93 0.006 250) 1px, transparent 1px);
          background-size: 72px 72px;
          -webkit-mask-image: radial-gradient(
            ellipse 65% 70% at 50% 30%,
            black 55%,
            transparent 85%
          );
                  mask-image: radial-gradient(
            ellipse 65% 70% at 50% 30%,
            black 55%,
            transparent 85%
          );
        }
        .kay-catalog-row:hover .kay-catalog-arrow {
          transform: translate3d(2px, -2px, 0);
          opacity: 1;
        }
      `}</style>

      {/* =========================================================
          NAV: hairline, single row. Shrinks on scroll. No floating pill.
          ========================================================= */}
      <header
        className="sticky top-0 z-50 w-full border-b transition-[background-color,border-color] duration-200"
        style={{
          backgroundColor: scrolled ? "color-mix(in oklch, var(--page) 88%, transparent)" : "transparent",
          borderColor: scrolled ? "var(--mist)" : "transparent",
          backdropFilter: scrolled ? "saturate(140%) blur(10px)" : "none",
          WebkitBackdropFilter: scrolled ? "saturate(140%) blur(10px)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3 sm:px-8 sm:py-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/kabyar-logo.png"
              alt="Kabyar"
              width={240}
              height={64}
              priority
              className="h-9 w-auto sm:h-11"
            />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#catalog" className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--ash)] hover:text-[var(--ink)] transition-colors">
              tools
            </a>
            <Link href="/pricing" className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--ash)] hover:text-[var(--ink)] transition-colors">
              pricing
            </Link>
            <Link href="/blog" className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--ash)] hover:text-[var(--ink)] transition-colors">
              blog
            </Link>
            <a href="#proof" className="font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--ash)] hover:text-[var(--ink)] transition-colors">
              proof
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm text-[var(--charcoal)] hover:bg-[var(--mist)] sm:inline-block"
            >
              Log in
            </Link>
            <Button
              asChild
              size="sm"
              className="h-10 rounded-lg bg-[var(--blue)] px-4 text-sm font-medium text-white shadow-[0_8px_24px_-8px_oklch(0.56_0.19_253_/_0.55)] hover:bg-[var(--blue-deep)]"
            >
              <Link href="/register">
                Start free
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO: asymmetric. Left is copy + CTA, right is a live catalog
          preview that signals "we ship real tools". Quiet dot grid behind.
          ========================================================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 kay-hero-grid pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20 lg:pb-36 lg:pt-28">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-10">
            {/* Left column */}
            <div className="lg:col-span-7" data-reveal>
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--blue)]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ash)]">
                  kay · ai · ကဗျာ · study companion
                </span>
              </div>

              <h1 className="font-sans text-[44px] font-extrabold leading-[1.02] tracking-[-0.025em] text-[var(--ink)] sm:text-[64px] lg:text-[84px]">
                Pass faster with{" "}
                <span className="font-mono text-[var(--blue)] tabular-nums">
                  {totalTools}
                </span>{" "}
                real tools,
                <br className="hidden sm:block" /> not a chatbot.
              </h1>

              <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.6] text-[var(--charcoal)] sm:text-[19px]">
                Kay AI packages essays, humanizer, PDF Q&amp;A, problem solver, mind
                maps, viva practice, and 19 more into one focused workbench for
                students from GED to university.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="h-12 rounded-xl bg-[var(--blue)] px-6 text-[15px] font-medium text-white shadow-[0_14px_40px_-12px_oklch(0.56_0.19_253_/_0.6)] transition-colors hover:bg-[var(--blue-deep)]"
                >
                  <Link href="/register">
                    Start free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <a
                  href="#catalog"
                  className="group inline-flex h-12 items-center gap-2 rounded-xl px-3 text-[15px] text-[var(--charcoal)] hover:text-[var(--ink)]"
                >
                  See all {totalTools} tools
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ash)]">
                <span>free to start</span>
                <span aria-hidden className="text-[var(--mist-strong)]">·</span>
                <span>50 credits / day</span>
                <span aria-hidden className="text-[var(--mist-strong)]">·</span>
                <span>no card required</span>
              </div>
            </div>

            {/* Right column: live catalog preview. Calmer than a marquee. */}
            <aside
              className="lg:col-span-5"
              data-reveal
              data-reveal-delay="2"
              aria-label="Example tools"
            >
              <div className="rounded-2xl border border-[var(--mist)] bg-[var(--surface)] p-5 shadow-[0_30px_60px_-40px_oklch(0.18_0.01_250_/_0.18)] sm:p-6">
                <div className="flex items-center justify-between border-b border-[var(--mist)] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--blue)]" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ash)]">
                      tools.catalog
                    </span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-[var(--ash)]">
                    {totalTools} / {totalTools}
                  </span>
                </div>
                <ul className="divide-y divide-[var(--mist)]">
                  {[
                    { idx: "01", name: "PDF Q&A Sniper", slug: "pdf-qa", cat: "documents" },
                    { idx: "02", name: "Content Humanizer", slug: "humanizer", cat: "writing" },
                    { idx: "03", name: "Image Problem Solver", slug: "image-solve", cat: "writing" },
                    { idx: "04", name: "Mind Map", slug: "mind-map", cat: "visual" },
                    { idx: "05", name: "Viva Simulator", slug: "viva-simulator", cat: "media" },
                  ].map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/tools/${t.slug}`}
                        className="group flex items-center justify-between py-3.5"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span className="font-mono text-[11px] text-[var(--ash)] tabular-nums">
                            {t.idx}
                          </span>
                          <span className="truncate text-[14px] font-medium text-[var(--ink)]">
                            {t.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 pl-3">
                          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ash)] sm:inline">
                            {t.cat}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ash)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--blue)]" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-[var(--mist)] pt-3 text-right">
                  <a
                    href="#catalog"
                    className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--blue)] hover:text-[var(--blue-deep)]"
                  >
                    open full index →
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROGRAMS: one hairline row. No icons, no cards.
          ========================================================= */}
      <section aria-label="Supported programs" className="border-y border-[var(--mist)]">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div
            className="scrollbar-hide -mx-5 flex gap-x-10 overflow-x-auto px-5 py-6 sm:mx-0 sm:gap-x-12 sm:px-0 sm:py-7"
            data-reveal
          >
            <div className="shrink-0 pr-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ash)]">
              programs supported
            </div>
            {programs.map((p) => (
              <div key={p.name} className="shrink-0">
                <div className="text-[15px] font-semibold text-[var(--ink)]">{p.name}</div>
                <div className="font-mono text-[11px] tabular-nums text-[var(--ash)]">
                  {p.count} students
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          THREE VERBS: editorial replacement for the old icon-grid.
          ========================================================= */}
      <section className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mb-16 max-w-[52ch]" data-reveal>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ash)]">
            what it actually does
          </div>
          <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] sm:text-[44px]">
            Three things, done properly.
          </h2>
        </div>

        <div className="divide-y divide-[var(--mist)]">
          {[
            {
              verb: "Write.",
              body:
                "Essays that survive the AI detector, paraphrasing that keeps your voice, emails that don't read like a template.",
              chips: [
                { name: "humanizer", slug: "humanizer" },
                { name: "ai-detector", slug: "ai-detector" },
                { name: "paraphraser", slug: "paraphraser" },
              ],
            },
            {
              verb: "Solve.",
              body:
                "Snap a photo of the problem. Upload the PDF. Get a worked answer, not a summary, with references you can check.",
              chips: [
                { name: "image-solve", slug: "image-solve" },
                { name: "pdf-qa", slug: "pdf-qa" },
                { name: "assignment-worker", slug: "assignment-worker" },
              ],
            },
            {
              verb: "Study.",
              body:
                "Turn recordings into notes, textbooks into flashcards, and silence into a viva you're ready for.",
              chips: [
                { name: "flashcard-maker", slug: "flashcard-maker" },
                { name: "lecture-organizer", slug: "lecture-organizer" },
                { name: "viva-simulator", slug: "viva-simulator" },
              ],
            },
          ].map((row, i) => (
            <div
              key={row.verb}
              className="grid grid-cols-1 gap-6 py-10 sm:grid-cols-12 sm:gap-10 sm:py-14"
              data-reveal
              data-reveal-delay={String(i + 1)}
            >
              <div className="sm:col-span-4">
                <div className="font-sans text-[44px] font-extrabold leading-none tracking-[-0.03em] text-[var(--ink)] sm:text-[56px]">
                  {row.verb}
                </div>
              </div>
              <div className="sm:col-span-8">
                <p className="max-w-[48ch] text-[17px] leading-[1.6] text-[var(--charcoal)]">
                  {row.body}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {row.chips.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/tools/${c.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mist)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[11px] tabular-nums text-[var(--charcoal)] transition-colors hover:border-[var(--blue)] hover:text-[var(--blue)]"
                    >
                      <span className="text-[var(--ash)]">/</span>
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          FULL CATALOG: a magazine TOC of the 25 tools.
          ========================================================= */}
      <section
        id="catalog"
        className="border-t border-[var(--mist)] bg-[var(--surface)]"
      >
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-32">
          <div className="mb-16 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end" data-reveal>
            <div>
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ash)]">
                the full index
              </div>
              <h2 className="max-w-[20ch] text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] sm:text-[44px]">
                Every tool, one page, no filler.
              </h2>
            </div>
            <div className="font-mono text-[12px] tabular-nums text-[var(--ash)]">
              total <span className="text-[var(--ink)]">{totalTools}</span> · categories{" "}
              <span className="text-[var(--ink)]">{catalog.length}</span>
            </div>
          </div>

          <div className="space-y-14 sm:space-y-20">
            {catalog.map((cat, idx) => (
              <div key={cat.id} data-reveal data-reveal-delay={String((idx % 3) + 1)}>
                <div className="mb-6 flex items-baseline justify-between border-b border-[var(--mist-strong)] pb-3">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-[12px] tabular-nums text-[var(--ash)]">
                      {cat.number}
                    </span>
                    <h3 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ink)] sm:text-[26px]">
                      {cat.name}
                    </h3>
                  </div>
                  <div className="hidden text-[14px] italic text-[var(--ash)] sm:block">
                    {cat.tagline}
                  </div>
                </div>

                <ul>
                  {cat.tools.map((tool) => (
                    <li key={tool.slug} className="kay-catalog-row">
                      <Link
                        href={`/tools/${tool.slug}`}
                        className="group grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-[var(--mist)] py-4 transition-colors hover:bg-[var(--blue-tint)]/60 sm:grid-cols-[minmax(0,18rem)_1fr_auto_auto] sm:py-5 sm:px-3"
                      >
                        <span className="col-span-1 text-[15px] font-medium text-[var(--ink)] sm:text-[16px]">
                          {tool.name}
                        </span>
                        <span className="col-span-2 row-start-2 text-[13px] leading-[1.5] text-[var(--charcoal)] sm:col-span-1 sm:row-start-1 sm:text-[14px]">
                          {tool.desc}
                        </span>
                        <span className="col-span-1 row-start-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--ash)] tabular-nums sm:col-start-3 sm:row-start-1 sm:text-right">
                          /{tool.slug}
                        </span>
                        <span className="col-span-1 row-start-1 justify-self-end text-right sm:col-start-4 sm:row-start-1">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-[var(--charcoal)]">
                            <span className="tabular-nums">{tool.credits}</span>
                            <span className="text-[var(--ash)]">cr</span>
                            <ArrowUpRight className="kay-catalog-arrow ml-1 h-3.5 w-3.5 text-[var(--ash)] opacity-0 transition-all duration-200 group-hover:text-[var(--blue)]" />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          PROOF: three very large mono numerals. No illustrations.
          ========================================================= */}
      <section id="proof" className="border-t border-[var(--mist)]">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
          <div
            className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6"
            data-reveal
          >
            {[
              { n: totalTools, label: "focused tools", sub: "one account" },
              { n: programs.length, label: "programs covered", sub: "ged to university" },
              { n: 6, label: "response languages", sub: "en · my · zh · th · ko · ja" },
            ].map((p, i) => (
              <div
                key={p.label}
                className={`${i < 2 ? "sm:border-r sm:border-[var(--mist)] sm:pr-6" : ""}`}
              >
                <div className="font-mono text-[72px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[var(--ink)] sm:text-[96px]">
                  {p.n}
                </div>
                <div className="mt-3 text-[14px] font-medium uppercase tracking-[0.14em] text-[var(--ink)]">
                  {p.label}
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ash)]">
                  {p.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          TESTIMONIALS: three, asymmetric, no fake headshots.
          ========================================================= */}
      <section className="bg-[var(--surface)] border-t border-[var(--mist)]">
        <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-32">
          <div className="mb-14 max-w-[52ch]" data-reveal>
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ash)]">
              in their words
            </div>
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] sm:text-[44px]">
              Students who stopped studying alone.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-x-12 gap-y-12 md:grid-cols-12">
            {testimonials.map((t, i) => (
              <blockquote
                key={t.name}
                className={`md:col-span-4 ${
                  i === 0 ? "md:col-span-5" : i === 1 ? "md:col-span-4 md:pt-20" : "md:col-span-3 md:pt-10"
                }`}
                data-reveal
                data-reveal-delay={String(i + 1)}
              >
                <p className="text-[19px] leading-[1.5] text-[var(--ink)] sm:text-[21px]">
                  <span className="mr-1 font-mono text-[var(--blue)]">“</span>
                  {t.text}
                  <span className="ml-1 font-mono text-[var(--blue)]">”</span>
                </p>
                <footer className="mt-5 flex items-center gap-3 border-t border-[var(--mist)] pt-4">
                  <div className="text-[14px] font-semibold text-[var(--ink)]">
                    {t.name}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ash)]">
                    {t.program}
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          COMPARISON: five committed rows.
          ========================================================= */}
      <section className="border-t border-[var(--mist)]">
        <div className="mx-auto max-w-[900px] px-5 py-24 sm:px-8 sm:py-28">
          <div className="mb-10 max-w-[44ch]" data-reveal>
            <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ash)]">
              why not just chatgpt
            </div>
            <h2 className="text-[28px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--ink)] sm:text-[36px]">
              Because &ldquo;a chatbot&rdquo; is a prompt, not a product.
            </h2>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-[var(--mist)]"
            data-reveal
          >
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-[var(--mist)] bg-[var(--surface)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ash)] sm:px-6">
              <div>feature</div>
              <div className="w-16 text-center text-[var(--blue)]">kay</div>
              <div className="w-16 text-center">others</div>
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-5 py-4 sm:px-6 ${
                  i < comparison.length - 1 ? "border-b border-[var(--mist)]" : ""
                }`}
              >
                <div className="text-[14px] text-[var(--ink)] sm:text-[15px]">
                  {row.feature}
                </div>
                <div className="w-16 text-center">
                  {row.kay ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--blue)] text-white">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <span aria-hidden className="inline-block h-3 w-3 rounded-full border border-[var(--mist-strong)]" />
                  )}
                </div>
                <div className="w-16 text-center">
                  {row.others ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--mist-strong)] text-[var(--ash)]">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span aria-hidden className="inline-block h-3 w-3 rounded-full border border-[var(--mist-strong)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CLOSING: quiet centered CTA with a Burmese accent line.
          ========================================================= */}
      <section className="border-t border-[var(--mist)]">
        <div className="mx-auto flex max-w-[900px] flex-col items-center px-5 py-28 text-center sm:px-8 sm:py-36" data-reveal>
          <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--ash)]">
            ကျောင်းသားတိုင်းအတွက်
          </div>
          <h2 className="max-w-[24ch] text-[36px] font-extrabold leading-[1.05] tracking-[-0.025em] text-[var(--ink)] sm:text-[56px]">
            Your next A starts with one account.
          </h2>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.6] text-[var(--charcoal)] sm:text-[19px]">
            Free to start. Fifty credits every day. Cancel whenever. No card until
            you actually want more.
          </p>
          <div className="mt-10">
            <Button
              asChild
              className="h-12 rounded-xl bg-[var(--blue)] px-7 text-[15px] font-medium text-white shadow-[0_14px_40px_-12px_oklch(0.56_0.19_253_/_0.6)] transition-colors hover:bg-[var(--blue-deep)]"
            >
              <Link href="/register">
                Start free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ash)]">
            already have an account?{" "}
            <Link href="/login" className="text-[var(--charcoal)] underline-offset-2 hover:text-[var(--ink)] hover:underline">
              log in
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER: hairline, three columns, white not gray-900.
          ========================================================= */}
      <footer className="border-t border-[var(--mist)]">
        <div className="mx-auto max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <Image
                src="/kabyar-logo.png"
                alt="Kabyar"
                width={240}
                height={64}
                className="h-10 w-auto"
              />
              <p className="mt-4 max-w-[26ch] text-[13px] leading-[1.6] text-[var(--charcoal)]">
                A focused AI workbench for students. Built in Yangon.
              </p>
            </div>

            {[
              {
                title: "tools",
                links: [
                  { href: "/tools/paraphraser", label: "Paraphraser" },
                  { href: "/tools/humanizer", label: "Humanizer" },
                  { href: "/tools/ai-detector", label: "AI Detector" },
                  { href: "/tools/pdf-qa", label: "PDF Q&A" },
                  { href: "/tools/image-solve", label: "Problem Solver" },
                ],
              },
              {
                title: "resources",
                links: [
                  { href: "/blog", label: "Blog" },
                  { href: "/tools", label: "All 25 tools" },
                  { href: "/pricing", label: "Pricing" },
                  { href: "/tools/video-explainer", label: "Video Explainer" },
                ],
              },
              {
                title: "company",
                links: [
                  { href: "/about", label: "About" },
                  { href: "/contact", label: "Contact" },
                  { href: "/privacy", label: "Privacy" },
                  { href: "/terms", label: "Terms" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ash)]">
                  {col.title}
                </div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[13px] text-[var(--charcoal)] hover:text-[var(--ink)]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-[var(--mist)] pt-6 sm:flex-row sm:items-center">
            <div className="font-mono text-[11px] tabular-nums uppercase tracking-[0.14em] text-[var(--ash)]">
              © 2026 kabyar · ကဗျာ
            </div>
            <div className="flex gap-6 text-[12px] text-[var(--ash)]">
              <Link href="/privacy" className="hover:text-[var(--ink)]">
                privacy
              </Link>
              <Link href="/terms" className="hover:text-[var(--ink)]">
                terms
              </Link>
              <Link href="/contact" className="hover:text-[var(--ink)]">
                contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
