"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sparkles, ChevronDown, Check, Crown, Lock } from "lucide-react";

export type ModelType = "super-smart" | "pro-smart" | "normal" | "fast";

interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
  color: string;
  premiumOnly?: boolean;
}

const modelOptions: ModelOption[] = [
  {
    id: "fast",
    name: "Kay AI 1.0",
    description: "Fast & reliable",
    color: "text-blue-600",
  },
  {
    id: "pro-smart",
    name: "Kay AI 2.0",
    description: "Most powerful",
    color: "text-blue-600",
    premiumOnly: true,
  },
];

interface ModelSelectorProps {
  value: ModelType;
  onChange: (model: ModelType) => void;
  className?: string;
}

export function ModelSelector({ value, onChange, className = "" }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; openUp: boolean }>({ top: 0, left: 0, openUp: false });

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch("/api/user/credits");
        if (res.ok) {
          const data = await res.json();
          setUserPlan(data.plan || "free");
        }
      } catch { /* default free */ }
    }
    fetchPlan();
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 140;

      setDropdownPos({
        top: openUp ? rect.top : rect.bottom + 6,
        left: rect.left,
        openUp,
      });
    }
    setIsOpen(prev => !prev);
  }, [isOpen]);

  // Map old model IDs to display
  const displayModel = modelOptions.find(m => m.id === value) || modelOptions[0];

  const isPremium = userPlan === "plus" || userPlan === "pro" || userPlan === "student" || userPlan === "unlimited";

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-lg transition-all duration-200 border border-gray-200"
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>{displayModel.name}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-52 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{
            zIndex: 99999,
            top: dropdownPos.openUp ? undefined : dropdownPos.top,
            bottom: dropdownPos.openUp ? window.innerHeight - dropdownPos.top + 6 : undefined,
            left: dropdownPos.left,
          }}
        >
          {modelOptions.map((model) => {
            const isLocked = model.premiumOnly && !isPremium;

            return (
              <button
                key={model.id}
                onClick={() => {
                  if (!isLocked) {
                    onChange(model.id);
                    setIsOpen(false);
                  }
                }}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                  value === model.id ? "bg-blue-50" : ""
                } ${isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"}`}
              >
                <Sparkles className={`w-4 h-4 ${model.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${value === model.id ? "text-blue-600" : "text-gray-900"}`}>
                      {model.name}
                    </span>
                    {model.premiumOnly && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-600 rounded">
                        <Crown className="w-2.5 h-2.5 inline mr-0.5" />
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">{model.description}</p>
                </div>
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-gray-300" />
                ) : value === model.id ? (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                ) : null}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// Get credit cost for a model
export function getModelCredits(model: ModelType): number {
  return model === "pro-smart" ? 5 : 2;
}

// Check if model is Pro only
export function isProOnlyModel(model: ModelType): boolean {
  return model === "pro-smart" || model === "super-smart";
}

// Hook for managing model state
export function useModelSelector(defaultModel: ModelType = "fast") {
  const [selectedModel, setSelectedModel] = useState<ModelType>(defaultModel);
  return { selectedModel, setSelectedModel };
}
