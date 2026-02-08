"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TOOL_CATEGORIES,
  getToolsByCategory,
  getToolPath,
  getAllTools,
  type ToolCategory,
  type Tool,
} from "@/lib/tools-registry";
import {
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Coins,
  Crown,
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
  Home,
  Star,
  Library,
  ScanSearch,
  BrainCircuit,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Icon mapping for tools
const ICON_MAP: Record<string, LucideIcon> = {
  FileSearch, Globe, Video, Shapes, PenTool, FileQuestion, ClipboardCheck,
  TrendingUp, Layers, FileUser, Scale, Radar, Target, Youtube, Mic,
  FileAudio, MessageSquare, Network, Clock, GitBranch, FlaskConical,
  Camera, Flame, RefreshCw, Wand2, ShieldCheck, Code, Bug, Swords, BookA, Mail, Sparkles, ScanSearch, BrainCircuit,
};

// Category icon mapping
const CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
  rag: FileSearch,
  research: Globe,
  media: Video,
  visual: Shapes,
  writing: PenTool,
};

// Category colors
const CATEGORY_COLORS: Record<ToolCategory, { bg: string; text: string; activeBg: string; border: string }> = {
  rag: { bg: "bg-blue-50", text: "text-blue-600", activeBg: "bg-blue-600", border: "border-blue-500" },
  research: { bg: "bg-emerald-50", text: "text-emerald-600", activeBg: "bg-emerald-600", border: "border-emerald-500" },
  media: { bg: "bg-purple-50", text: "text-purple-600", activeBg: "bg-purple-600", border: "border-purple-500" },
  visual: { bg: "bg-amber-50", text: "text-amber-600", activeBg: "bg-amber-600", border: "border-amber-500" },
  writing: { bg: "bg-rose-50", text: "text-rose-600", activeBg: "bg-rose-600", border: "border-rose-500" },
};

interface UserProfile {
  name: string;
  email: string;
  image: string | null;
  dailyCredits: number;
  dailyCreditsUsed: number;
  creditsRemaining: number;
  resetTimeText: string;
  plan: "free" | "pro" | "unlimited";
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<ToolCategory | null>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const profilePopupRef = useRef<HTMLDivElement>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("favorite-tools");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (toolId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId];
      localStorage.setItem("favorite-tools", JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  // Get favorite tools
  const allTools = getAllTools();
  const favoriteTools = allTools.filter(tool => favorites.includes(tool.id));

  // Find active category from path
  useEffect(() => {
    const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];
    for (const cat of categories) {
      if (pathname.includes(`/dashboard/${cat}/`)) {
        setActiveCategory(cat);
        return;
      }
    }
    setActiveCategory(null);
  }, [pathname]);

  // Fetch user profile
  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  useEffect(() => {
    if (session?.user) fetchProfile();
  }, [session]);

  useEffect(() => {
    const handleProfileUpdate = () => fetchProfile();
    const handleCreditsUpdate = () => fetchProfile();
    window.addEventListener("profile-updated", handleProfileUpdate);
    window.addEventListener("credits-updated", handleCreditsUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
      window.removeEventListener("credits-updated", handleCreditsUpdate);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profilePopupRef.current && !profilePopupRef.current.contains(event.target as Node)) {
        setShowProfilePopup(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = userProfile?.name || session?.user?.name || "User";
  const userImage = userProfile?.image || session?.user?.image;
  const credits = userProfile?.creditsRemaining ?? 50;
  const categories = Object.keys(TOOL_CATEGORIES) as ToolCategory[];

  return (
    <TooltipProvider>
      {/* Mobile Toggle */}
      <button
        className="fixed top-5 left-5 z-50 lg:hidden w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center border border-gray-100"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5 text-gray-700" /> : <Menu className="h-5 w-5 text-gray-700" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Desktop Overlay when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/10 z-30 hidden lg:block transition-opacity duration-300" 
          onClick={() => setIsExpanded(false)} 
        />
      )}

      {/* Grammarly-style Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-100 transition-all duration-300 flex flex-col shadow-xl",
          isExpanded ? "w-[260px] shadow-2xl shadow-black/10" : "w-[56px] shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo / Header */}
        <div className={cn(
          "flex items-center shrink-0 border-b border-gray-50 transition-all duration-300",
          isExpanded ? "px-4 py-4 justify-between" : "p-2 justify-center"
        )}>
          {isExpanded ? (
            <>
              <Image src="/kabyar-logo.png" alt="Kabyar" width={120} height={32} className="object-contain h-8 w-auto" priority />
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 transition-colors"
            >
              <Sparkles className="w-5 h-5 text-blue-600 hover:text-blue-700" />
            </button>
          )}
        </div>

        {/* Tools Icons */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 scrollbar-hide">
          {/* Home */}
          {isExpanded ? (
            <Link
              href="/dashboard"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 transition-all duration-200",
                pathname === "/dashboard"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              <Home className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">Home</span>
            </Link>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2 mb-2">
                  <Link href="/dashboard" onClick={() => setIsMobileOpen(false)}>
                    <Home className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      pathname === "/dashboard" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                    )} />
                  </Link>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white border-0">
                Home
              </TooltipContent>
            </Tooltip>
          )}

          {/* Library */}
          {isExpanded ? (
            <Link
              href="/dashboard/library"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 transition-all duration-200",
                pathname === "/dashboard/library"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              )}
            >
              <Library className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">My Library</span>
            </Link>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2 mb-2">
                  <Link href="/dashboard/library" onClick={() => setIsMobileOpen(false)}>
                    <Library className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      pathname === "/dashboard/library" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                    )} />
                  </Link>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white border-0">
                My Library
              </TooltipContent>
            </Tooltip>
          )}

          {/* Divider */}
          <div className="h-px bg-gray-100 my-2" />

          {/* Favorites Section */}
          {favoriteTools.length > 0 && (
            <>
              {isExpanded ? (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-1 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Favorites</span>
                  </div>
                  <div className="space-y-0.5">
                    {favoriteTools.map((tool) => {
                      const toolPath = getToolPath(tool);
                      const isActive = pathname === toolPath;
                      const ToolIcon = ICON_MAP[tool.icon] || Sparkles;
                      const colors = CATEGORY_COLORS[tool.category];
                      
                      return (
                        <div key={tool.id} className="group/fav relative">
                          <Link
                            href={toolPath}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isActive
                                ? `${colors.activeBg} text-white shadow-sm`
                                : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <ToolIcon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : colors.text)} />
                            <span className="flex-1 truncate">{tool.name}</span>
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(tool.id); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/fav:opacity-100 transition-opacity"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mb-1">
                  {favoriteTools.map((tool) => {
                    const toolPath = getToolPath(tool);
                    const isActive = pathname === toolPath;
                    const ToolIcon = ICON_MAP[tool.icon] || Sparkles;
                    const colors = CATEGORY_COLORS[tool.category];
                    
                    return (
                      <Tooltip key={tool.id} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center py-1">
                            <Link href={toolPath} onClick={() => setIsMobileOpen(false)}>
                              <div className="relative">
                                <ToolIcon className={cn(
                                  "w-5 h-5 transition-colors duration-200",
                                  isActive ? colors.text : "text-gray-400 hover:text-gray-600"
                                )} />
                                <Star className="absolute -top-1 -right-1 w-2 h-2 text-amber-500 fill-amber-500" />
                              </div>
                            </Link>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-gray-900 text-white border-0">
                          <div className="flex items-center gap-1">
                            {tool.name}
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  <div className="h-px bg-amber-200 my-2 mx-2" />
                </div>
              )}
              {isExpanded && <div className="h-px bg-gray-100 my-2" />}
            </>
          )}

          {/* Category Tools */}
          {categories.map((category) => {
            const catMeta = TOOL_CATEGORIES[category];
            const CategoryIcon = CATEGORY_ICONS[category];
            const colors = CATEGORY_COLORS[category];
            const tools = getToolsByCategory(category);
            const isActiveCategory = activeCategory === category;
            
            if (isExpanded) {
              // Expanded: Show category header + tools
              return (
                <div key={category} className="mb-3">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 mb-1",
                    isActiveCategory ? colors.text : "text-gray-400"
                  )}>
                    <CategoryIcon className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">{catMeta.name}</span>
                  </div>
                  <div className="space-y-0.5">
                    {tools.map((tool) => {
                      const toolPath = getToolPath(tool);
                      const isActive = pathname === toolPath;
                      const ToolIcon = ICON_MAP[tool.icon] || Sparkles;
                      const isFavorite = favorites.includes(tool.id);
                      
                      return (
                        <div key={tool.id} className="group/tool relative">
                          <Link
                            href={toolPath}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                              isActive
                                ? `${colors.activeBg} text-white shadow-sm`
                                : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <ToolIcon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : colors.text)} />
                            <span className="flex-1 truncate">{tool.name}</span>
                            {tool.status === "coming-soon" && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[9px] font-medium rounded">Soon</span>
                            )}
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(tool.id); }}
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all",
                              isFavorite ? "opacity-100" : "opacity-0 group-hover/tool:opacity-100"
                            )}
                          >
                            <Star className={cn(
                              "w-3.5 h-3.5 transition-colors",
                              isFavorite ? "text-amber-500 fill-amber-500" : "text-gray-400 hover:text-amber-500"
                            )} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            } else {
              // Collapsed: Show all tool icons (plain icons only)
              return (
                <div key={category} className="mb-1">
                  {/* All tools in category */}
                  {tools.map((tool) => {
                    const toolPath = getToolPath(tool);
                    const isActive = pathname === toolPath;
                    const ToolIcon = ICON_MAP[tool.icon] || Sparkles;
                    const isFavorite = favorites.includes(tool.id);
                    
                    return (
                      <Tooltip key={tool.id} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center py-1">
                            <Link
                              href={toolPath}
                              onClick={() => setIsMobileOpen(false)}
                              onContextMenu={(e) => { e.preventDefault(); toggleFavorite(tool.id); }}
                            >
                              <div className="relative">
                                <ToolIcon className={cn(
                                  "w-5 h-5 transition-colors duration-200",
                                  isActive ? colors.text : "text-gray-400 hover:text-gray-600"
                                )} />
                                {isFavorite && (
                                  <Star className="absolute -top-1 -right-1 w-2 h-2 text-amber-500 fill-amber-500" />
                                )}
                              </div>
                            </Link>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-gray-900 text-white border-0">
                          <div className="flex items-center gap-1.5">
                            {tool.name}
                            {isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                            {tool.status === "coming-soon" && (
                              <span className="px-1 py-0.5 bg-amber-500 text-[9px] rounded">Soon</span>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            }
          })}
        </nav>

        {/* Bottom Section */}
        <div className={cn(
          "border-t border-gray-100 transition-all duration-300",
          isExpanded ? "p-3" : "p-2"
        )} ref={profilePopupRef}>
          {/* Settings */}
          {isExpanded ? (
            <Link
              href="/dashboard/settings"
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl mb-2 transition-all duration-200",
                pathname === "/dashboard/settings"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              )}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2 mb-2">
                  <Link href="/dashboard/settings" onClick={() => setIsMobileOpen(false)} className="relative">
                    <Settings className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      pathname === "/dashboard/settings" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                    )} />
                  </Link>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white border-0">
                Settings
              </TooltipContent>
            </Tooltip>
          )}

          {/* Profile Popup (Expanded) */}
          {isExpanded && showProfilePopup && (
            <div className="absolute bottom-20 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-bottom-2">
              <div className="bg-blue-600 px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white/30">
                    {userImage && <AvatarImage src={userImage} alt={userName} />}
                    <AvatarFallback className="bg-white text-blue-600 font-bold">{userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{userName}</p>
                    <p className="text-xs text-blue-200 truncate">{userProfile?.email || session?.user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-gray-500">Credits</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{credits}</span>
                </div>
                {userProfile?.plan === "free" && (
                  <Link href="/dashboard/plans" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" />Upgrade
                  </Link>
                )}
              </div>
              <div className="px-4 pb-4">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full py-2 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />Logout
                </button>
              </div>
            </div>
          )}

          {/* User Button */}
          {isExpanded ? (
            <button
              onClick={() => setShowProfilePopup(!showProfilePopup)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              <Avatar className="h-8 w-8 shrink-0">
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-bold">{userName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-gray-900 truncate">{userName}</p>
                <div className="flex items-center gap-1">
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 font-medium">{credits}</span>
                </div>
              </div>
            </button>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center py-2">
                  <button onClick={() => setShowProfilePopup(!showProfilePopup)}>
                    <Avatar className="h-7 w-7">
                      {userImage && <AvatarImage src={userImage} alt={userName} />}
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-[10px] font-bold">{userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-900 text-white border-0">
                {userName} • {credits} credits
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
