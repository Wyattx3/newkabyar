"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MascotProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  mood?: "happy" | "thinking" | "excited" | "sleeping" | "waving";
  className?: string;
  animate?: boolean;
}

const sizes = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
};

// Kay - The Wise Owl Mascot
export function KayMascot({ size = "md", mood = "happy", className, animate = true }: MascotProps) {
  const s = sizes[size];
  
  return (
    <motion.div
      className={cn("relative", className)}
      initial={animate ? { scale: 0.8, opacity: 0 } : false}
      animate={animate ? { scale: 1, opacity: 1 } : false}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body */}
        <motion.ellipse
          cx="50"
          cy="60"
          rx="35"
          ry="32"
          fill="url(#bodyGradient)"
          animate={animate && mood === "happy" ? { 
            scale: [1, 1.02, 1],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Belly */}
        <ellipse cx="50" cy="65" rx="20" ry="18" fill="#E8F4FC" />
        
        {/* Face/Head */}
        <motion.circle
          cx="50"
          cy="38"
          r="28"
          fill="url(#bodyGradient)"
          animate={animate && mood === "thinking" ? { 
            rotate: [-2, 2, -2],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        {/* Ears/Tufts */}
        <path d="M28 18 L35 30 L22 28 Z" fill="url(#bodyGradient)" />
        <path d="M72 18 L65 30 L78 28 Z" fill="url(#bodyGradient)" />
        <path d="M30 20 L35 28 L26 27 Z" fill="#3B82F6" />
        <path d="M70 20 L65 28 L74 27 Z" fill="#3B82F6" />
        
        {/* Eye whites */}
        <ellipse cx="38" cy="38" rx="10" ry="11" fill="white" />
        <ellipse cx="62" cy="38" rx="10" ry="11" fill="white" />
        
        {/* Pupils */}
        <motion.g
          animate={animate ? {
            x: mood === "thinking" ? [0, 2, 0] : 0,
            y: mood === "sleeping" ? 3 : 0,
          } : {}}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {mood === "sleeping" ? (
            <>
              <path d="M32 38 Q38 42 44 38" stroke="#1E40AF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M56 38 Q62 42 68 38" stroke="#1E40AF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="38" cy="38" r="5" fill="#1E40AF" />
              <circle cx="62" cy="38" r="5" fill="#1E40AF" />
              {/* Eye shine */}
              <circle cx="40" cy="36" r="2" fill="white" />
              <circle cx="64" cy="36" r="2" fill="white" />
            </>
          )}
        </motion.g>
        
        {/* Beak */}
        <path d="M45 48 L50 56 L55 48 Z" fill="#F59E0B" />
        <path d="M47 48 L50 53 L53 48 Z" fill="#FBBF24" />
        
        {/* Blush */}
        {(mood === "happy" || mood === "excited") && (
          <>
            <ellipse cx="26" cy="45" rx="5" ry="3" fill="#FCA5A5" opacity="0.6" />
            <ellipse cx="74" cy="45" rx="5" ry="3" fill="#FCA5A5" opacity="0.6" />
          </>
        )}
        
        {/* Wings */}
        <motion.path
          d="M15 55 Q10 65 18 75 Q25 70 22 60 Z"
          fill="url(#wingGradient)"
          animate={animate && mood === "waving" ? {
            rotate: [0, -20, 0],
            originX: "22px",
            originY: "60px",
          } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
        <path d="M85 55 Q90 65 82 75 Q75 70 78 60 Z" fill="url(#wingGradient)" />
        
        {/* Feet */}
        <ellipse cx="40" cy="90" rx="8" ry="4" fill="#F59E0B" />
        <ellipse cx="60" cy="90" rx="8" ry="4" fill="#F59E0B" />
        
        {/* Thinking bubbles */}
        {mood === "thinking" && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <circle cx="80" cy="20" r="3" fill="#93C5FD" />
            <circle cx="85" cy="12" r="4" fill="#93C5FD" />
            <circle cx="92" cy="5" r="5" fill="#93C5FD" />
          </motion.g>
        )}
        
        {/* Excitement sparkles */}
        {mood === "excited" && (
          <motion.g
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <path d="M85 25 L87 20 L89 25 L94 27 L89 29 L87 34 L85 29 L80 27 Z" fill="#FBBF24" />
            <path d="M15 25 L17 20 L19 25 L24 27 L19 29 L17 34 L15 29 L10 27 Z" fill="#FBBF24" />
          </motion.g>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="wingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
}

// Speech Bubble for mascot
interface SpeechBubbleProps {
  message: string;
  position?: "left" | "right" | "top";
  className?: string;
}

export function MascotSpeech({ message, position = "right", className }: SpeechBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "relative bg-white rounded-2xl px-4 py-2 shadow-lg border border-gray-100",
        "before:absolute before:w-3 before:h-3 before:bg-white before:border-gray-100",
        position === "left" && "before:-left-1.5 before:top-4 before:rotate-45 before:border-l before:border-b",
        position === "right" && "before:-right-1.5 before:top-4 before:rotate-45 before:border-r before:border-t",
        position === "top" && "before:left-1/2 before:-bottom-1.5 before:-translate-x-1/2 before:rotate-45 before:border-r before:border-b",
        className
      )}
    >
      <p className="text-sm text-gray-700">{message}</p>
    </motion.div>
  );
}

// Mascot with greeting
interface MascotGreetingProps {
  greeting?: string;
  mascotSize?: MascotProps["size"];
  mood?: MascotProps["mood"];
}

export function MascotGreeting({ 
  greeting = "မင်္ဂလာပါ! ဘာကူညီပေးရမလဲ?", 
  mascotSize = "md",
  mood = "happy"
}: MascotGreetingProps) {
  return (
    <div className="flex items-center gap-3">
      <KayMascot size={mascotSize} mood={mood} />
      <MascotSpeech message={greeting} position="left" />
    </div>
  );
}

// Loading mascot
export function MascotLoading({ message = "လုပ်ဆောင်နေပါတယ်..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <KayMascot size="lg" mood="thinking" />
      </motion.div>
      <motion.p
        className="text-sm text-gray-500"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {message}
      </motion.p>
    </div>
  );
}

// Success mascot
export function MascotSuccess({ message = "အောင်မြင်ပါပြီ!" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <KayMascot size="lg" mood="excited" />
      <p className="text-sm font-medium text-green-600">{message}</p>
    </div>
  );
}
