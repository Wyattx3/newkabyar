"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HistoryPanel } from "@/components/ui/history-panel";
import { KayLoading } from "@/components/ui/kay-loading";
import { CreditsDialog, useCreditsDialog } from "@/components/ui/credits-dialog";
import { 
  getToolBySlug, 
  getToolPath, 
  TOOL_CATEGORIES,
  type Tool,
  type ToolCategory 
} from "@/lib/tools-registry";
import {
  ArrowLeft,
  Clock,
  Coins,
  Sparkles,
  Construction,
  FileSearch,
  Globe,
  Video,
  Shapes,
  PenTool,
  FileQuestion,
  ClipboardCheck,
  TrendingUp,
  Layers,
  FileUser,
  Scale,
  Radar,
  Target,
  Youtube,
  Mic,
  FileAudio,
  MessageSquare,
  Network,
  GitBranch,
  FlaskConical,
  Camera,
  Flame,
  RefreshCw,
  Wand2,
  ShieldCheck,
  Code,
  Bug,
  Swords,
  BookA,
  Mail,
  type LucideIcon,
} from "lucide-react";

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  FileSearch,
  Globe,
  Video,
  Shapes,
  PenTool,
  FileQuestion,
  ClipboardCheck,
  TrendingUp,
  Layers,
  FileUser,
  Scale,
  Radar,
  Target,
  Youtube,
  Mic,
  FileAudio,
  MessageSquare,
  Network,
  Clock,
  GitBranch,
  FlaskConical,
  Camera,
  Flame,
  RefreshCw,
  Wand2,
  ShieldCheck,
  Code,
  Bug,
  Swords,
  BookA,
  Mail,
  Sparkles,
};

// Category icon mapping
const CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
  rag: FileSearch,
  research: Globe,
  media: Video,
  visual: Shapes,
  writing: PenTool,
};

// Color classes
const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-600 shadow-blue-500/25",
  emerald: "bg-emerald-600 shadow-emerald-500/25",
  purple: "bg-purple-600 shadow-purple-500/25",
  amber: "bg-amber-600 shadow-amber-500/25",
  rose: "bg-rose-600 shadow-rose-500/25",
};

interface ToolShellProps {
  toolSlug: string;
  children?: React.ReactNode;
  inputPanel?: React.ReactNode;
  outputPanel?: React.ReactNode;
  isLoading?: boolean;
  loadingMessage?: string;
  onHistorySelect?: (item: { input: string; output: string }) => void;
}

export function ToolShell({
  toolSlug,
  children,
  inputPanel,
  outputPanel,
  isLoading = false,
  loadingMessage = "Processing...",
  onHistorySelect,
}: ToolShellProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const tool = getToolBySlug(toolSlug);
  
  const { isOpen: showCreditsDialog, dialogData, hideDialog } = useCreditsDialog();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!tool) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tool not found</h2>
          <p className="text-gray-500 mb-4">The requested tool does not exist.</p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = ICON_MAP[tool.icon] || Sparkles;
  const CategoryIcon = CATEGORY_ICONS[tool.category];
  const category = TOOL_CATEGORIES[tool.category];
  const colorClass = COLOR_CLASSES[tool.color] || COLOR_CLASSES.blue;

  // Coming Soon state
  if (tool.status === "coming-soon") {
    return (
      <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <IconComponent className={`w-12 h-12 mx-auto mb-6 ${tool.color === 'blue' ? 'text-blue-600' : tool.color === 'emerald' ? 'text-emerald-600' : tool.color === 'purple' ? 'text-purple-600' : tool.color === 'amber' ? 'text-amber-600' : 'text-rose-600'}`} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{tool.name}</h1>
            <p className="text-gray-500 mb-6">{tool.description}</p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700 mb-6">
              <Construction className="w-4 h-4" />
              <span className="text-sm font-medium">Coming Soon</span>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Features in development:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {tool.features.map((feature, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mt-8">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Credits Dialog */}
      <CreditsDialog
        isOpen={showCreditsDialog}
        onClose={hideDialog}
        creditsNeeded={dialogData.creditsNeeded}
        creditsRemaining={dialogData.creditsRemaining}
        onWatchAd={() => {}}
      />
      
      {/* Header */}
      <div className="flex items-start justify-between mb-5 shrink-0">
        <div className="flex items-center gap-4">
          <IconComponent className={`w-7 h-7 ${tool.color === 'blue' ? 'text-blue-600' : tool.color === 'emerald' ? 'text-emerald-600' : tool.color === 'purple' ? 'text-purple-600' : tool.color === 'amber' ? 'text-amber-600' : 'text-rose-600'}`} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{tool.name}</h1>
              <Link
                href={`/dashboard/${tool.category}`}
                className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-500 transition-colors"
              >
                <CategoryIcon className="w-3 h-3" />
                {category.name}
              </Link>
            </div>
            <p className="text-sm text-gray-500">{tool.shortDescription}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onHistorySelect && (
            <HistoryPanel pageType={tool.slug} onSelectItem={onHistorySelect} />
          )}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full">
              <Coins className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">{tool.credits} credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {children ? (
        <div className="flex-1 min-h-0">
          {children}
        </div>
      ) : inputPanel && outputPanel ? (
        <div className="flex-1 grid lg:grid-cols-[360px_1fr] gap-4 min-h-0">
          {/* Input Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <PenTool className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-gray-900 text-sm">Configure</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {inputPanel}
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-sm font-medium text-gray-700">Output</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="h-full flex items-center justify-center p-4">
                  <KayLoading message={loadingMessage} dark={false} />
                </div>
              ) : (
                outputPanel
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Export icon map for use in other components
export { ICON_MAP, CATEGORY_ICONS, COLOR_CLASSES };
