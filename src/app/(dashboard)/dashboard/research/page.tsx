"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ToolsGrid } from "@/components/dashboard/tools-grid";
import { TOOL_CATEGORIES, getToolsByCategory } from "@/lib/tools-registry";
import { Globe, ArrowLeft } from "lucide-react";

export default function ResearchCategoryPage() {
  const [mounted, setMounted] = useState(false);
  const category = TOOL_CATEGORIES.research;
  const tools = getToolsByCategory("research");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`max-w-6xl mx-auto transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        
        <div className="flex items-center gap-4">
          <Globe className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            <p className="text-gray-500">{category.description}</p>
          </div>
        </div>
      </div>

      {/* Tools Count */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-5 bg-emerald-600 rounded-full" />
        <span className="text-lg font-semibold text-gray-900">{tools.length} Tools</span>
        <span className="text-sm text-gray-400">in this category</span>
      </div>

      {/* Tools Grid */}
      <ToolsGrid 
        selectedCategory="research" 
        showCategories={false} 
        showSearch={false} 
      />
    </div>
  );
}
