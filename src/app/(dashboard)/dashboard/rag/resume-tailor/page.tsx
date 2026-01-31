"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileUser, 
  Loader2, 
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Lightbulb,
  Zap,
  Key,
  ArrowRight,
  FileText,
  Target,
  Upload,
  Download,
  Copy,
  RefreshCw,
  BarChart3,
  TrendingUp,
  ChevronRight,
  FileDown,
  Mail,
  HelpCircle,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface KeywordMatch {
  keyword: string;
  found: boolean;
  importance?: "high" | "medium" | "low";
}

interface BulletImprovement {
  original: string;
  improved: string;
  reason: string;
}

interface ExperienceEducation {
  matches: boolean;
  details: string;
  yearsRequired?: string;
  yearsHave?: string;
}

interface ResumeResult {
  overallScore: number;
  atsScore: number;
  summary: string;
  keywordMatches: KeywordMatch[];
  missingKeywords: string[];
  bulletImprovements: BulletImprovement[];
  skillsToAdd: string[];
  atsWarnings: string[];
  experience?: ExperienceEducation;
  education?: ExperienceEducation;
}

const focusOptions = [
  { value: "optimize", label: "Optimize", icon: Zap, desc: "Quick improvements" },
  { value: "rewrite", label: "Rewrite", icon: FileText, desc: "Major overhaul" },
  { value: "keywords", label: "ATS Focus", icon: Key, desc: "Keyword optimization" },
];

export default function ResumeTailorPage() {
  const [resume, setResume] = usePersistedState("resume-cv", "");
  const [jobDescription, setJobDescription] = usePersistedState("resume-jd", "");
  const [focus, setFocus] = usePersistedState("resume-focus", "optimize");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("resume-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "improve" | "cover" | "interview">("analysis");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingJD, setUploadingJD] = useState(false);
  
  const resumeFileRef = useRef<HTMLInputElement>(null);
  const jdFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  // PDF Upload Handler
  const handleFileUpload = async (file: File, type: "resume" | "jd") => {
    if (!file) return;
    
    const setUploading = type === "resume" ? setUploadingResume : setUploadingJD;
    const setText = type === "resume" ? setResume : setJobDescription;
    
    setUploading(true);
    
    try {
      if (file.type === "application/pdf") {
        // Use PDF.js or send to API for extraction
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/tools/extract-pdf", {
          method: "POST",
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          setText(data.text || "");
          toast({ title: "PDF extracted successfully!" });
        } else {
          // Fallback: read as text if API fails
          const text = await file.text();
          setText(text);
          toast({ title: "File loaded (text mode)" });
        }
      } else {
        // Plain text file
        const text = await file.text();
        setText(text);
        toast({ title: "File loaded!" });
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({ title: "Failed to load file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (resume.trim().length < 100) {
      toast({ title: "Resume must be at least 100 characters", variant: "destructive" });
      return;
    }
    if (jobDescription.trim().length < 50) {
      toast({ title: "Job description must be at least 50 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription,
          focus,
          model: selectedModel,
          language: typeof aiLanguage === "string" ? aiLanguage : (aiLanguage as any)?.language || "en",
        }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        throw new Error("Failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  // Generate Cover Letter
  const generateCoverLetter = () => {
    if (!result) return;
    setGeneratingCover(true);
    setActiveTab("cover");
    
    // Simulate loading for better UX
    setTimeout(() => {
      const matchedKeywords = result.keywordMatches.filter(k => k.found).slice(0, 5).map(k => k.keyword);
      const skills = result.skillsToAdd.slice(0, 3);
      
      const letter = `Dear Hiring Manager,

I am writing to express my strong interest in this position. After carefully reviewing the job requirements, I am confident that my background and skills make me an excellent candidate for this role.

${result.summary}

Key qualifications that align with your requirements:
${matchedKeywords.map(k => `• Strong experience in ${k}`).join("\n")}

Additional skills I bring to the table:
${skills.map(s => `• ${s}`).join("\n")}

I am particularly excited about this opportunity because it aligns perfectly with my career goals and allows me to leverage my expertise in ${matchedKeywords[0] || "this field"}. I am confident that my proactive approach and dedication to excellence would make me a valuable addition to your team.

I would welcome the opportunity to discuss how my qualifications can contribute to your organization's continued success. Thank you for considering my application.

Best regards,
[Your Name]
[Your Contact Information]`;

      setCoverLetter(letter);
      setGeneratingCover(false);
    }, 1000);
  };

  // Generate Interview Questions
  const generateInterviewQuestions = async () => {
    if (!result) return;
    setGeneratingQuestions(true);
    setActiveTab("interview");
    
    try {
      const keywords = result.keywordMatches.filter(k => k.found).map(k => k.keyword).join(", ");
      const skills = result.skillsToAdd.join(", ");
      
      // Generate questions based on resume analysis
      const questions = [
        `Tell me about your experience with ${keywords.split(",")[0]?.trim() || "your field"}.`,
        `How have you handled challenges in your previous role?`,
        `Can you describe a project where you demonstrated ${result.keywordMatches[0]?.keyword || "leadership"}?`,
        `What interests you about this position?`,
        `How do you stay updated with ${keywords.split(",")[1]?.trim() || "industry trends"}?`,
        `Describe your experience with ${skills.split(",")[0]?.trim() || "relevant technologies"}.`,
        `What are your strengths and how do they align with this role?`,
        `Where do you see yourself in 5 years?`,
      ];
      
      setInterviewQuestions(questions);
    } catch {
      setInterviewQuestions([
        "Tell me about yourself and your background.",
        "Why are you interested in this position?",
        "What are your key strengths?",
        "Describe a challenging project you've worked on.",
        "Where do you see yourself in the next few years?",
      ]);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const exportAnalysis = () => {
    if (!result) return;
    const content = `Resume Analysis Report
=====================

Overall Match Score: ${result.overallScore}%
ATS Compatibility: ${result.atsScore}%

Summary:
${result.summary}

Matched Keywords (${result.keywordMatches.filter(k => k.found).length}):
${result.keywordMatches.filter(k => k.found).map(k => `• ${k.keyword}`).join("\n")}

Missing Keywords (${result.missingKeywords.length}):
${result.missingKeywords.map(k => `• ${k}`).join("\n")}

Skills to Add:
${result.skillsToAdd.map(s => `• ${s}`).join("\n")}

Bullet Improvements:
${result.bulletImprovements.map((b, i) => `${i+1}. "${b.original}" → "${b.improved}"\n   Reason: ${b.reason}`).join("\n\n")}

ATS Warnings:
${result.atsWarnings.map(w => `⚠ ${w}`).join("\n")}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume-analysis.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported!" });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className={`h-full flex flex-col transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileUser className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Resume/CV Tailor</h1>
            <p className="text-xs text-gray-500">Match your resume to job requirements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/rag" className="text-xs text-blue-600 hover:underline">RAG Tools</Link>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">5 credits</span>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={resumeFileRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "resume")}
        className="hidden"
      />
      <input
        ref={jdFileRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "jd")}
        className="hidden"
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {!result ? (
            /* Input Mode */
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Input Grid */}
              <div className="flex-1 grid lg:grid-cols-2 gap-4 min-h-0">
                {/* Resume Input */}
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <FileUser className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900 text-sm">Your Resume/CV</span>
                    </div>
                    <button
                      onClick={() => resumeFileRef.current?.click()}
                      disabled={uploadingResume}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      {uploadingResume ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      Upload PDF
                    </button>
                  </div>
                  <div className="flex-1 p-3 min-h-0">
                    <textarea
                      value={resume}
                      onChange={(e) => setResume(e.target.value)}
                      placeholder="Paste your resume content here or upload a PDF file..."
                      className="w-full h-full resize-none p-3 text-sm text-gray-700 placeholder:text-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 shrink-0">
                    {resume.length} characters • Min 100 required
                  </div>
                </div>

                {/* Job Description Input */}
                <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900 text-sm">Job Description</span>
                    </div>
                    <button
                      onClick={() => jdFileRef.current?.click()}
                      disabled={uploadingJD}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      {uploadingJD ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      Upload PDF
                    </button>
                  </div>
                  <div className="flex-1 p-3 min-h-0">
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the target job description here or upload a PDF..."
                      className="w-full h-full resize-none p-3 text-sm text-gray-700 placeholder:text-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    />
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 shrink-0">
                    {jobDescription.length} characters • Min 50 required
                  </div>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {focusOptions.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setFocus(f.value)}
                          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors ${
                            focus === f.value
                              ? "bg-blue-100 text-blue-700 font-medium"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          <f.icon className="w-4 h-4" />
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={isLoading || resume.trim().length < 100 || jobDescription.trim().length < 50}
                    className="h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                    ) : (
                      <><Target className="w-4 h-4 mr-2" />Analyze Resume</>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Results Mode */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col"
            >
              {/* Scores Header */}
              <div className="grid grid-cols-4 gap-3 mb-4 shrink-0">
                <div className={`rounded-xl border p-4 ${getScoreBg(result.overallScore)}`}>
                  <p className="text-xs text-gray-500 mb-1">Overall Match</p>
                  <p className={`text-3xl font-bold ${getScoreColor(result.overallScore)}`}>{result.overallScore}%</p>
                </div>
                <div className={`rounded-xl border p-4 ${getScoreBg(result.atsScore)}`}>
                  <p className="text-xs text-gray-500 mb-1">ATS Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(result.atsScore)}`}>{result.atsScore}%</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500 mb-1">Keywords Matched</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {result.keywordMatches.filter(k => k.found).length}/{result.keywordMatches.length}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Actions</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setResult(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="New analysis"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={exportAnalysis}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Export"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl mb-4 shrink-0">
                {[
                  { id: "analysis", label: "Analysis", icon: BarChart3 },
                  { id: "improve", label: "Improvements", icon: TrendingUp },
                  { id: "cover", label: "Cover Letter", icon: Mail },
                  { id: "interview", label: "Interview Prep", icon: HelpCircle },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === "cover" && !coverLetter) generateCoverLetter();
                      if (tab.id === "interview" && interviewQuestions.length === 0) generateInterviewQuestions();
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === "analysis" && (
                  <div className="grid lg:grid-cols-[1fr_320px] gap-4">
                    {/* Main Analysis */}
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">Summary</h3>
                        <p className="text-sm text-gray-600">{result.summary}</p>
                      </div>

                      {/* Experience & Education Check */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`rounded-xl border p-4 ${
                          result.experience?.matches !== false
                            ? "bg-green-50 border-green-200" 
                            : "bg-red-50 border-red-200"
                        }`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              result.experience?.matches !== false ? "bg-green-100" : "bg-red-100"
                            }`}>
                              <Briefcase className={`w-5 h-5 ${result.experience?.matches !== false ? "text-green-600" : "text-red-600"}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Experience</p>
                              <p className={`text-xs ${result.experience?.matches !== false ? "text-green-600" : "text-red-600"}`}>
                                {result.experience?.matches !== false ? "Meets requirements" : "Gap identified"}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">
                            {result.experience?.details || 
                              (result.overallScore >= 70 
                                ? "Your experience aligns well with the job requirements." 
                                : "Consider highlighting more relevant experience.")}
                          </p>
                        </div>

                        <div className={`rounded-xl border p-4 ${
                          result.education?.matches !== false
                            ? "bg-green-50 border-green-200" 
                            : "bg-red-50 border-red-200"
                        }`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              result.education?.matches !== false ? "bg-green-100" : "bg-red-100"
                            }`}>
                              <GraduationCap className={`w-5 h-5 ${result.education?.matches !== false ? "text-green-600" : "text-red-600"}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Education</p>
                              <p className={`text-xs ${result.education?.matches !== false ? "text-green-600" : "text-red-600"}`}>
                                {result.education?.matches !== false ? "Meets requirements" : "Gap identified"}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600">
                            {result.education?.details || 
                              (result.overallScore >= 70 
                                ? "Your educational background is suitable for this role." 
                                : "Consider adding relevant certifications or coursework.")}
                          </p>
                        </div>
                      </div>

                      {/* Keywords */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Matched ({result.keywordMatches.filter(k => k.found).length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {result.keywordMatches.filter(k => k.found).map((k, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                {k.keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <X className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-800">
                              Missing ({result.missingKeywords.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {result.missingKeywords.map((k, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ATS Warnings */}
                      {result.atsWarnings && result.atsWarnings.length > 0 && (
                        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-800">ATS Warnings</span>
                          </div>
                          <ul className="space-y-1.5">
                            {result.atsWarnings.map((w, i) => (
                              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                      {/* Skills to Add */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-gray-900">Skills to Add</span>
                        </div>
                        <div className="space-y-2">
                          {result.skillsToAdd.map((s, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                              <span className="text-sm text-amber-700">{s}</span>
                              <button
                                onClick={() => copyToClipboard(s)}
                                className="p-1 text-amber-400 hover:text-amber-600"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                        <p className="text-sm font-medium text-blue-800 mb-3">Quick Actions</p>
                        <div className="space-y-2">
                          <button
                            onClick={generateCoverLetter}
                            className="w-full flex items-center justify-between p-3 bg-white rounded-lg text-left hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Generate Cover Letter</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={generateInterviewQuestions}
                            className="w-full flex items-center justify-between p-3 bg-white rounded-lg text-left hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-purple-600" />
                              <span className="text-sm text-gray-700">Interview Questions</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                          <button
                            onClick={exportAnalysis}
                            className="w-full flex items-center justify-between p-3 bg-white rounded-lg text-left hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <FileDown className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-gray-700">Export Report</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "improve" && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Bullet Point Improvements</h3>
                      {result.bulletImprovements && result.bulletImprovements.length > 0 ? (
                        <div className="space-y-4">
                          {result.bulletImprovements.map((b, i) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-xl">
                              <div className="flex items-start gap-3 mb-2">
                                <div className="flex-1">
                                  <p className="text-xs text-gray-400 mb-1">Original:</p>
                                  <p className="text-sm text-gray-500 line-through">{b.original}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 my-2">
                                <ArrowRight className="w-4 h-4 text-blue-500" />
                                <span className="text-xs text-blue-600 font-medium">Improved</span>
                              </div>
                              <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg">{b.improved}</p>
                              <p className="text-xs text-gray-500 mt-2 italic">Reason: {b.reason}</p>
                              <button
                                onClick={() => copyToClipboard(b.improved)}
                                className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                <Copy className="w-3 h-3" /> Copy improved version
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 mb-2">No bullet point improvements available</p>
                          <p className="text-xs text-gray-400">Your resume bullets are already well-written or try using "Rewrite" focus mode for more suggestions.</p>
                        </div>
                      )}
                    </div>

                    {/* Skills Improvement Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Skills to Highlight</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {result.skillsToAdd.map((skill, i) => (
                          <div key={i} className="p-3 bg-green-50 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">{skill}</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(skill)}
                              className="p-1 text-green-400 hover:text-green-600"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing Keywords Section */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">Keywords to Add</h3>
                      <p className="text-xs text-gray-500 mb-3">Include these keywords in your resume to improve ATS matching:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords.map((keyword, i) => (
                          <button
                            key={i}
                            onClick={() => copyToClipboard(keyword)}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                          >
                            {keyword}
                            <Copy className="w-3 h-3 opacity-50" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "cover" && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium text-gray-900">Cover Letter</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(coverLetter)}
                          disabled={!coverLetter}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                        <button
                          onClick={generateCoverLetter}
                          disabled={generatingCover}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {generatingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Regenerate
                        </button>
                      </div>
                    </div>
                    {generatingCover ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                        <p className="text-gray-500">Generating cover letter...</p>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans p-4 bg-gray-50 rounded-lg min-h-[300px]">
                        {coverLetter || "Click 'Regenerate' to create a cover letter."}
                      </pre>
                    )}
                  </div>
                )}

                {activeTab === "interview" && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-purple-600" />
                        <h3 className="font-medium text-gray-900">Interview Preparation</h3>
                      </div>
                      <button
                        onClick={generateInterviewQuestions}
                        disabled={generatingQuestions}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {generatingQuestions ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Regenerate
                      </button>
                    </div>
                    {generatingQuestions ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
                        <p className="text-gray-500">Generating interview questions...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {interviewQuestions.map((q, i) => (
                          <div key={i} className="p-4 bg-purple-50 rounded-xl">
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm text-gray-900">{q}</p>
                                <button
                                  onClick={() => copyToClipboard(q)}
                                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
