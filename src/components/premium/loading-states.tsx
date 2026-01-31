"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { KayMascot } from "./mascot";

// Pulse Loader
export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-blue-500"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// Shimmer Effect for skeleton loading
export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-gray-100 rounded-xl", className)}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 p-5 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Shimmer className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Shimmer className="h-4 w-3/4" />
          <Shimmer className="h-3 w-1/2" />
        </div>
      </div>
      <Shimmer className="h-32 w-full" />
      <div className="flex gap-2">
        <Shimmer className="h-8 flex-1" />
        <Shimmer className="h-8 w-20" />
      </div>
    </div>
  );
}

// Content Loading with mascot
export function ContentLoading({ message = "Generating content..." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 gap-4"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <KayMascot size="lg" mood="thinking" />
      </motion.div>
      
      <div className="flex flex-col items-center gap-2">
        <PulseLoader />
        <motion.p
          className="text-sm text-gray-500"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
}

// AI Thinking Animation
export function AIThinking({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.2 }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-blue-500"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
          />
          <Shimmer className={cn(
            "h-4 rounded-lg",
            i === 0 && "w-4/5",
            i === 1 && "w-3/5",
            i === 2 && "w-2/5"
          )} />
        </motion.div>
      ))}
    </div>
  );
}

// Typing Indicator
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-full w-fit">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// Full Page Loading
export function PageLoading({ title = "Loading" }: { title?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-blue-500" />
        </motion.div>
        <p className="text-gray-600 font-medium">{title}</p>
      </motion.div>
    </div>
  );
}

// Processing Steps Animation
interface ProcessingStepProps {
  steps: string[];
  currentStep: number;
}

export function ProcessingSteps({ steps, currentStep }: ProcessingStepProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const isComplete = i < currentStep;
        const isActive = i === currentStep;
        const isPending = i > currentStep;

        return (
          <motion.div
            key={i}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
              isComplete && "bg-green-50",
              isActive && "bg-blue-50",
              isPending && "bg-gray-50"
            )}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            {/* Step indicator */}
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              isComplete && "bg-green-500 text-white",
              isActive && "bg-blue-500 text-white",
              isPending && "bg-gray-300 text-gray-500"
            )}>
              {isComplete ? "✓" : i + 1}
            </div>

            {/* Step text */}
            <span className={cn(
              "text-sm",
              isComplete && "text-green-700",
              isActive && "text-blue-700 font-medium",
              isPending && "text-gray-400"
            )}>
              {step}
            </span>

            {/* Loading indicator for active step */}
            {isActive && (
              <motion.div
                className="ml-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-4 h-4 text-blue-500" />
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
