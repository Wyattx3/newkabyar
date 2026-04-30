"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheck, Wand2, FileText, ScanSearch, Sparkles, type LucideIcon } from "lucide-react";

type Demo = {
  id: string;
  tool: string;
  icon: LucideIcon;
  prompt: string;
  output: string;
  meta: string;
};

const DEMOS: Demo[] = [
  {
    id: "humanizer",
    tool: "Humanizer",
    icon: Wand2,
    prompt: "Humanize: 'The implementation of artificial intelligence has...'",
    output:
      "Look, AI is changing how schools work. Teachers are seeing it. Students are using it. The classroom you graduated from is not the classroom now.",
    meta: "AI score: 4% · 218 words · 1.2s",
  },
  {
    id: "detector",
    tool: "AI Detector",
    icon: ShieldCheck,
    prompt: "Scan this 800-word essay for AI-generated patterns…",
    output:
      "Confidence: human-written 92%. 3 sentences flagged for review. Top signal: lexical diversity within natural range.",
    meta: "Highlights · Per-sentence score · 0.8s",
  },
  {
    id: "essay",
    tool: "Essay Writer",
    icon: FileText,
    prompt: "Write a 1500-word IGCSE history essay on the Cold War's origins.",
    output:
      "The seeds of the Cold War were sown long before 1945. By the time Allied tanks rolled into Berlin, the cracks between Washington and Moscow were already widening — ideological, territorial, personal.",
    meta: "Citations: 7 · IGCSE-tuned · streaming",
  },
  {
    id: "solver",
    tool: "Problem Solver",
    icon: ScanSearch,
    prompt: "[image upload] solve this calculus problem step-by-step",
    output:
      "Step 1: Apply chain rule. Step 2: Substitute u = sin(x). Step 3: Integrate u². Step 4: Back-substitute. Final answer: -cos³(x)/3 + C.",
    meta: "OCR + step solver · 1.4s",
  },
];

const TYPE_SPEED = 14; // ms per char
const HOLD = 2200; // ms after type completes

export function LiveDemo() {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"prompt" | "thinking" | "output" | "hold">("prompt");

  const demo = DEMOS[idx];

  // Typewriter loop
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function run() {
      // type prompt
      setPhase("prompt");
      setTyped("");
      for (let i = 1; i <= demo.prompt.length; i++) {
        if (cancelled) return;
        setTyped(demo.prompt.slice(0, i));
        await new Promise((r) => (timer = setTimeout(r, TYPE_SPEED)));
      }
      if (cancelled) return;
      // thinking
      setPhase("thinking");
      await new Promise((r) => (timer = setTimeout(r, 700)));
      if (cancelled) return;
      // type output
      setPhase("output");
      setTyped("");
      for (let i = 1; i <= demo.output.length; i++) {
        if (cancelled) return;
        setTyped(demo.output.slice(0, i));
        await new Promise((r) => (timer = setTimeout(r, TYPE_SPEED)));
      }
      if (cancelled) return;
      setPhase("hold");
      await new Promise((r) => (timer = setTimeout(r, HOLD)));
      if (cancelled) return;
      setIdx((p) => (p + 1) % DEMOS.length);
    }
    run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [demo, idx]);

  const Icon = demo.icon;

  return (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-px rounded-3xl bg-blue-500/20 blur-2xl opacity-60" aria-hidden />

      <div className="relative rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-blue-500/10 overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/80" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">kabyar.app/dashboard/</span>
            <span className="text-gray-700">{demo.id}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping-slow" />
            <span className="text-gray-500 font-mono">live</span>
          </div>
        </div>

        {/* Tool tabs */}
        <div className="flex gap-1 px-3 sm:px-5 pt-3 overflow-x-auto scrollbar-hide">
          {DEMOS.map((d, i) => {
            const I = d.icon;
            const active = i === idx;
            return (
              <button
                key={d.id}
                onClick={() => setIdx(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <I className="w-3.5 h-3.5" />
                <span>{d.tool}</span>
              </button>
            );
          })}
        </div>

        {/* Console body */}
        <div className="px-4 sm:px-6 py-5 sm:py-7 min-h-[260px] sm:min-h-[300px] font-mono text-sm sm:text-[15px] leading-relaxed">
          <AnimatePresence mode="wait">
            <motion.div
              key={demo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-blue-600 select-none">&gt;</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 break-words">
                    {phase === "prompt" ? typed : demo.prompt}
                    {phase === "prompt" && <span className="caret" />}
                  </p>
                </div>
              </div>

              {phase === "thinking" && (
                <div className="flex items-center gap-2 text-gray-400 ml-5 mb-3">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-dot" style={{ animationDelay: "0s" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-dot" style={{ animationDelay: "0.15s" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-dot" style={{ animationDelay: "0.3s" }} />
                  </span>
                  <span className="text-xs">thinking</span>
                </div>
              )}

              {(phase === "output" || phase === "hold") && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-sans break-words">
                      {phase === "output" ? typed : demo.output}
                      {phase === "output" && <span className="caret" />}
                    </p>
                    {phase === "hold" && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-[11px] sm:text-xs text-gray-400"
                      >
                        {demo.meta}
                      </motion.p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
