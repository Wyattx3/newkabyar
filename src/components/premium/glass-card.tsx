"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "amber" | "rose";
  hover?: boolean;
  delay?: number;
}

const glowColors = {
  blue: "from-blue-400/20 to-indigo-400/10",
  purple: "from-violet-400/20 to-purple-400/10",
  green: "from-emerald-400/20 to-teal-400/10",
  amber: "from-amber-400/20 to-yellow-400/10",
  rose: "from-rose-400/20 to-pink-400/10",
};

export function GlassCard({ 
  children, 
  className, 
  glowColor = "blue",
  hover = true,
  delay = 0 
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn("relative group", className)}
    >
      {/* Glow Effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br rounded-3xl blur-xl opacity-0 transition-opacity duration-500",
        glowColors[glowColor],
        hover && "group-hover:opacity-100"
      )} />
      
      {/* Card */}
      <div className={cn(
        "relative bg-white/95 backdrop-blur-xl rounded-3xl border border-white/60",
        "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)]",
        hover && "transition-all duration-300 group-hover:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)] group-hover:-translate-y-1"
      )}>
        {children}
      </div>
    </motion.div>
  );
}

// Card Header with Icon
interface CardHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  iconBg?: string;
  action?: ReactNode;
}

export function CardHeader({ icon, title, subtitle, iconBg = "bg-blue-50", action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/50">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center",
          "shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)]",
          iconBg
        )}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// Card Body
interface CardBodyProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function CardBody({ children, className, noPadding }: CardBodyProps) {
  return (
    <div className={cn(!noPadding && "p-5", className)}>
      {children}
    </div>
  );
}
