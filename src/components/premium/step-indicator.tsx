"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";

interface Step {
  id: string;
  label: string;
  labelKo?: string;
  icon?: LucideIcon;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  variant?: "horizontal" | "vertical";
  size?: "sm" | "md";
}

export function StepIndicator({ 
  steps, 
  currentStep, 
  variant = "horizontal",
  size = "md" 
}: StepIndicatorProps) {
  const isHorizontal = variant === "horizontal";
  const isSm = size === "sm";

  return (
    <div className={cn(
      "flex gap-2",
      isHorizontal ? "flex-row items-center" : "flex-col"
    )}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const StepIcon = step.icon;

        return (
          <div key={step.id} className={cn(
            "flex items-center gap-2",
            isHorizontal && index < steps.length - 1 && "flex-1"
          )}>
            {/* Step Circle */}
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.1 : 1,
                backgroundColor: isCompleted 
                  ? "rgb(34, 197, 94)" 
                  : isActive 
                    ? "rgb(59, 130, 246)" 
                    : "rgb(243, 244, 246)"
              }}
              className={cn(
                "relative flex items-center justify-center rounded-full transition-colors",
                isSm ? "w-8 h-8" : "w-10 h-10",
                isCompleted || isActive ? "shadow-md" : ""
              )}
            >
              {/* Pulse animation for active */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-blue-400"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              {isCompleted ? (
                <Check className={cn("text-white", isSm ? "w-4 h-4" : "w-5 h-5")} />
              ) : StepIcon ? (
                <StepIcon className={cn(
                  isSm ? "w-4 h-4" : "w-5 h-5",
                  isActive ? "text-white" : "text-gray-400"
                )} />
              ) : (
                <span className={cn(
                  "font-bold",
                  isSm ? "text-xs" : "text-sm",
                  isActive ? "text-white" : "text-gray-400"
                )}>
                  {index + 1}
                </span>
              )}
            </motion.div>

            {/* Step Label */}
            {!isHorizontal && (
              <div className="flex flex-col">
                <span className={cn(
                  "font-medium transition-colors",
                  isSm ? "text-xs" : "text-sm",
                  isCompleted ? "text-green-600" : isActive ? "text-blue-600" : "text-gray-400"
                )}>
                  {step.label}
                </span>
                {step.labelKo && (
                  <span className="text-[10px] text-gray-400">{step.labelKo}</span>
                )}
              </div>
            )}

            {/* Connector Line (horizontal) */}
            {isHorizontal && index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded-full bg-gray-200 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: isCompleted ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Compact pill-style steps
interface StepPillsProps {
  steps: string[];
  currentStep: number;
}

export function StepPills({ steps, currentStep }: StepPillsProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <motion.div
            key={index}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              isCompleted && "bg-green-100 text-green-700",
              isActive && "bg-blue-100 text-blue-700 shadow-sm",
              !isCompleted && !isActive && "bg-gray-100 text-gray-400"
            )}
            animate={{ scale: isActive ? 1.05 : 1 }}
          >
            <span className="flex items-center gap-1.5">
              {isCompleted && <Check className="w-3 h-3" />}
              <span>{step}</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
