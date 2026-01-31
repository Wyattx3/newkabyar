"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { ContentInput } from "@/components/tools/content-input";
import { 
  Layers, 
  Loader2, 
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Download,
  Plus,
  BookOpen,
  ArrowRight,
  Check,
  X,
  List,
  Grid3X3,
  RotateCcw,
  Keyboard,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface Flashcard {
  front: string;
  back: string;
  hint?: string;
  status: "new" | "learning" | "mastered";
  difficulty?: "easy" | "medium" | "hard";
}

export default function FlashcardMakerPage() {
  const [text, setText] = usePersistedState("flashcard-text", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("flashcard-model", "fast");
  const [cardCount, setCardCount] = usePersistedState("flashcard-count", 10);
  
  const [showInput, setShowInput] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [studyMode, setStudyMode] = useState<"all" | "learning" | "new">("all");
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  // Filter cards based on study mode
  const filteredCards = cards.filter(c => {
    if (studyMode === "all") return true;
    if (studyMode === "learning") return c.status === "learning" || c.status === "new";
    if (studyMode === "new") return c.status === "new";
    return true;
  });

  const card = filteredCards[currentCard];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showInput || filteredCards.length === 0) return;
      
      switch (e.key) {
        case "ArrowLeft":
          prevCard();
          break;
        case "ArrowRight":
          nextCard();
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          setIsFlipped(f => !f);
          break;
        case "1":
          markCard("easy");
          break;
        case "2":
          markCard("medium");
          break;
        case "3":
          markCard("hard");
          break;
        case "m":
          markMastered();
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showInput, filteredCards.length, currentCard]);

  const handleGenerate = async () => {
    if (text.trim().length < 50) {
      toast({ title: "Content must be at least 50 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/tools/flashcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          cardCount,
          style: "standard",
          model: selectedModel,
          language: aiLanguage,
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        throw new Error("Failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      let result = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const flashcards = (data.cards || data.flashcards || []).map((c: any) => ({
          front: c.front || c.question || c.term || "",
          back: c.back || c.answer || c.definition || "",
          hint: c.hint || c.tags?.join(", ") || "",
          status: "new" as const,
          difficulty: undefined,
        }));
        setCards(flashcards);
        setShowInput(false);
        setCurrentCard(0);
        setIsFlipped(false);
        toast({ title: `Created ${flashcards.length} flashcards!` });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const nextCard = useCallback(() => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setCurrentCard((c) => (c + 1) % filteredCards.length);
  }, [filteredCards.length]);

  const prevCard = useCallback(() => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setCurrentCard((c) => (c - 1 + filteredCards.length) % filteredCards.length);
  }, [filteredCards.length]);

  const shuffleCards = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentCard(0);
    toast({ title: "Cards shuffled!" });
  };

  const markCard = (difficulty: "easy" | "medium" | "hard") => {
    if (!card) return;
    const cardIndex = cards.findIndex(c => c.front === card.front);
    if (cardIndex === -1) return;
    
    const updated = [...cards];
    updated[cardIndex] = { ...updated[cardIndex], difficulty, status: "learning" };
    setCards(updated);
    nextCard();
  };

  const markMastered = () => {
    if (!card) return;
    const cardIndex = cards.findIndex(c => c.front === card.front);
    if (cardIndex === -1) return;
    
    const updated = [...cards];
    updated[cardIndex] = { ...updated[cardIndex], status: "mastered" };
    setCards(updated);
    toast({ title: "Card marked as mastered!" });
    nextCard();
  };

  const resetProgress = () => {
    setCards(cards.map(c => ({ ...c, status: "new", difficulty: undefined })));
    setCurrentCard(0);
    toast({ title: "Progress reset!" });
  };

  const exportAnki = () => {
    const content = cards.map(c => `${c.front}\t${c.back}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcards_anki.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported for Anki!" });
  };

  // Stats
  const stats = {
    total: cards.length,
    mastered: cards.filter(c => c.status === "mastered").length,
    learning: cards.filter(c => c.status === "learning").length,
    new: cards.filter(c => c.status === "new").length,
  };

  return (
    <div className={`h-full flex flex-col transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Flashcard Maker</h1>
            <p className="text-xs text-gray-500">Create and study flashcards</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/dashboard/rag" className="text-xs text-blue-600 hover:underline">RAG Tools</Link>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">3 credits</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {showInput ? (
          /* Input Mode */
          <div className="max-w-xl mx-auto py-8">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="font-medium text-gray-900">Source Material</h2>
                    <p className="text-xs text-gray-500">Paste content to generate flashcards</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <ContentInput
                  value={text}
                  onChange={setText}
                  placeholder="Paste your study notes, textbook content, or upload a PDF..."
                  minHeight="140px"
                  color="blue"
                />

                {/* Options */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Cards:</span>
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      {[5, 10, 15, 20, 30].map((n) => (
                        <button
                          key={n}
                          onClick={() => setCardCount(n)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                            cardCount === n
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>
              </div>

              {/* Generate Button */}
              <div className="p-5 pt-0">
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || text.trim().length < 50}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                  ) : (
                    <>Create Flashcards <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              Tip: The more detailed your content, the better the flashcards
            </p>
          </div>
        ) : (
          /* Study Mode */
          <div className="max-w-2xl mx-auto py-4">
            {/* Stats Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-600">{stats.mastered} mastered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-xs text-gray-600">{stats.learning} learning</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-xs text-gray-600">{stats.new} new</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Study Mode Filter */}
                  <select
                    value={studyMode}
                    onChange={(e) => { setStudyMode(e.target.value as any); setCurrentCard(0); }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
                  >
                    <option value="all">All cards</option>
                    <option value="learning">Learning only</option>
                    <option value="new">New only</option>
                  </select>
                  
                  {/* View Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode("card")}
                      className={`p-1.5 rounded-md ${viewMode === "card" ? "bg-white shadow-sm" : ""}`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
                    >
                      <List className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {viewMode === "card" ? (
              /* Card View */
              <>
                {/* Progress */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {filteredCards.length > 0 ? currentCard + 1 : 0} / {filteredCards.length}
                  </span>
                  <div className="flex-1 mx-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: filteredCards.length > 0 ? `${((currentCard + 1) / filteredCards.length) * 100}%` : "0%" }}
                    />
                  </div>
                  <button
                    onClick={() => setShowKeyboardHints(!showKeyboardHints)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Keyboard shortcuts"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </div>

                {/* Keyboard Hints */}
                {showKeyboardHints && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs text-gray-600">
                    <div className="flex flex-wrap gap-3">
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border">←</kbd> Previous</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border">→</kbd> Next</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border">Space</kbd> Flip</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border">1</kbd> Easy</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border">2</kbd> Medium</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border">3</kbd> Hard</span>
                      <span><kbd className="px-1.5 py-0.5 bg-white rounded border">M</kbd> Mastered</span>
                    </div>
                  </div>
                )}

                {/* Flashcard */}
                {filteredCards.length > 0 ? (
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="cursor-pointer mb-4"
                    style={{ perspective: "1000px" }}
                  >
                    <div
                      className="relative w-full transition-transform duration-500"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      }}
                    >
                      {/* Front */}
                      <div
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 min-h-[240px] flex flex-col items-center justify-center"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <span className="text-xs font-medium text-blue-600 mb-3">QUESTION</span>
                        <p className="text-lg text-gray-900 text-center leading-relaxed">
                          {card?.front || "No card"}
                        </p>
                        <span className="text-xs text-gray-400 mt-4">Click to reveal answer</span>
                      </div>

                      {/* Back */}
                      <div
                        className="absolute inset-0 bg-blue-600 rounded-2xl shadow-sm p-8 min-h-[240px] flex flex-col items-center justify-center"
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                        }}
                      >
                        <span className="text-xs font-medium text-blue-200 mb-3">ANSWER</span>
                        <p className="text-lg text-white text-center leading-relaxed">
                          {card?.back || "No answer"}
                        </p>
                        {card?.hint && (
                          <p className="text-xs text-blue-200 mt-3 bg-blue-500/50 px-3 py-1 rounded-full">
                            {card.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center text-gray-500">
                    No cards match the current filter
                  </div>
                )}

                {/* Difficulty Rating */}
                {filteredCards.length > 0 && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-xs text-gray-500 mr-2">Rate difficulty:</span>
                    <button
                      onClick={() => markCard("easy")}
                      className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      Easy
                    </button>
                    <button
                      onClick={() => markCard("medium")}
                      className="px-3 py-1.5 text-xs font-medium bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => markCard("hard")}
                      className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Hard
                    </button>
                    <button
                      onClick={markMastered}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                      <Star className="w-3 h-3" /> Mastered
                    </button>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={prevCard}
                    disabled={filteredCards.length === 0}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={nextCard}
                    disabled={filteredCards.length === 0}
                    className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </>
            ) : (
              /* List View */
              <div className="space-y-2">
                {cards.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => { setCurrentCard(i); setViewMode("card"); setIsFlipped(false); }}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.front}</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{c.back}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.difficulty && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            c.difficulty === "easy" ? "bg-green-50 text-green-600" :
                            c.difficulty === "medium" ? "bg-yellow-50 text-yellow-600" :
                            "bg-red-50 text-red-600"
                          }`}>
                            {c.difficulty}
                          </span>
                        )}
                        <div className={`w-2 h-2 rounded-full ${
                          c.status === "mastered" ? "bg-green-500" :
                          c.status === "learning" ? "bg-yellow-500" :
                          "bg-gray-300"
                        }`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowInput(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Deck
              </button>
              <button
                onClick={shuffleCards}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" /> Shuffle
              </button>
              <button
                onClick={resetProgress}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={exportAnki}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
