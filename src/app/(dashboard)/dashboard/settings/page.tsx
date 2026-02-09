"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings, User, Save, Check, Loader2, Shield, BookOpen, Target, Sparkles,
  Camera, Calendar, School, Briefcase, Heart, X, Crown, Coins, Zap, ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const educationLevels = [
  { value: "middle-school", label: "Middle School" },
  { value: "high-school", label: "High School" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD" },
  { value: "professional", label: "Professional" },
];

const learningStyles = [
  { value: "visual", label: "Visual", desc: "Diagrams & images" },
  { value: "reading", label: "Reading", desc: "Text & notes" },
  { value: "practical", label: "Practical", desc: "Hands-on" },
  { value: "conceptual", label: "Conceptual", desc: "Theory first" },
];

const subjects = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "Programming", "Web Development", "Data Science", "AI/ML",
  "English", "Literature", "History", "Geography", "Economics",
  "Business", "Accounting", "Art & Design", "Music", "Psychology"
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState(session?.user?.name || "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [major, setMajor] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [occupation, setOccupation] = useState("");
  const [educationLevel, setEducationLevel] = useState("undergraduate");
  const [learningStyle, setLearningStyle] = useState("practical");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(["Programming", "Mathematics"]);
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [studyGoal, setStudyGoal] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userPlan, setUserPlan] = useState("free");
  const [credits, setCredits] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          const user = data.user;
          if (user) {
            if (user.image) setProfileImage(user.image);
            if (user.name) setName(user.name);
            if (user.dateOfBirth) setDateOfBirth(user.dateOfBirth);
            if (user.school) setSchoolName(user.school);
            if (user.major) setMajor(user.major);
            if (user.yearOfStudy) setYearOfStudy(user.yearOfStudy);
            if (user.occupation) setOccupation(user.occupation);
            if (user.educationLevel) setEducationLevel(user.educationLevel);
            if (user.learningStyle) setLearningStyle(user.learningStyle);
            if (user.subjects?.length) setSelectedSubjects(user.subjects);
            if (user.preferredLanguage) setPreferredLanguage(user.preferredLanguage);
            if (user.studyGoal) setStudyGoal(user.studyGoal);
            if (user.hobbies) setHobbies(user.hobbies);
            if (user.plan) setUserPlan(user.plan);
          }
        }
      } catch (e) { console.error("Failed to load:", e); }
    };
    const loadCredits = async () => {
      try {
        const res = await fetch("/api/user/credits");
        if (res.ok) {
          const data = await res.json();
          setCredits(data.credits || 0);
          if (data.plan) setUserPlan(data.plan);
        }
      } catch {}
    };
    loadSettings();
    loadCredits();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => setProfileImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, profileImage, dateOfBirth, school: schoolName, schoolName,
          major, yearOfStudy, occupation, educationLevel, learningStyle,
          subjects: selectedSubjects, preferredLanguage, studyGoal, hobbies,
        }),
      });
      if (res.ok) {
        await update();
        window.dispatchEvent(new CustomEvent("profile-updated"));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast({ title: "Profile saved successfully" });
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }
    } catch (error: any) {
      toast({ title: error?.message || "Failed to save", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const planInfo: Record<string, { name: string; features: string[] }> = {
    free: { name: "Free", features: ["5 tools", "50 credits/mo", "Basic models"] },
    student: { name: "Student", features: ["All 25+ tools", "500 credits/mo", "GPT-4 & Claude"] },
    pro: { name: "Pro", features: ["All 25+ tools", "Unlimited", "All models"] },
  };
  const plan = planInfo[userPlan] || planInfo.free;

  if (!mounted) return null;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-5">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-blue-600" />
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Settings</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="sm"
            className="h-8 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium border-0"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <><Check className="h-3.5 w-3.5 mr-1" />Saved</> : <><Save className="h-3.5 w-3.5 mr-1" />Save</>}
          </Button>
        </div>

        {/* === ROW 1: Profile + Plan side by side === */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Profile card — 2 cols */}
          <div className="lg:col-span-2 rounded-xl border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-white shadow overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-50">
                      <User className="w-7 h-7 text-blue-300" />
                    </div>
                  )}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow hover:bg-blue-700 transition-colors">
                  <Camera className="w-3 h-3" />
                </button>
                {profileImage && (
                  <button onClick={() => setProfileImage(null)} className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow">
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{name || "Your Name"}</p>
                <p className="text-[11px] text-gray-400 truncate">{session?.user?.email}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600">
                  <Shield className="w-2.5 h-2.5" />Verified
                </div>
              </div>
            </div>
          </div>

          {/* Plan card — 3 cols */}
          <div className="lg:col-span-3 rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${userPlan === "free" ? "bg-gray-100" : "bg-blue-600"}`}>
                  <Crown className={`w-4 h-4 ${userPlan === "free" ? "text-gray-500" : "text-white"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{plan.name} Plan</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${userPlan === "free" ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-blue-600"}`}>
                      {userPlan === "free" ? "FREE" : "ACTIVE"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-amber-700">{credits}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              {plan.features.map((f) => (
                <span key={f} className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-[10px] text-gray-500">
                  <Check className="w-2.5 h-2.5 text-blue-500" />{f}
                </span>
              ))}
            </div>
            {userPlan === "free" ? (
              <Link href="/pricing" className="flex items-center justify-center gap-1.5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                <Zap className="w-3.5 h-3.5" />Upgrade Plan<ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/pricing" className="flex-1 text-center py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded-lg transition-colors">Change Plan</Link>
                <button className="flex-1 py-2 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">Cancel</button>
              </div>
            )}
          </div>
        </div>

        {/* === ROW 2: Personal Info + Education side by side === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Personal Info */}
          <div className="rounded-xl border border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Personal</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <F label="Full Name" value={name} onChange={setName} placeholder="Your name" />
              <F label="Date of Birth" value={dateOfBirth} onChange={setDateOfBirth} type="date" />
              <F label="Language" value={preferredLanguage} onChange={setPreferredLanguage} placeholder="English" />
              <F label="Hobbies" value={hobbies} onChange={setHobbies} placeholder="Reading, Gaming..." />
            </div>
          </div>

          {/* Education */}
          <div className="rounded-xl border border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <School className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Education</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <F label="School" value={schoolName} onChange={setSchoolName} placeholder="University of Yangon" />
              <F label="Major" value={major} onChange={setMajor} placeholder="Computer Science" />
              <F label="Year" value={yearOfStudy} onChange={setYearOfStudy} placeholder="3rd Year" />
              <F label="Occupation" value={occupation} onChange={setOccupation} placeholder="Student" />
            </div>
          </div>
        </div>

        {/* === ROW 3: Education Level + Learning Style side by side === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Education Level */}
          <div className="rounded-xl border border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Education Level</span>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {educationLevels.map((level) => (
                  <button key={level.value} onClick={() => setEducationLevel(level.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      educationLevel === level.value ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >{level.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Learning Style */}
          <div className="rounded-xl border border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Learning Style</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-1.5">
                {learningStyles.map((style) => (
                  <button key={style.value} onClick={() => setLearningStyle(style.value)}
                    className={`py-2.5 px-2 rounded-lg border text-center transition-all ${
                      learningStyle === style.value ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-200"
                    }`}
                  >
                    <span className={`text-[11px] font-semibold block ${learningStyle === style.value ? "text-blue-700" : "text-gray-700"}`}>{style.label}</span>
                    <span className="text-[9px] text-gray-400">{style.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* === ROW 4: Subjects + Goal side by side === */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Subjects — 3 cols */}
          <div className="lg:col-span-3 rounded-xl border border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Subjects</span>
              <span className="text-[10px] text-gray-400 ml-auto">{selectedSubjects.length} selected</span>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {subjects.map((subject) => (
                  <button key={subject} onClick={() => toggleSubject(subject)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      selectedSubjects.includes(subject) ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >{subject}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Study Goal — 2 cols */}
          <div className="lg:col-span-2 rounded-xl border border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-900">Study Goal</span>
            </div>
            <div className="p-4">
              <textarea value={studyGoal} onChange={(e) => setStudyGoal(e.target.value)}
                placeholder="What are your learning goals?"
                rows={4}
                className="w-full px-3 py-2.5 text-xs border border-gray-100 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none bg-gray-50/50"
              />
              <p className="text-[9px] text-gray-400 mt-1">AI tailors responses to your goals</p>
            </div>
          </div>
        </div>

        {/* Mobile save */}
        <div className="lg:hidden mb-6">
          <Button onClick={handleSave} disabled={isSaving}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium border-0"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4 mr-1.5" />Saved</> : <><Save className="h-4 w-4 mr-1.5" />Save Profile</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-1 block">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-8 text-xs border-gray-100 bg-gray-50/50"
      />
    </div>
  );
}
