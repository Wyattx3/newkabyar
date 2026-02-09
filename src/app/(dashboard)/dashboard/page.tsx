"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ToolsGrid } from "@/components/dashboard/tools-grid";
import { TOOLS, TOOL_CATEGORIES, type ToolCategory } from "@/lib/tools-registry";
import {
  KayMascot,
  MascotSpeech,
  ProgressRing,
  Shimmer,
} from "@/components/premium";
import {
  ArrowUpRight,
  Sparkles,
  Play,
  Newspaper,
  Clock,
  StickyNote,
  Plus,
  X,
  RefreshCw,
  Lightbulb,
  Tag,
  FileSearch,
  Video,
  Shapes,
  PenTool,
  ChevronRight,
  ShieldCheck,
  Wand2,
  FileText,
  Mic,
  Network,
  FlaskConical,
  History,
  Flame,
  type LucideIcon,
} from "lucide-react";

interface NewsArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  fullContent?: string;
  actionTip?: string;
  relatedTopics?: string[];
  source: string;
  time: string;
  timestamp?: number;
  color: string;
}

// Sticky note colors
const stickyColors = [
  { bg: "from-yellow-100 to-amber-50", border: "border-yellow-200/50", text: "text-yellow-800" },
  { bg: "from-pink-100 to-rose-50", border: "border-pink-200/50", text: "text-pink-800" },
  { bg: "from-blue-100 to-sky-50", border: "border-blue-200/50", text: "text-blue-800" },
  { bg: "from-green-100 to-emerald-50", border: "border-green-200/50", text: "text-green-800" },
  { bg: "from-purple-100 to-violet-50", border: "border-purple-200/50", text: "text-purple-800" },
];

interface StickyNote {
  id: number;
  content: string;
  colorIndex: number;
  rotation: number;
}

// Activity icons mapping
const activityIcons: Record<string, { icon: LucideIcon; gradient: string }> = {
  "ai-detector": { icon: ShieldCheck, gradient: "from-rose-500 to-pink-600" },
  "humanizer": { icon: Wand2, gradient: "from-violet-500 to-purple-600" },
  "paraphraser": { icon: RefreshCw, gradient: "from-blue-500 to-indigo-600" },
  "pdf-qa": { icon: FileSearch, gradient: "from-blue-500 to-cyan-600" },
  "youtube-summarizer": { icon: Video, gradient: "from-red-500 to-rose-600" },
  "mind-map": { icon: Network, gradient: "from-amber-500 to-orange-600" },
  "flashcard-maker": { icon: FileText, gradient: "from-emerald-500 to-teal-600" },
  "pdf-podcast": { icon: Mic, gradient: "from-purple-500 to-violet-600" },
  "lab-report": { icon: FlaskConical, gradient: "from-cyan-500 to-blue-600" },
  default: { icon: Sparkles, gradient: "from-gray-500 to-gray-600" },
};

interface RecentActivity {
  id: string;
  toolSlug: string;
  toolName: string;
  category: string;
  timestamp: Date;
  inputPreview?: string;
  creditsUsed: number;
}


// Mascot greetings
const mascotGreetings = [
  "မင်္ဂလာပါ! ဒီနေ့ ဘာလေ့လာမလဲ? 📚",
  "ကဲ စတင်ရအောင်! 🚀",
  "ပညာရေး ခရီးကို ဆက်သွားရအောင်! ✨",
  "ကြိုဆိုပါတယ်! Kay ကူညီပေးပါမယ် 🎯",
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([
    { id: 1, content: "📚 Study calculus chapter 5 today!", colorIndex: 0, rotation: -2 },
    { id: 2, content: "💡 Remember: Practice makes perfect", colorIndex: 1, rotation: 3 },
    { id: 3, content: "🎯 Goal: Complete React course by Friday", colorIndex: 2, rotation: -1 },
  ]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showAddNote, setShowAddNote] = useState(false);
  const [mascotGreeting] = useState(() => 
    mascotGreetings[Math.floor(Math.random() * mascotGreetings.length)]
  );
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent activities
  useEffect(() => {
    const fetchActivities = async () => {
      setActivitiesLoading(true);
      try {
        const res = await fetch("/api/user/activity");
        if (res.ok) {
          const data = await res.json();
          setRecentActivities(data.activities || []);
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error);
        // Use mock data if API fails
        setRecentActivities([
          { id: "1", toolSlug: "ai-detector", toolName: "AI Detector", category: "writing", timestamp: new Date(Date.now() - 1000 * 60 * 30), inputPreview: "Analyzed essay about climate change...", creditsUsed: 3 },
          { id: "2", toolSlug: "humanizer", toolName: "Content Humanizer", category: "writing", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), inputPreview: "Humanized AI-generated content...", creditsUsed: 5 },
          { id: "3", toolSlug: "youtube-summarizer", toolName: "YouTube Summarizer", category: "media", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), inputPreview: "Summarized lecture video...", creditsUsed: 3 },
          { id: "4", toolSlug: "mind-map", toolName: "Mind Map Generator", category: "visual", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), inputPreview: "Created mind map for biology...", creditsUsed: 3 },
          { id: "5", toolSlug: "flashcard-maker", toolName: "Flashcard Maker", category: "rag", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), inputPreview: "Generated flashcards for history...", creditsUsed: 3 },
        ]);
      } finally {
        setActivitiesLoading(false);
      }
    };
    fetchActivities();
  }, []);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // Format news time - use timestamp if available, otherwise use time string
  const formatNewsTime = (article: NewsArticle) => {
    if (article.timestamp) {
      const diff = Date.now() - article.timestamp;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days}d ago`;
      return new Date(article.timestamp).toLocaleDateString();
    }
    return article.time;
  };

  // Get today's date as string (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Check if cached news is from today
  const getCachedNews = (): { news: NewsArticle[]; date: string } | null => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem("kay-daily-news");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.news) && parsed.date) {
          return parsed;
        }
      }
    } catch {
      // Invalid cache — clear it
      localStorage.removeItem("kay-daily-news");
    }
    return null;
  };

  // Fetch AI-generated news
  const fetchNews = async (forceRefresh = false) => {
    const cached = getCachedNews();
    const today = getTodayDate();

    if (!forceRefresh && cached && cached.date === today && cached.news.length > 0) {
      setNews(cached.news);
      setNewsLoading(false);
      return;
    }

    setNewsLoading(true);
    try {
      let userProfile = {
        subjects: ["Programming", "AI/ML", "Mathematics", "Web Development"],
        schoolName: "",
        major: "Computer Science",
        educationLevel: "undergraduate",
        studyGoal: "Learn programming and AI",
      };

      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          if (user) {
            userProfile = {
              subjects: user.subjects?.length > 0 ? user.subjects : userProfile.subjects,
              schoolName: user.school || userProfile.schoolName,
              major: user.major || userProfile.major,
              educationLevel: user.educationLevel || userProfile.educationLevel,
              studyGoal: user.studyGoal || userProfile.studyGoal,
            };
          }
        }
      } catch (e) {
        console.error("Failed to load user profile:", e);
      }

      const response = await fetch("/api/news/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userProfile),
      });

      if (response.ok) {
        const data = await response.json();
        const newsItems = (data.news || []).slice(0, 4);
        if (newsItems.length > 0) {
          setNews(newsItems);
          localStorage.setItem("kay-daily-news", JSON.stringify({
            news: newsItems,
            date: today,
          }));
        }
      } else {
        console.error("News API returned:", response.status);
      }
    } catch (error) {
      console.error("Error fetching news:", error);
      const cached = getCachedNews();
      if (cached && cached.news.length > 0) {
        setNews(cached.news);
      }
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedNews();
    const today = getTodayDate();
    
    if (cached && cached.date === today && cached.news.length > 0) {
      setNews(cached.news);
      setNewsLoading(false);
    } else {
      fetchNews();
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const addStickyNote = () => {
    if (!newNoteContent.trim()) return;
    const newNote: StickyNote = {
      id: Date.now(),
      content: newNoteContent,
      colorIndex: Math.floor(Math.random() * stickyColors.length),
      rotation: Math.floor(Math.random() * 7) - 3,
    };
    setStickyNotes([...stickyNotes, newNote]);
    setNewNoteContent("");
    setShowAddNote(false);
  };

  const deleteStickyNote = (id: number) => {
    setStickyNotes(stickyNotes.filter(note => note.id !== id));
  };

  const activeToolsCount = TOOLS.filter(t => t.status === 'active').length;
  const totalToolsCount = TOOLS.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedNews(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${selectedNews.color} mb-2`}>
                    {selectedNews.category}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900">{selectedNews.title}</h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {formatNewsTime(selectedNews)}
                    <span className="text-gray-300">|</span>
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    {selectedNews.source}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-5 overflow-y-auto max-h-[calc(80vh-180px)]">
                <div className="bg-blue-50 rounded-2xl p-4 mb-5">
                  <p className="text-blue-800 font-medium">{selectedNews.summary}</p>
                </div>

                {selectedNews.fullContent && (
                  <div className="prose prose-sm max-w-none mb-5">
                    {selectedNews.fullContent.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="text-gray-700 leading-relaxed mb-4">{paragraph}</p>
                    ))}
                  </div>
                )}

                {selectedNews.actionTip && (
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 rounded-2xl p-4 mb-5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-800 mb-1">Action Tip</h4>
                        <p className="text-sm text-amber-700">{selectedNews.actionTip}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedNews.relatedTopics && selectedNews.relatedTopics.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Related Topics</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedNews.relatedTopics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-default">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4">
                <motion.button
                  onClick={() => setSelectedNews(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-2xl transition-all shadow-lg shadow-blue-500/25"
                >
                  Got it!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header with Mascot */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-indigo-50/30 to-violet-100/50 rounded-[32px] blur-2xl" />
        
        {/* Main Card */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-[28px] border border-white/60 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.15)] overflow-hidden">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233B82F6' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div className="relative p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Mascot + Greeting */}
              <div className="flex items-start gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  <KayMascot size="lg" mood="happy" />
                </motion.div>
                
                <div className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <MascotSpeech message={mascotGreeting} position="left" className="mb-3" />
                  </motion.div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-gray-400 text-sm">{time}</span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                    {getGreeting()}, <span className="text-blue-600">{session?.user?.name?.split(" ")[0] || "there"}</span>
                  </h1>
                  <p className="text-gray-500">What would you like to learn today?</p>
                </div>
              </div>

              {/* Right: Stats */}
              <div className="flex flex-wrap items-center gap-6">
                {/* Streak */}
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Flame className="w-6 h-6 text-orange-500" />
                  </motion.div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">7</p>
                    <p className="text-xs text-gray-500">Day Streak</p>
                  </div>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3">
                  <ProgressRing progress={65} size={48} strokeWidth={5} color="blue" showPercentage={false} />
                  <div>
                    <p className="text-2xl font-bold text-gray-800">65%</p>
                    <p className="text-xs text-gray-500">Weekly Goal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Study Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-800">Recent Study Activity</h2>
              <span className="text-xs text-gray-400">မကြာသေးခင်က လုပ်ဆောင်ချက်များ</span>
            </div>
          </div>
          <button 
            onClick={() => setShowAllActivities(!showAllActivities)}
            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            {showAllActivities ? "Show Less" : "View All"} 
            <ChevronRight className={cn("w-3 h-3 transition-transform", showAllActivities && "rotate-90")} />
          </button>
        </div>

        {activitiesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <Shimmer className="w-10 h-10 rounded-xl" />
                  <div className="flex-1">
                    <Shimmer className="h-4 w-20 mb-1" />
                    <Shimmer className="h-3 w-16" />
                  </div>
                </div>
                <Shimmer className="h-3 w-full mb-2" />
                <Shimmer className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : recentActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {(showAllActivities ? recentActivities : recentActivities.slice(0, 5)).map((activity, i) => {
              const iconData = activityIcons[activity.toolSlug] || activityIcons.default;
              const IconComponent = iconData.icon;
              const categoryData = TOOL_CATEGORIES[activity.category as keyof typeof TOOL_CATEGORIES];
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Link
                    href={`/dashboard/${activity.category}/${activity.toolSlug}`}
                    className="group block bg-white rounded-2xl p-4 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <IconComponent className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                          {activity.toolName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                    
                    {activity.inputPreview && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {activity.inputPreview}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {categoryData?.name || activity.category}
                      </span>
                      <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        {activity.creditsUsed}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">No recent activity</h3>
            <p className="text-sm text-gray-400 mb-4">Start using AI tools to see your study history here</p>
            <Link
              href="/dashboard/writing/ai-detector"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Play className="w-4 h-4" />
              Try AI Detector
            </Link>
          </div>
        )}
      </motion.div>

      {/* Daily News & Sticky Notes Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily News Section */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: mounted ? 1 : 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <Newspaper className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Daily News For You</h2>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-gray-400">AI Curated</span>
                </div>
              </div>
            </div>
            <motion.button
              onClick={() => fetchNews(true)}
              disabled={newsLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${newsLoading ? "animate-spin" : ""}`} />
            </motion.button>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-4">
            {newsLoading ? (
              [...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-5 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Shimmer className="w-20 h-6 rounded-full" />
                    <Shimmer className="w-16 h-4 rounded" />
                  </div>
                  <Shimmer className="h-5 w-full mb-2" />
                  <Shimmer className="h-5 w-3/4 mb-3" />
                  <Shimmer className="h-4 w-full mb-1" />
                  <Shimmer className="h-4 w-2/3" />
                </motion.div>
              ))
            ) : (
              news.map((article, i) => (
                <motion.button
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  onClick={() => setSelectedNews(article)}
                  whileHover={{ y: -4, boxShadow: "0 20px 40px -12px rgba(99,102,241,0.15)" }}
                  className="group relative bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer text-left transition-all duration-300 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${article.color}`}>
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {formatNewsTime(article)}
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{article.summary}</p>

                  <div className="flex items-center gap-1 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read more <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Sticky Notes Section - Redesigned */}
        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: mounted ? 1 : 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <StickyNote className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Quick Notes</h2>
                <span className="text-xs text-gray-400">{stickyNotes.length} notes</span>
              </div>
            </div>
            <motion.button
              onClick={() => setShowAddNote(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </motion.div>

          <div className="space-y-3">
            <AnimatePresence>
              {showAddNote && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border-2 border-dashed border-amber-300"
                >
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write your note..."
                    rows={3}
                    className="w-full bg-transparent border-0 resize-none text-sm text-gray-700 placeholder:text-amber-400 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      onClick={() => { setShowAddNote(false); setNewNoteContent(""); }}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors rounded-xl hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={addStickyNote}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/25"
                    >
                      Add Note
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {stickyNotes.map((note, i) => {
              const color = stickyColors[note.colorIndex];
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, x: 20, rotate: note.rotation }}
                  animate={{ opacity: 1, x: 0, rotate: note.rotation }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ scale: 1.02, rotate: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`group relative bg-gradient-to-br ${color.bg} ${color.border} border rounded-2xl p-4 shadow-lg transition-all duration-300`}
                >
                  {/* Pin */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 shadow-md" />
                  
                  {/* Delete button */}
                  <motion.button
                    onClick={() => deleteStickyNote(note.id)}
                    initial={{ opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                  >
                    <X className="w-3 h-3 text-red-500" />
                  </motion.button>
                  
                  <p className={`text-sm ${color.text} font-medium pr-6`}>
                    {note.content}
                  </p>
                </motion.div>
              );
            })}

            {stickyNotes.length === 0 && !showAddNote && (
              <div className="text-center py-8 text-gray-400">
                <StickyNote className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notes yet. Add one!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: mounted ? 1 : 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">AI Tools</h2>
            <span className="text-xs text-gray-400">{activeToolsCount} active / {totalToolsCount} total</span>
          </div>
        </div>

        <ToolsGrid showCategories={true} showSearch={true} />
      </motion.div>

      {/* Quick Actions - Premium Style */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -2 }}
          className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all"
        >
          <div className="flex items-start gap-3">
            <Play className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">New to Kabyar?</h3>
              <p className="text-sm text-gray-500 mb-3">Start with AI Detector or Humanizer to check your content.</p>
              <Link 
                href="/dashboard/writing/ai-detector" 
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Try AI Detector <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 20 }}
          transition={{ delay: 0.7 }}
          whileHover={{ y: -2 }}
          className="group bg-white rounded-2xl p-5 border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all"
        >
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">Pro Tip</h3>
              <p className="text-sm text-gray-500 mb-3">Set up your profile for personalized AI responses.</p>
              <Link 
                href="/dashboard/settings" 
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
              >
                Personalize AI <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: mounted ? 1 : 0 }}
        transition={{ delay: 0.8 }}
        className="flex items-center justify-center gap-4 py-4 text-sm text-gray-400"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>All systems operational</span>
        </div>
        <span className="text-gray-200">|</span>
        <span>Powered by OpenAI, Claude, Gemini & Grok</span>
      </motion.div>
    </div>
  );
}
