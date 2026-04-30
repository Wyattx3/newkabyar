"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Animated hero background:
 *  - Faint grid (CSS)
 *  - 3 ambient blue glow blobs (CSS keyframes drift)
 *  - SVG circuit-trace lines that draw in on mount
 *  - Cursor-follow spotlight (radial gradient from a CSS variable)
 *  - Subtle floating geometric shapes (parallax)
 */
export function HeroBg({ scrollY }: { scrollY: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden pointer-events-none [--mx:50%] [--my:30%]"
      aria-hidden
    >
      {/* Animated grid (mask fades to transparent at edges) */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(37,99,235,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.07)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_60%,transparent_100%)] animate-grid-pan"
      />

      {/* Cursor spotlight */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx) var(--my), rgba(37,99,235,0.12), transparent 60%)",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-blue-500/20 blur-[100px] animate-blob-1" />
      <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-sky-400/20 blur-[110px] animate-blob-2" />
      <div className="absolute bottom-0 left-1/3 w-[380px] h-[380px] rounded-full bg-indigo-500/15 blur-[100px] animate-blob-3" />

      {/* SVG circuit traces drawing on mount */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trace" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0" />
            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 0 620 L 280 620 L 320 580 L 540 580 L 580 540 L 1200 540"
          stroke="url(#trace)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        />
        <motion.path
          d="M 0 220 L 180 220 L 220 260 L 460 260 L 500 300 L 1200 300"
          stroke="url(#trace)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.6, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
        />
        <motion.path
          d="M 0 740 L 320 740 L 360 700 L 760 700 L 800 660 L 1200 660"
          stroke="url(#trace)"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 1.0 }}
        />
        {/* Trace nodes (pulsing) */}
        {[
          [320, 580],
          [580, 540],
          [220, 260],
          [500, 300],
          [360, 700],
          [800, 660],
        ].map(([cx, cy], i) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="3"
            fill="#2563eb"
            className="animate-node-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </svg>

      {/* Floating geometric shapes (parallax with scrollY) */}
      <div
        className="absolute w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-blue-600/90 shadow-2xl shadow-blue-600/30"
        style={{
          top: "16%",
          left: "6%",
          transform: `translateY(${scrollY * 0.12}px) rotate(${12 + scrollY * 0.02}deg)`,
          transition: "transform 0.3s ease-out",
        }}
      />
      <div
        className="absolute w-10 h-10 sm:w-14 sm:h-14 rounded-xl border-2 border-blue-500 bg-white/80 backdrop-blur"
        style={{
          top: "22%",
          right: "8%",
          transform: `translateY(${scrollY * 0.18}px) rotate(${-10 + scrollY * 0.03}deg)`,
          transition: "transform 0.3s ease-out",
        }}
      />
      <div
        className="absolute w-14 h-14 sm:w-20 sm:h-20 rounded-3xl bg-blue-100"
        style={{
          top: "62%",
          left: "4%",
          transform: `translateY(${scrollY * 0.08}px) rotate(${8 + scrollY * 0.02}deg)`,
          transition: "transform 0.3s ease-out",
        }}
      />
      <div
        className="absolute w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-blue-600/70 shadow-xl shadow-blue-600/20"
        style={{
          top: "70%",
          right: "6%",
          transform: `translateY(${scrollY * 0.14}px) rotate(${-18 + scrollY * 0.02}deg)`,
          transition: "transform 0.3s ease-out",
        }}
      />
    </div>
  );
}
