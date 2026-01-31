"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Star, Zap, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

// Progress Ring
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: "blue" | "green" | "amber" | "purple";
  showPercentage?: boolean;
  label?: string;
  animate?: boolean;
}

const ringColors = {
  blue: { stroke: "#3B82F6", bg: "#EFF6FF" },
  green: { stroke: "#10B981", bg: "#ECFDF5" },
  amber: { stroke: "#F59E0B", bg: "#FFFBEB" },
  purple: { stroke: "#8B5CF6", bg: "#F5F3FF" },
};

export function ProgressRing({ 
  progress, 
  size = 80, 
  strokeWidth = 8,
  color = "blue",
  showPercentage = true,
  label,
  animate = true
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const colors = ringColors[color];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.bg}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: animate ? offset : circumference }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span 
            className="text-lg font-bold text-gray-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {progress}%
          </motion.span>
        )}
        {label && <span className="text-[10px] text-gray-400">{label}</span>}
      </div>
    </div>
  );
}

// Streak Counter
interface StreakCounterProps {
  count: number;
  label?: string;
  variant?: "fire" | "star" | "lightning";
}

export function StreakCounter({ count, label = "Day Streak", variant = "fire" }: StreakCounterProps) {
  const icons = {
    fire: Flame,
    star: Star,
    lightning: Zap,
  };
  const Icon = icons[variant];
  const iconColors = {
    fire: "text-orange-500",
    star: "text-yellow-500",
    lightning: "text-blue-500",
  };

  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className={cn("w-8 h-8", iconColors[variant])} />
        </motion.div>
        <div>
          <motion.p 
            className="text-3xl font-bold text-gray-800"
            key={count}
            initial={{ scale: 1.2, color: "#F59E0B" }}
            animate={{ scale: 1, color: "#1F2937" }}
          >
            {count}
          </motion.p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Confetti Effect
interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
}

export function Confetti({ show, duration = 3000 }: { show: boolean; duration?: number }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show) {
      const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4"];
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  return (
    <AnimatePresence>
      {pieces.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {pieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute w-3 h-3 rounded-sm"
              style={{ 
                left: `${piece.x}%`, 
                backgroundColor: piece.color,
                rotate: piece.rotation,
              }}
              initial={{ y: -20, opacity: 1 }}
              animate={{ 
                y: "100vh", 
                opacity: 0,
                rotate: piece.rotation + 720,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2 + Math.random(), 
                delay: piece.delay,
                ease: "easeIn"
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Achievement Badge
interface AchievementBadgeProps {
  icon: "trophy" | "star" | "target" | "trending";
  label: string;
  unlocked?: boolean;
  size?: "sm" | "md";
}

export function AchievementBadge({ icon, label, unlocked = true, size = "md" }: AchievementBadgeProps) {
  const icons = { trophy: Trophy, star: Star, target: Target, trending: TrendingUp };
  const Icon = icons[icon];
  const isSm = size === "sm";

  return (
    <motion.div
      className={cn(
        "relative flex flex-col items-center gap-2",
        !unlocked && "opacity-40 grayscale"
      )}
      whileHover={unlocked ? { scale: 1.05 } : {}}
    >
      <Icon className={cn("text-amber-500", isSm ? "w-6 h-6" : "w-8 h-8")} />
      <span className={cn(
        "text-center text-gray-600 font-medium",
        isSm ? "text-xs" : "text-sm"
      )}>
        {label}
      </span>
    </motion.div>
  );
}

// Stats Card
interface StatsCardProps {
  value: string | number;
  label: string;
  change?: number;
  icon?: "trending" | "target" | "star";
}

export function StatsCard({ value, label, change, icon }: StatsCardProps) {
  const icons = { trending: TrendingUp, target: Target, star: Star };
  const Icon = icon ? icons[icon] : null;
  const isPositive = change && change > 0;

  return (
    <motion.div
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
      whileHover={{ y: -2, boxShadow: "0 8px 30px -10px rgba(0,0,0,0.1)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <motion.p 
            className="text-2xl font-bold text-gray-800"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {value}
          </motion.p>
          <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        </div>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-blue-500" />
          </div>
        )}
      </div>
      
      {change !== undefined && (
        <div className={cn(
          "mt-2 flex items-center gap-1 text-xs font-medium",
          isPositive ? "text-green-600" : "text-red-500"
        )}>
          <TrendingUp className={cn("w-3 h-3", !isPositive && "rotate-180")} />
          {isPositive ? "+" : ""}{change}% from last week
        </div>
      )}
    </motion.div>
  );
}

// XP Bar
interface XPBarProps {
  current: number;
  max: number;
  level: number;
}

export function XPBar({ current, max, level }: XPBarProps) {
  const percentage = (current / max) * 100;

  return (
    <div className="flex items-center gap-3">
      {/* Level badge */}
      <span className="text-2xl font-bold text-blue-600">{level}</span>
      
      {/* XP bar */}
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Level {level}</span>
          <span className="text-gray-400">{current}/{max} XP</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}
