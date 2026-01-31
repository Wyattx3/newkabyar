"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface ToolHeroProps {
  icon: LucideIcon;
  title: string;
  titleKo?: string;
  description: string;
  credits: number;
  category: string;
  categoryLink: string;
  stats?: { label: string; value: string }[];
  accentColor?: "blue" | "purple" | "green" | "amber" | "rose";
  children?: ReactNode;
}

const accentColors = {
  blue: {
    iconBg: "from-blue-500 to-indigo-600",
    iconGlow: "bg-blue-400",
    creditBg: "from-blue-50 to-indigo-50",
    creditText: "text-blue-600",
    creditBorder: "border-blue-100/50",
  },
  purple: {
    iconBg: "from-violet-500 to-purple-600",
    iconGlow: "bg-violet-400",
    creditBg: "from-violet-50 to-purple-50",
    creditText: "text-violet-600",
    creditBorder: "border-violet-100/50",
  },
  green: {
    iconBg: "from-emerald-500 to-teal-600",
    iconGlow: "bg-emerald-400",
    creditBg: "from-emerald-50 to-teal-50",
    creditText: "text-emerald-600",
    creditBorder: "border-emerald-100/50",
  },
  amber: {
    iconBg: "from-amber-500 to-orange-600",
    iconGlow: "bg-amber-400",
    creditBg: "from-amber-50 to-orange-50",
    creditText: "text-amber-600",
    creditBorder: "border-amber-100/50",
  },
  rose: {
    iconBg: "from-rose-500 to-pink-600",
    iconGlow: "bg-rose-400",
    creditBg: "from-rose-50 to-pink-50",
    creditText: "text-rose-600",
    creditBorder: "border-rose-100/50",
  },
};

export function ToolHero({
  icon: Icon,
  title,
  titleKo,
  description,
  credits,
  category,
  categoryLink,
  stats,
  accentColor = "blue",
  children,
}: ToolHeroProps) {
  const colors = accentColors[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mb-5"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 rounded-[28px] blur-xl" />
      
      {/* Hero Card */}
      <div className="relative bg-white/90 backdrop-blur-sm rounded-[24px] px-6 py-4 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.08)] border border-white/60">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Icon + Info */}
          <div className="flex items-center gap-4">
            {/* 3D Animated Icon */}
            <motion.div 
              className="relative group"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {/* Glow */}
              <div className={cn(
                "absolute inset-0 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity duration-300",
                colors.iconGlow
              )} />
              {/* Icon Container */}
              <div className={cn(
                "relative w-14 h-14 rounded-2xl flex items-center justify-center",
                "bg-gradient-to-br shadow-lg",
                colors.iconBg
              )}>
                <Icon className="w-7 h-7 text-white" />
              </div>
            </motion.div>

            {/* Title & Description */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">{title}</h1>
                {titleKo && <span className="text-sm text-gray-400 font-medium">{titleKo}</span>}
              </div>
              <p className="text-sm text-gray-500 max-w-md">{description}</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Stats */}
            {stats && stats.length > 0 && (
              <div className="hidden lg:flex items-center gap-4 mr-4">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Category Link */}
            <Link 
              href={categoryLink}
              className="hidden sm:flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors px-3 py-1.5 rounded-full hover:bg-gray-50"
            >
              {category}
              <ChevronRight className="w-3 h-3" />
            </Link>

            {/* Credits Badge */}
            <motion.div 
              className={cn(
                "px-4 py-2 rounded-full border shadow-sm flex items-center gap-2",
                "bg-gradient-to-r",
                colors.creditBg,
                colors.creditBorder
              )}
              whileHover={{ scale: 1.02 }}
            >
              <Sparkles className={cn("w-4 h-4", colors.creditText)} />
              <span className={cn("text-sm font-semibold", colors.creditText)}>{credits}</span>
              <span className="text-xs text-gray-400">credits</span>
            </motion.div>

            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
