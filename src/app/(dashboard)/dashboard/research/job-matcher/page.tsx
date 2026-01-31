"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  Briefcase, 
  Loader2, 
  Sparkles,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  Award,
  Lightbulb,
  FileUser,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface Skill {
  skill: string;
  level: string;
  evidence?: string;
}

interface MatchResult {
  matchScore: number;
  verdict: string;
  matchedSkills: Skill[];
  missingSkills: Skill[];
  experience: { matches: boolean; details: string };
  education: { matches: boolean; details: string };
  suggestions: string[];
  interviewTips: string[];
}

export default function JobMatcherPage() {
  const [resume, setResume] = usePersistedState("jobmatch-resume", "");
  const [jobDescription, setJobDescription] = usePersistedState("jobmatch-jd", "");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("jobmatch-model", "fast");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [activeTab, setActiveTab] = useState<"skills" | "tips">("skills");
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleMatch = async () => {
    if (resume.trim().length < 100 || jobDescription.trim().length < 100) {
      toast({ title: "Both fields need at least 100 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/tools/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume,
          jobDescription,
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-indigo-600";
    if (score >= 40) return "from-amber-500 to-orange-500";
    return "from-red-500 to-rose-600";
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Briefcase className="w-7 h-7 text-emerald-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Job Description Matcher</h1>
            <p className="text-xs text-gray-500">Match your resume to job requirements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/research" className="text-xs text-indigo-600 hover:underline">Research</Link>
          <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />3 credits
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!result ? (
          /* Input View */
          <div className="h-full grid lg:grid-cols-2 gap-4">
            {/* Resume */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                <FileUser className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-indigo-900 text-sm">Your Resume/CV</span>
              </div>
              <Textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your resume text here...

Include your skills, experience, education, and achievements."
                className="flex-1 resize-none border-0 focus:ring-0 p-4 text-gray-800"
              />
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-900 text-sm">Job Description</span>
              </div>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here...

Include requirements, responsibilities, and qualifications."
                className="flex-1 resize-none border-0 focus:ring-0 p-4 text-gray-800"
              />
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="h-full grid lg:grid-cols-[300px_1fr] gap-4">
            {/* Score & Summary */}
            <div className="space-y-4 overflow-y-auto">
              {/* Score Card */}
              <div className={`bg-gradient-to-br ${getScoreColor(result.matchScore)} rounded-2xl p-6 text-white text-center`}>
                <p className="text-6xl font-black">{result.matchScore}%</p>
                <p className="text-lg opacity-90 mt-2">Match Score</p>
                <p className="text-sm opacity-75 mt-1">{result.verdict}</p>
              </div>

              {/* Experience & Education */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    result.experience.matches ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {result.experience.matches ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Experience</p>
                    <p className="text-xs text-gray-500">{result.experience.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    result.education.matches ? "bg-green-100" : "bg-red-100"
                  }`}>
                    {result.education.matches ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Education</p>
                    <p className="text-xs text-gray-500">{result.education.details}</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setResult(null)} variant="outline" className="w-full rounded-xl">
                New Match
              </Button>
            </div>

            {/* Skills & Tips */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              {/* Tabs */}
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("skills")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "skills"
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <Target className="w-4 h-4 inline mr-2" />Skills Analysis
                </button>
                <button
                  onClick={() => setActiveTab("tips")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "tips"
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <Lightbulb className="w-4 h-4 inline mr-2" />Tips
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "skills" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Matched Skills */}
                    <div>
                      <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Matched Skills ({result.matchedSkills.length})
                      </h3>
                      <div className="space-y-2">
                        {result.matchedSkills.map((s, i) => (
                          <div key={i} className="p-3 bg-green-50 rounded-xl">
                            <p className="text-sm font-medium text-green-900">{s.skill}</p>
                            {s.evidence && <p className="text-xs text-green-600 mt-1">{s.evidence}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        Missing Skills ({result.missingSkills.length})
                      </h3>
                      <div className="space-y-2">
                        {result.missingSkills.map((s, i) => (
                          <div key={i} className="p-3 bg-red-50 rounded-xl">
                            <p className="text-sm font-medium text-red-900">{s.skill}</p>
                            <p className="text-xs text-red-600 mt-1">{s.level}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "tips" && (
                  <div className="space-y-4">
                    {/* Suggestions */}
                    <div className="p-4 bg-amber-50 rounded-xl">
                      <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Resume Improvement Tips
                      </h3>
                      <ul className="space-y-2">
                        {result.suggestions.map((s, i) => (
                          <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Interview Tips */}
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Interview Preparation
                      </h3>
                      <ul className="space-y-2">
                        {result.interviewTips.map((t, i) => (
                          <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar (Input Mode) */}
      {!result && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
          <div className="flex-1" />
          <span className="text-xs text-gray-400">
            Resume: {resume.length} chars • JD: {jobDescription.length} chars
          </span>
          <Button
            onClick={handleMatch}
            disabled={isLoading || resume.trim().length < 100 || jobDescription.trim().length < 100}
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Target className="w-5 h-5 mr-2" />Match</>}
          </Button>
        </div>
      )}
    </div>
  );
}
