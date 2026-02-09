"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, ArrowRight, ArrowLeft, School, BookOpen, Target, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OnboardingDialogProps {
  isOpen: boolean;
  onComplete: () => void;
  userEmail: string;
  userName?: string;
  userImage?: string;
}

const educationLevels = [
  "Middle School", "High School", "IGCSE", "A-Level", "Undergraduate", "Graduate", "Master's", "PhD",
];

const learningStyles = [
  { value: "visual", label: "Visual", desc: "Diagrams & images" },
  { value: "reading", label: "Reading", desc: "Text & notes" },
  { value: "practical", label: "Practical", desc: "Hands-on" },
  { value: "conceptual", label: "Conceptual", desc: "Theory first" },
];

const subjectList = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "Programming", "English", "History", "Economics", "Business",
  "Psychology", "Art & Design",
];

const TOTAL_STEPS = 4;

export function OnboardingDialog({ isOpen, onComplete, userName }: OnboardingDialogProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: userName || "",
    educationLevel: "",
    school: "",
    major: "",
    learningStyle: "",
    subjects: [] as string[],
    studyGoal: "",
  });

  useEffect(() => {
    if (userName) setFormData(prev => ({ ...prev, name: userName }));
  }, [userName]);

  const set = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSubject = (s: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(s) ? prev.subjects.filter(x => x !== s) : [...prev.subjects, s],
    }));
  };

  const canProceed = () => {
    if (step === 1) return formData.name.trim().length > 0;
    if (step === 2) return formData.educationLevel && formData.school.trim().length > 0;
    if (step === 3) return formData.learningStyle && formData.subjects.length > 0;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleComplete();
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          educationLevel: formData.educationLevel.toLowerCase().replace(/[\s']/g, "-"),
          school: formData.school,
          schoolName: formData.school,
          major: formData.major,
          learningStyle: formData.learningStyle,
          subjects: formData.subjects,
          studyGoal: formData.studyGoal,
        }),
      });
      if (res.ok) {
        toast({ title: "Welcome to Kabyar!" });
        onComplete();
      } else throw new Error("Failed");
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 border-0 shadow-2xl overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        {/* Hidden title for accessibility */}
        <DialogTitle className="sr-only">Welcome to Kabyar - Setup</DialogTitle>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        <div className="p-6 sm:p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-blue-600" : s < step ? "bg-blue-600" : "bg-gray-200"
                }`} />
              ))}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">{step}/{TOTAL_STEPS}</span>
          </div>

          {/* === STEP 1: Name === */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Welcome to Kabyar</h2>
              <p className="text-xs text-gray-400 mb-6">Let&apos;s personalize your AI experience. What&apos;s your name?</p>
              <Input
                value={formData.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your full name"
                className="h-10 text-sm border-gray-200 mb-1"
                autoFocus
              />
            </div>
          )}

          {/* === STEP 2: Education === */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                <School className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Education</h2>
              <p className="text-xs text-gray-400 mb-5">Tell us about your education so AI can tailor responses.</p>

              {/* Education level pills */}
              <div className="mb-4">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Level</label>
                <div className="flex flex-wrap gap-1.5">
                  {educationLevels.map((level) => (
                    <button key={level} onClick={() => set("educationLevel", level)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        formData.educationLevel === level ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >{level}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">School</label>
                  <Input value={formData.school} onChange={(e) => set("school", e.target.value)}
                    placeholder="University of Yangon" className="h-9 text-xs border-gray-200" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 block">Major</label>
                  <Input value={formData.major} onChange={(e) => set("major", e.target.value)}
                    placeholder="Computer Science" className="h-9 text-xs border-gray-200" />
                </div>
              </div>
            </div>
          )}

          {/* === STEP 3: Learning Preferences === */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">How do you learn?</h2>
              <p className="text-xs text-gray-400 mb-5">Pick your style and subjects of interest.</p>

              {/* Learning style */}
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Style</label>
              <div className="grid grid-cols-4 gap-1.5 mb-5">
                {learningStyles.map((s) => (
                  <button key={s.value} onClick={() => set("learningStyle", s.value)}
                    className={`py-2.5 rounded-lg border text-center transition-all ${
                      formData.learningStyle === s.value ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-200"
                    }`}
                  >
                    <span className={`text-[11px] font-semibold block ${formData.learningStyle === s.value ? "text-blue-700" : "text-gray-700"}`}>{s.label}</span>
                    <span className="text-[9px] text-gray-400">{s.desc}</span>
                  </button>
                ))}
              </div>

              {/* Subjects */}
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                Subjects <span className="text-blue-500 normal-case">({formData.subjects.length})</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {subjectList.map((s) => (
                  <button key={s} onClick={() => toggleSubject(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      formData.subjects.includes(s) ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* === STEP 4: Goal === */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">What&apos;s your goal?</h2>
              <p className="text-xs text-gray-400 mb-5">AI will tailor responses to help you achieve this.</p>

              <textarea
                value={formData.studyGoal}
                onChange={(e) => set("studyGoal", e.target.value)}
                placeholder="e.g., I want to pass my IGCSE exams with straight A's, become a full-stack developer, improve my academic writing..."
                rows={4}
                className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
              />

              {/* Summary */}
              <div className="mt-5 p-3.5 rounded-xl bg-gray-50 space-y-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Your profile</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <SummaryRow label="Name" value={formData.name} />
                  <SummaryRow label="Level" value={formData.educationLevel} />
                  <SummaryRow label="School" value={formData.school} />
                  <SummaryRow label="Major" value={formData.major || "—"} />
                  <SummaryRow label="Style" value={formData.learningStyle} />
                  <SummaryRow label="Subjects" value={`${formData.subjects.length} selected`} />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2.5 mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="h-9 px-4 rounded-lg border-gray-200 text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium border-0"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : step === TOTAL_STEPS ? (
                <><Check className="w-3.5 h-3.5 mr-1" />Get Started</>
              ) : (
                <>Continue<ArrowRight className="w-3.5 h-3.5 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className="text-[11px] font-medium text-gray-700 capitalize">{value}</span>
    </div>
  );
}
