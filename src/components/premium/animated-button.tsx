"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion";
import { Loader2, Check, Sparkles, type LucideIcon } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

interface AnimatedButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: "primary" | "secondary" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  isSuccess?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  glow?: boolean;
  children?: ReactNode;
}

const variants = {
  primary: {
    base: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25",
    hover: "hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/30",
    disabled: "disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none",
  },
  secondary: {
    base: "bg-white text-gray-700 border border-gray-200 shadow-sm",
    hover: "hover:bg-gray-50 hover:border-gray-300 hover:shadow-md",
    disabled: "disabled:bg-gray-100 disabled:text-gray-400",
  },
  ghost: {
    base: "bg-transparent text-gray-600",
    hover: "hover:bg-gray-100 hover:text-gray-900",
    disabled: "disabled:text-gray-300",
  },
  success: {
    base: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25",
    hover: "hover:from-emerald-600 hover:to-teal-700",
    disabled: "disabled:from-gray-300 disabled:to-gray-400",
  },
};

const sizes = {
  sm: "h-9 px-4 text-xs rounded-xl gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-14 px-6 text-base rounded-2xl gap-2.5",
};

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    className, 
    variant = "primary", 
    size = "md", 
    isLoading, 
    isSuccess,
    icon: Icon,
    iconPosition = "left",
    glow = true,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const v = variants[variant];
    const s = sizes[size];

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={cn(
          "relative inline-flex items-center justify-center font-medium transition-all duration-300",
          s,
          v.base,
          v.hover,
          v.disabled,
          "disabled:cursor-not-allowed disabled:opacity-70",
          className
        )}
        {...props}
      >
        {/* Glow effect */}
        {glow && variant === "primary" && !disabled && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-indigo-500 blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </motion.span>
          ) : isSuccess ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Done!</span>
            </motion.span>
          ) : (
            <motion.span
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              {Icon && iconPosition === "left" && <Icon className="w-4 h-4" />}
              {children}
              {Icon && iconPosition === "right" && <Icon className="w-4 h-4" />}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

// Floating Action Button
interface FloatingButtonProps extends AnimatedButtonProps {
  pulse?: boolean;
}

export function FloatingButton({ pulse = true, className, ...props }: FloatingButtonProps) {
  return (
    <div className="relative">
      {/* Pulse ring */}
      {pulse && !props.disabled && !props.isLoading && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-blue-400"
          initial={{ scale: 1, opacity: 0.4 }}
          animate={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <AnimatedButton 
        className={cn("relative z-10", className)} 
        {...props} 
      />
    </div>
  );
}

// Sparkle Button (for premium actions)
export function SparkleButton({ children, ...props }: AnimatedButtonProps) {
  return (
    <AnimatedButton icon={Sparkles} {...props}>
      {children}
    </AnimatedButton>
  );
}
