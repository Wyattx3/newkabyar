"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  TOOLS, 
  TOOL_CATEGORIES, 
  getToolsByCategory,
  getToolPath,
  type Tool, 
  type ToolCategory 
} from "@/lib/tools-registry";
import { Button } from "@/components/ui/button";
import {
  Search,
  Sparkles,
  Construction,
  ArrowRight,
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
  ScanSearch,
  BrainCircuit,
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
  ScanSearch,
  BrainCircuit,
};

// Category icon mapping
const CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
  rag: FileSearch,
  research: Globe,
  media: Video,
  visual: Shapes,
  writing: PenTool,
};

// Color classes for categories and tools
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
  blue: { 
    bg: "bg-blue-600", 
    text: "text-blue-600", 
    border: "border-blue-200",
    shadow: "shadow-blue-500/20"
  },
  emerald: { 
    bg: "bg-emerald-600", 
    text: "text-emerald-600", 
    border: "border-emerald-200",
    shadow: "shadow-emerald-500/20"
  },
  purple: { 
    bg: "bg-purple-600", 
    text: "text-purple-600", 
    border: "border-purple-200",
    shadow: "shadow-purple-500/20"
  },
  amber: { 
    bg: "bg-amber-600", 
    text: "text-amber-600", 
    border: "border-amber-200",
    shadow: "shadow-amber-500/20"
  },
  rose: { 
    bg: "bg-rose-600", 
    text: "text-rose-600", 
    border: "border-rose-200",
    shadow: "shadow-rose-500/20"
  },
};

interface ToolsGridProps {
  showCategories?: boolean;
  selectedCategory?: ToolCategory | "all";
  showSearch?: boolean;
  compact?: boolean;
}

export function ToolsGrid({
  showCategories = true,
  selectedCategory = "all",
  showSearch = true,
  compact = false,
}: ToolsGridProps) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "all">(selectedCategory);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tools
  const filteredTools = TOOLS.filter((tool) => {
    const matchesCategory = activeCategory === "all" || tool.category === activeCategory;
    const matchesSearch = searchQuery === "" || 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group by category for display
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];

  return (
    <div className="space-y-6">
      {/* Search and Category Filters */}
      {(showSearch || showCategories) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
          
          {showCategories && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveCategory("all")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === "all"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                All Tools
              </button>
              {categories.map((cat) => {
                const CategoryIcon = CATEGORY_ICONS[cat];
                const category = TOOL_CATEGORIES[cat];
                const colors = COLOR_CLASSES[category.color];
                const isActive = activeCategory === cat;
                
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? `${colors.bg} text-white shadow-lg ${colors.shadow}`
                        : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <CategoryIcon className="w-4 h-4" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tools Grid */}
      {activeCategory === "all" && !searchQuery ? (
        // Show by category
        <div className="space-y-8">
          {categories.map((cat) => {
            const CategoryIcon = CATEGORY_ICONS[cat];
            const category = TOOL_CATEGORIES[cat];
            const tools = getToolsByCategory(cat);
            const colors = COLOR_CLASSES[category.color];
            
            return (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-4">
                  <CategoryIcon className={`w-6 h-6 ${colors.text}`} />
                  <div>
                    <h3 className="font-bold text-gray-900">{category.name}</h3>
                    <p className="text-xs text-gray-500">{category.description}</p>
                  </div>
                </div>
                
                <div className={`grid gap-4 ${compact ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                  {tools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} compact={compact} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Show filtered grid
        <div className={`grid gap-4 ${compact ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
          {filteredTools.length > 0 ? (
            filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} compact={compact} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No tools found matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Individual Tool Card
interface ToolCardProps {
  tool: Tool;
  compact?: boolean;
}

function ToolCard({ tool, compact = false }: ToolCardProps) {
  const IconComponent = ICON_MAP[tool.icon] || Sparkles;
  const colors = COLOR_CLASSES[tool.color] || COLOR_CLASSES.blue;
  const isComingSoon = tool.status === "coming-soon";
  
  return (
    <Link
      href={getToolPath(tool)}
      className={`group relative bg-white rounded-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isComingSoon ? "opacity-80" : ""
      }`}
    >
      {/* Coming Soon Badge */}
      {isComingSoon && (
        <div className="absolute top-2 right-2 z-10">
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded-full">
            <Construction className="w-3 h-3" />
            Soon
          </span>
        </div>
      )}
      
      <div className={`p-4 ${compact ? "p-3" : "p-5"}`}>
        {/* Icon */}
        <IconComponent className={`w-7 h-7 ${colors.text} mb-3 group-hover:scale-110 transition-transform duration-300`} />
        
        {/* Content */}
        <h4 className={`font-bold text-gray-900 mb-1 ${compact ? "text-sm" : "text-base"}`}>
          {tool.name}
        </h4>
        <p className={`text-gray-500 mb-3 line-clamp-2 ${compact ? "text-xs" : "text-sm"}`}>
          {tool.shortDescription}
        </p>
        
        {/* Features */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tool.features.slice(0, 3).map((feature, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-50 rounded-full text-[10px] text-gray-500"
              >
                {feature}
              </span>
            ))}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className={`text-xs ${colors.text} font-medium`}>
            {tool.credits} credits
          </span>
          <ArrowRight className={`w-4 h-4 text-gray-300 group-hover:${colors.text} group-hover:translate-x-1 transition-all`} />
        </div>
      </div>
    </Link>
  );
}

// Export for reuse
export { ToolCard, ICON_MAP, CATEGORY_ICONS, COLOR_CLASSES };
