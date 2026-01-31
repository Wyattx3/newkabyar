"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { 
  FlaskConical, 
  Loader2, 
  Sparkles,
  Copy,
  Check,
  Download,
  ChevronRight,
  ChevronLeft,
  FileText,
  Beaker,
  Target,
  BarChart3,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface LabReport {
  title: string;
  abstract: string;
  introduction: string;
  methods: string;
  results: string;
  discussion: string;
  conclusion: string;
}

const steps = [
  { id: 1, label: "Details", icon: FileText },
  { id: 2, label: "Data", icon: BarChart3 },
  { id: 3, label: "Generate", icon: FlaskConical },
];

export default function LabReportPage() {
  const [title, setTitle] = usePersistedState("labreport-title", "");
  const [objective, setObjective] = usePersistedState("labreport-obj", "");
  const [rawData, setRawData] = usePersistedState("labreport-data", "");
  const [materials, setMaterials] = usePersistedState("labreport-materials", "");
  const [procedure, setProcedure] = usePersistedState("labreport-procedure", "");
  const [observations, setObservations] = usePersistedState("labreport-obs", "");
  const [subject, setSubject] = usePersistedState("labreport-subject", "chemistry");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("labreport-model", "fast");
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<LabReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<keyof LabReport>("abstract");
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);

  const handleGenerate = async () => {
    if (title.length < 5 || objective.length < 10 || rawData.length < 20) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setReport(null);

    try {
      const response = await fetch("/api/tools/lab-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          objective,
          rawData,
          materials,
          procedure,
          observations,
          subject,
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
      setReport(data);
      setStep(3);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const exportReport = () => {
    if (!report) return;
    let text = `# ${report.title}\n\n`;
    text += `## Abstract\n${report.abstract}\n\n`;
    text += `## Introduction\n${report.introduction}\n\n`;
    text += `## Methods\n${report.methods}\n\n`;
    text += `## Results\n${report.results}\n\n`;
    text += `## Discussion\n${report.discussion}\n\n`;
    text += `## Conclusion\n${report.conclusion}\n`;
    
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_Report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySection = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections: { key: keyof LabReport; label: string; icon: any }[] = [
    { key: "abstract", label: "Abstract", icon: FileText },
    { key: "introduction", label: "Introduction", icon: Target },
    { key: "methods", label: "Methods", icon: Beaker },
    { key: "results", label: "Results", icon: BarChart3 },
    { key: "discussion", label: "Discussion", icon: MessageSquare },
    { key: "conclusion", label: "Conclusion", icon: CheckCircle },
  ];

  return (
    <div className={`h-full flex flex-col transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Lab Report Generator</h1>
            <p className="text-xs text-gray-500">Generate structured scientific reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/visual" className="text-xs text-teal-600 hover:underline">Visual</Link>
          <span className="px-2 py-1 bg-teal-50 text-teal-600 text-xs rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />5 credits
          </span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => !report && setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                step === s.id
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-500/30"
                  : step > s.id
                  ? "bg-teal-100 text-teal-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <s.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className={`w-5 h-5 mx-2 ${step > s.id ? "text-teal-400" : "text-gray-300"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {step === 1 && (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 shadow-xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Experiment Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Effect of Temperature on Enzyme Activity"
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Objective *</label>
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="What are you trying to investigate or prove?"
                  className="min-h-[80px] rounded-xl resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200"
                  >
                    <option value="chemistry">Chemistry</option>
                    <option value="biology">Biology</option>
                    <option value="physics">Physics</option>
                    <option value="environmental">Environmental</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Materials</label>
                  <Input
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="List materials used"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
              <Button onClick={() => setStep(2)} className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700">
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 shadow-xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Raw Data / Results *</label>
                <Textarea
                  value={rawData}
                  onChange={(e) => setRawData(e.target.value)}
                  placeholder="Enter your measurements, readings, or observations...

Example:
Time (min) | Temperature (°C) | Reaction Rate
0          | 20               | 0.5
5          | 25               | 0.8
10         | 30               | 1.2"
                  className="min-h-[150px] rounded-xl resize-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Observations</label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Any qualitative observations during the experiment..."
                  className="min-h-[80px] rounded-xl resize-none"
                />
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <ModelSelector value={selectedModel} onChange={setSelectedModel} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Report</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && report && (
          <div className="h-full flex gap-4">
            {/* Section Nav */}
            <div className="w-48 shrink-0 space-y-2">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl transition-all text-left ${
                    activeSection === s.key
                      ? "bg-teal-100 text-teal-700"
                      : "bg-white hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
              ))}
              <div className="pt-4 space-y-2">
                <Button onClick={exportReport} variant="outline" className="w-full rounded-xl">
                  <Download className="w-4 h-4 mr-2" /> Export
                </Button>
                <Button onClick={() => { setReport(null); setStep(1); }} variant="ghost" className="w-full rounded-xl text-gray-500">
                  New Report
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">{report.title}</h2>
                  <p className="text-xs text-gray-500 capitalize">{subject} Lab Report</p>
                </div>
                <button
                  onClick={() => copySection(report[activeSection])}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{activeSection}</h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{report[activeSection]}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
