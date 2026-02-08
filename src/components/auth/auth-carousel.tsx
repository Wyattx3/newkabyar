"use client";

import { useState, useEffect } from "react";
import { Sparkles, Zap, ShieldCheck, Brain, Rocket, Star, Check, type LucideIcon } from "lucide-react";

interface SlideData {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  items: string[];
  stat: { value: string; label: string };
  quote?: { text: string; author: string };
}

const slides: SlideData[] = [
  {
    icon: Sparkles,
    title: "25+ AI Tools",
    subtitle: "One platform for everything",
    items: ["Paraphrase & Humanize", "AI Detection & Bypass", "Assignment Automation"],
    stat: { value: "25+", label: "Powerful Tools" },
  },
  {
    icon: ShieldCheck,
    title: "Undetectable Content",
    subtitle: "Pass any AI detector",
    items: ["99% bypass rate", "Natural human tone", "Word-count matching"],
    stat: { value: "99%", label: "Bypass Rate" },
    quote: { text: "My essays never get flagged anymore. Game changer!", author: "Emma D. — IB Student" },
  },
  {
    icon: Brain,
    title: "Smart Problem Solver",
    subtitle: "Upload any question",
    items: ["Image & text input", "Step-by-step solutions", "AI tutor follow-up"],
    stat: { value: "3x", label: "Faster Learning" },
  },
  {
    icon: Rocket,
    title: "Assignment Worker",
    subtitle: "AI completes it end-to-end",
    items: ["Agentic task decomposition", "PDF/DOC/TXT support", "Rich formatted output"],
    stat: { value: "10hrs+", label: "Saved Weekly" },
    quote: { text: "Kabyar does in 5 minutes what took me hours.", author: "Alex K. — GED Student" },
  },
  {
    icon: Zap,
    title: "Video Explainer",
    subtitle: "Animated lessons on any topic",
    items: ["AI-generated scenes", "Voice narration", "Topic-relevant images"],
    stat: { value: "4.9", label: "Student Rating" },
  },
];

export function AuthCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveSlide((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const slide = slides[activeSlide];
  const SlideIcon = slide.icon;

  return (
    <div className="hidden lg:flex flex-1 bg-[#fafafa] items-center justify-center relative overflow-hidden">
      {/* Subtle animated bg shapes */}
      <div className="absolute w-72 h-72 rounded-full bg-blue-50/50 -top-20 -right-20" style={{ animation: "authDrift 18s ease-in-out infinite" }} />
      <div className="absolute w-48 h-48 rounded-full bg-blue-100/30 bottom-10 -left-10" style={{ animation: "authDrift 14s ease-in-out infinite 2s" }} />

      <div className="relative z-10 w-full max-w-sm px-10">
        {/* Main card */}
        <div
          className={`bg-white rounded-2xl border border-gray-100 p-7 shadow-sm transition-all duration-400 ${
            isTransitioning ? "opacity-0 translate-y-4 scale-[0.97]" : "opacity-100 translate-y-0 scale-100"
          }`}
        >
          {/* Icon + title */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <SlideIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-[15px]">{slide.title}</p>
              <p className="text-[11px] text-gray-400">{slide.subtitle}</p>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2.5 mb-5">
            {slide.items.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-xs text-gray-600">{item}</span>
              </div>
            ))}
          </div>

          {/* Stat */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
            <p className="text-2xl font-black text-blue-600">{slide.stat.value}</p>
            <p className="text-[11px] text-gray-400 leading-tight">{slide.stat.label}</p>
          </div>
        </div>

        {/* Quote card — shows only for slides that have a quote */}
        {slide.quote && (
          <div
            className={`mt-4 bg-white rounded-xl border border-gray-100 p-4 shadow-sm transition-all duration-400 delay-100 ${
              isTransitioning ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0"
            }`}
          >
            <div className="flex items-center gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-1.5">&quot;{slide.quote.text}&quot;</p>
            <p className="text-[11px] font-medium text-gray-900">{slide.quote.author}</p>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-300 mt-6">
          Study smarter. Achieve more.
        </p>
      </div>

      <style jsx>{`
        @keyframes authDrift {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
