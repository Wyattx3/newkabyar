"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { ContentInput } from "@/components/tools/content-input";
import { 
  ClipboardCheck, 
  Loader2, 
  Sparkles, 
  ChevronRight,
  Zap,
  BookOpen,
  Target,
  Send,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { useAutoSaveProject } from "@/hooks/use-auto-save-project";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Question {
  id: number;
  type: "mcq" | "truefalse" | "fillblank" | "fillin";
  question: string;
  questionTranslated?: string;
  options?: string[];
  optionsTranslated?: string[];
  answer: string;
  explanation?: string;
  explanationTranslated?: string;
}

interface QuizResult {
  questions: Question[];
}

type Step = "input" | "config" | "quiz" | "results";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "my", label: "မြန်မာ" },
  { code: "zh", label: "中文" },
  { code: "th", label: "ไทย" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
];

export default function QuizGeneratorPage() {
  const [text, setText] = usePersistedState("quiz-text", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("quiz-model", "fast");
  const [questionCount, setQuestionCount] = usePersistedState("quiz-count", 5);
  const [customCount, setCustomCount] = usePersistedState("quiz-custom-count", "");
  const [difficulty, setDifficulty] = usePersistedState("quiz-difficulty", "medium");
  const [quizLanguage, setQuizLanguage] = usePersistedState("quiz-language", "en");
  
  const [step, setStep] = useState<Step>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const { saveProject } = useAutoSaveProject("quiz-generator");
  
  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Build quiz context for chat
  const getQuizContext = () => {
    if (!quiz) return "";
    const results = quiz.questions.map((q, i) => {
      const isCorrect = q.answer && answers[i]?.toLowerCase() === q.answer.toLowerCase();
      return `Q${i + 1}: ${q.question}\nUser's Answer: ${answers[i] || "Not answered"}\nCorrect Answer: ${q.answer}\nResult: ${isCorrect ? "Correct" : "Wrong"}${q.explanation ? `\nExplanation: ${q.explanation}` : ""}`;
    }).join("\n\n");
    return `Quiz Results (Score: ${score}%):\n\n${results}`;
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      const response = await fetch("/api/tools/quiz/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { 
              role: "system", 
              content: `You are a helpful tutor helping a student understand their quiz results. Answer questions about the quiz in a friendly, educational way. Keep responses concise. Respond in ${aiLanguage || "English"}.

${getQuizContext()}`
            },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage }
          ],
          model: selectedModel,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to send message");
      
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.content || data.text || "Sorry, I couldn't understand that." }]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (text.trim().length < 50) {
      toast({ title: "Content must be at least 50 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Calculate final question count
      const isTranslating = quizLanguage !== "en";
      let finalQuestionCount = customCount && parseInt(customCount) >= 3 && parseInt(customCount) <= 50
        ? parseInt(customCount)
        : questionCount;
      
      // Batch size: 5 questions per batch for translation (question only, no options), 25 for English
      const batchSize = isTranslating ? 5 : 25;
      const numBatches = Math.ceil(finalQuestionCount / batchSize);
      
      
      // Generate questions in batches with retry logic
      const allQuestions: any[] = [];
      let batchNum = 0;
      const maxRetries = 3;
      
      while (allQuestions.length < finalQuestionCount && batchNum < 60) { // Max 60 batches to prevent infinite loop
        batchNum++;
        const remaining = finalQuestionCount - allQuestions.length;
        const batchCount = Math.min(batchSize, remaining);
        
        if (batchCount <= 0) break;
        
        // Show progress
        toast({ 
          title: `Generating... ${allQuestions.length}/${finalQuestionCount}`,
          description: `Batch ${batchNum}`,
        });

        const response = await fetch("/api/tools/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            questionCount: batchCount,
            questionTypes: ["mcq", "truefalse"],
            difficulty,
            model: selectedModel,
            language: quizLanguage,
          }),
        });

        if (!response.ok) {
          if (response.status === 402) {
            toast({ title: "Insufficient credits", variant: "destructive" });
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          console.error("API Error:", response.status, errorData);
          toast({ title: errorData.error || "Failed to generate quiz", variant: "destructive" });
          return;
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
        

      // Helper function to safely parse JSON with multiple attempts
      const safeParseJSON = (text: string) => {
        // Check if response is empty or too short
        if (!text || text.trim().length < 10) {
          console.error("Empty or too short response:", text);
          throw new Error("Empty response from AI. Please try again.");
        }
        
        // Clean up the response
        let cleaned = text
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .replace(/^[\s\S]*?(\{)/m, '$1') // Remove anything before first {
          .trim();
        
        // Try to find JSON object (complete or incomplete)
        let jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        let jsonString = jsonMatch ? jsonMatch[0] : cleaned;
        
        // If no complete JSON found, try to work with what we have
        if (!jsonMatch && cleaned.startsWith('{')) {
          jsonString = cleaned;
          console.log("Working with incomplete JSON response...");
        } else if (!jsonMatch) {
          console.error("No JSON found in response. Raw response:", text.substring(0, 500));
          throw new Error("Invalid response format. Please try again.");
        }
        
        // Attempt 1: Direct parse
        try {
          return JSON.parse(jsonString);
        } catch (e) {
          console.log("Direct parse failed, trying fixes...");
        }
        
        // Attempt 2: Fix common issues and try to close incomplete JSON
        jsonString = jsonString
          .replace(/,\s*([\}\]])/g, '$1')  // Remove trailing commas
          .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters
        
        // Try to fix truncated JSON by closing brackets
        let fixedJson = jsonString;
        const openBraces = (fixedJson.match(/\{/g) || []).length;
        const closeBraces = (fixedJson.match(/\}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/\]/g) || []).length;
        
        // Remove incomplete last item (usually truncated)
        fixedJson = fixedJson.replace(/,\s*\{[^}]*$/, '');
        fixedJson = fixedJson.replace(/,\s*"[^"]*$/, '');
        fixedJson = fixedJson.replace(/,\s*$/, '');
        
        // Close missing brackets
        for (let i = 0; i < openBrackets - closeBrackets; i++) fixedJson += ']';
        for (let i = 0; i < openBraces - closeBraces; i++) fixedJson += '}';
        
        try {
          const parsed = JSON.parse(fixedJson);
          return parsed;
        } catch (e) {
          console.log("Fixed parse failed, trying question extraction...");
        }
        
        // Attempt 3: Extract questions by finding balanced braces
        const questions: any[] = [];
        
        // Find the questions array start
        const questionsStart = jsonString.indexOf('"questions"');
        if (questionsStart !== -1) {
          const arrayStart = jsonString.indexOf('[', questionsStart);
          if (arrayStart !== -1) {
            let depth = 0;
            let start = -1;
            
            for (let i = arrayStart + 1; i < jsonString.length; i++) {
              const char = jsonString[i];
              
              if (char === '{') {
                if (depth === 0) start = i;
                depth++;
              } else if (char === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                  // Found complete question object
                  const qStr = jsonString.substring(start, i + 1);
                  try {
                    const q = JSON.parse(qStr);
                    if (q.question) questions.push(q);
                  } catch (e) {
                    // Try fixing common issues
                    try {
                      const fixed = qStr.replace(/,\s*\}/g, '}').replace(/,\s*$/g, '');
                      const q = JSON.parse(fixed);
                      if (q.question) questions.push(q);
                    } catch (e2) {
                      console.log("Skipping malformed question at index", questions.length);
                    }
                  }
                  start = -1;
                }
              }
            }
          }
        }
        
        
        if (questions.length > 0) {
          console.log(`Extracted ${questions.length} questions from response`);
          return { questions };
        }
        
        throw new Error("Failed to parse quiz data");
      };
      
        const rawData = safeParseJSON(result);
        
        
        // Add batch questions to allQuestions
        if (rawData.questions) {
          allQuestions.push(...rawData.questions);
        }
      } // End of batch loop
      
        
      // Transform API response to match frontend interface
      const transformedQuestions = allQuestions.map((q: any, idx: number) => {
          // Clean options - remove A), B), C), D) prefixes
          const cleanOptions = q.options?.map((opt: string) => 
            opt.replace(/^[A-Da-d][\)\.\:]\s*/g, '').trim()
          );
          
          // Get correct answer - could be "A", "B", "C", "D" or the actual text
          let answer = q.correctAnswer || q.answer || "";
          
          // If answer is a letter like "A", "B", convert to actual option text
          if (cleanOptions && /^[A-Da-d]$/.test(answer)) {
            const letterIndex = answer.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
            if (letterIndex >= 0 && letterIndex < cleanOptions.length) {
              answer = cleanOptions[letterIndex];
            }
          } else {
            // Clean the answer text too
            answer = answer.replace(/^[A-Da-d][\)\.\:]\s*/g, '').trim();
          }
          
          // Clean translated options if present
          const cleanOptionsTranslated = q.optionsTranslated?.map((opt: string) => 
            opt.replace(/^[A-Da-d][\)\.\:]\s*/g, '').trim()
          );
          
          return {
            id: q.id || idx + 1,
            type: q.type || "mcq",
            question: q.question,
            questionTranslated: q.questionTranslated,
            options: cleanOptions,
            optionsTranslated: cleanOptionsTranslated,
            answer: answer,
            explanation: q.explanation,
            explanationTranslated: q.explanationTranslated,
          };
        });
      
        
      const data: QuizResult = { questions: transformedQuestions };
      setQuiz(data);
      setStep("quiz");
      setCurrentQ(0);
      setAnswers({});
      setShowResults(false);
      setChatMessages([]);
      saveProject({
        inputData: { text, questionCount, difficulty },
        outputData: { quiz: data },
        settings: { model: selectedModel, language: quizLanguage },
        inputPreview: text.slice(0, 200),
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const selectAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQ]: answer });
    
    // Auto-advance to next question after short delay
    setTimeout(() => {
      if (quiz && currentQ < quiz.questions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else if (quiz) {
        setShowResults(true);
        setStep("results");
      }
    }, 400);
  };

  const nextQuestion = () => {
    if (quiz && currentQ < quiz.questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResults(true);
      setStep("results");
    }
  };

  const prevQuestion = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  const calculateScore = () => {
    if (!quiz || !quiz.questions.length) return 0;
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (q.answer && answers[i]?.toLowerCase() === q.answer.toLowerCase()) correct++;
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const resetQuiz = () => {
    setStep("input");
    setQuiz(null);
    setAnswers({});
    setShowResults(false);
    setCurrentQ(0);
  };

  const currentQuestion = quiz?.questions[currentQ];
  const score = calculateScore();

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Floating Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-base lg:text-lg font-bold text-gray-900">Quiz Generator</h1>
            <p className="text-xs text-gray-500">Transform content into quizzes</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href="/dashboard/rag" className="text-xs text-blue-600 hover:underline">RAG Tools</Link>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />3 credits
          </span>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        {step === "input" && (
          <div className="h-full flex flex-col">
            <div className="h-auto lg:h-[380px] bg-white rounded-xl border border-gray-200 p-3 lg:p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="font-medium text-gray-900">Source Content</h2>
              </div>
              
              <div className="flex-1">
                <ContentInput
                  value={text}
                  onChange={setText}
                  placeholder="Paste your notes, textbook content, or upload a PDF. The AI will analyze it and create quiz questions..."
                  minHeight="240px"
                  color="blue"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-xs text-gray-400">{text.length} characters</span>
              <Button
                onClick={() => setStep("config")}
                disabled={text.trim().length < 50}
                className="rounded-full px-6 bg-blue-600 hover:bg-blue-700"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "config" && (
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 md:h-full">
              {/* Questions Count */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-3 lg:p-6 flex flex-col">
                <Target className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Questions</h3>
                <p className="text-xs text-gray-500 mb-4">How many questions?</p>
                <div className="flex-1 flex flex-wrap gap-2">
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setQuestionCount(n); setCustomCount(""); }}
                      className={`flex-1 min-w-[60px] py-3 rounded-xl font-bold transition-all ${
                        questionCount === n && !customCount
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {/* Custom Count */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="3"
                      max="50"
                      placeholder="Custom (3-50)"
                      value={customCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomCount(val);
                        if (val && parseInt(val) >= 3 && parseInt(val) <= 50) {
                          setQuestionCount(parseInt(val));
                        }
                      }}
                      className={`flex-1 px-3 py-2 text-sm rounded-xl border transition-all ${
                        customCount 
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-bold" 
                          : "border-gray-200 bg-gray-50 text-gray-600"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    />
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-3 lg:p-6 flex flex-col">
                <Zap className="w-8 h-8 text-amber-600 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Challenge Level</h3>
                <p className="text-xs text-gray-500 mb-4">Choose quiz difficulty</p>
                <div className="flex-1 space-y-2">
                  {[
                    { value: "easy", label: "Easy", desc: "Basic recall", color: "bg-green-500" },
                    { value: "medium", label: "Medium", desc: "Application", color: "bg-amber-500" },
                    { value: "hard", label: "Hard", desc: "Critical thinking", color: "bg-red-500" },
                    { value: "tricky", label: "Tricky", desc: "Includes misleading options", color: "bg-purple-500" },
                  ].map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className={`w-full py-2.5 px-3 rounded-xl font-medium transition-all flex items-center gap-3 ${
                        difficulty === d.value 
                          ? "bg-gray-900 text-white" 
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.color}`} />
                      <div className="text-left">
                        <span className="block text-sm">{d.label}</span>
                        <span className={`text-[10px] ${difficulty === d.value ? "text-gray-300" : "text-gray-400"}`}>
                          {d.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model & Generate */}
              <div className="bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/30 p-3 lg:p-6 flex flex-col text-white">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">AI Model</h3>
                <p className="text-xs text-blue-100 mb-3">Select processing power</p>
                <div className="mb-4">
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>
                
                {/* Language Selector */}
                <div className="mb-4">
                  <p className="text-xs text-blue-100 mb-2">Quiz Language (Translation)</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setQuizLanguage(lang.code)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                          quizLanguage === lang.code
                            ? "bg-white text-blue-600"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mt-auto space-y-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="w-full rounded-xl py-6 bg-white text-blue-600 hover:bg-blue-50 font-bold"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <>Generate Quiz</>
                    )}
                  </Button>
                  <button onClick={() => setStep("input")} className="w-full text-xs text-blue-200 hover:text-white">
                    ← Back to content
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "quiz" && currentQuestion && (
          <div className="h-full overflow-y-auto py-4">
            <div className="w-full max-w-2xl mx-auto">
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                {currentQ > 0 ? (
                  <button 
                    onClick={prevQuestion}
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    ← Back
                  </button>
                ) : (
                  <span className="text-sm text-gray-500">Question {currentQ + 1} of {quiz?.questions.length}</span>
                )}
                <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${((currentQ + 1) / (quiz?.questions.length || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500">{currentQ + 1}/{quiz?.questions.length}</span>
              </div>

              {/* Question Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 p-3 lg:p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-7 h-7 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">
                    {currentQ + 1}.
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-900 leading-relaxed">{currentQuestion.question}</p>
                    {currentQuestion.questionTranslated && (
                      <p className="text-xs text-gray-400 mt-1.5 italic">
                        → {currentQuestion.questionTranslated}
                      </p>
                    )}
                  </div>
                </div>

                {currentQuestion.type === "mcq" && currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => selectAnswer(opt)}
                        className={`w-full p-3 rounded-xl text-left transition-all border-2 ${
                          answers[currentQ] === opt
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="font-medium text-sm">{String.fromCharCode(65 + i)}.</span>{" "}
                        <span className="text-sm">{opt}</span>
                        {currentQuestion.optionsTranslated?.[i] && (
                          <span className="text-xs text-gray-400 ml-2">
                            ({currentQuestion.optionsTranslated[i]})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === "truefalse" && (
                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    {["True", "False"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => selectAnswer(opt)}
                        className={`p-4 lg:p-6 rounded-2xl font-bold text-base lg:text-lg transition-all border-2 ${
                          answers[currentQ] === opt
                            ? opt === "True" ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700"
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Fill in the blank */}
                {(currentQuestion.type === "fillblank" || currentQuestion.type === "fillin") && (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={answers[currentQ] || ""}
                        onChange={(e) => setAnswers({ ...answers, [currentQ]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && answers[currentQ]?.trim()) {
                            selectAnswer(answers[currentQ]);
                          }
                        }}
                        placeholder="Type your answer here..."
                        className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-lg transition-all"
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={() => answers[currentQ]?.trim() && selectAnswer(answers[currentQ])}
                      disabled={!answers[currentQ]?.trim()}
                      className="w-full rounded-xl py-4 bg-blue-600 hover:bg-blue-700"
                    >
                      Submit Answer
                    </Button>
                  </div>
                )}
              </div>

              {/* Hint text */}
              <p className="text-center text-xs text-gray-400 mt-4">
                {(currentQuestion.type === "fillblank" || currentQuestion.type === "fillin") 
                  ? "Type your answer and press Enter or click Submit"
                  : "Click an answer to continue"
                }
              </p>
            </div>
          </div>
        )}

        {step === "results" && quiz && (
          <div className="h-full flex flex-col lg:flex-row gap-3 lg:gap-4">
            {/* Results Panel */}
            <div className="flex-1 overflow-y-auto px-1">
              {/* Score Card - Facebook Style */}
              <div className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
                <div className="p-3 lg:p-6 text-center border-b border-gray-100">
                  {/* Custom SVG Circle Progress */}
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8"/>
                      <circle 
                        cx="50" cy="50" r="42" fill="none" 
                        stroke={score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444"} 
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${score * 2.64} 264`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl lg:text-2xl font-bold text-gray-900">
                      {score}%
                    </span>
                  </div>
                  <p className="text-base font-medium text-gray-900">
                    {score >= 80 ? "Great job!" : score >= 60 ? "Good effort" : "Keep practicing"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {Object.keys(answers).filter(k => {
                      const q = quiz.questions[parseInt(k)];
                      return q?.answer && answers[parseInt(k)]?.toLowerCase() === q.answer.toLowerCase();
                    }).length} of {quiz.questions.length} correct
                  </p>
                </div>
                
                {/* Action Button */}
                <button 
                  onClick={resetQuiz}
                  className="w-full py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              </div>

              {/* Question Review - Clean List */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Review Answers</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {quiz.questions.map((q, i) => {
                    const isCorrect = q.answer && answers[i]?.toLowerCase() === q.answer.toLowerCase();
                    return (
                      <div key={i} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          {/* Custom SVG Check/X */}
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isCorrect ? "bg-green-500" : "bg-red-500"
                          }`}>
                            {isCorrect ? (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 leading-relaxed">{q.question}</p>
                            {q.questionTranslated && (
                              <p className="text-xs text-gray-500 mt-1 italic">→ {q.questionTranslated}</p>
                            )}
                            <div className="mt-2 text-xs">
                              <span className="text-gray-500">Your answer: </span>
                              <span className={isCorrect ? "text-green-600 font-medium" : "text-red-500 font-medium line-through"}>
                                {answers[i] || "Not answered"}
                              </span>
                            </div>
                            {!isCorrect && (
                              <>
                                <div className="mt-1 text-xs">
                                  <span className="text-gray-500">Correct answer: </span>
                                  <span className="text-green-600 font-medium">{q.answer}</span>
                                </div>
                                {/* Kid-friendly explanation */}
                                {(q.explanation || q.explanationTranslated) && (
                                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                    <div className="flex items-center gap-2 mb-1">
                                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                      </svg>
                                      <span className="text-xs font-semibold text-blue-700">Why is this the answer?</span>
                                    </div>
                                    <p className="text-xs text-blue-800 leading-relaxed">{q.explanation}</p>
                                    {q.explanationTranslated && (
                                      <p className="text-xs text-blue-600 leading-relaxed mt-2 pt-2 border-t border-blue-200 italic">
                                        → {q.explanationTranslated}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                            {isCorrect && (q.explanation || q.explanationTranslated) && (
                              <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                <div className="flex items-center gap-2 mb-1">
                                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-xs font-semibold text-green-700">Well done! Here's why:</span>
                                </div>
                                <p className="text-xs text-green-800 leading-relaxed">{q.explanation}</p>
                                {q.explanationTranslated && (
                                  <p className="text-xs text-green-600 leading-relaxed mt-2 pt-2 border-t border-green-200 italic">
                                    → {q.explanationTranslated}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat Panel */}
            <div className="w-full lg:w-80 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden max-h-[400px] lg:max-h-none">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Ask about your results</span>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-500">Ask me anything about your quiz!</p>
                    <div className="mt-4 space-y-2">
                      {["Why was Q1 wrong?", "Explain this topic", "Give me tips"].map((hint, i) => (
                        <button
                          key={i}
                          onClick={() => { setChatInput(hint); }}
                          className="block w-full text-xs text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          {hint}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === "user" 
                        ? "bg-blue-600 text-white rounded-br-md" 
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className="p-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border-0 rounded-full focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
