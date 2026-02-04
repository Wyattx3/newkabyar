"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { cn } from "@/lib/utils";
import { 
  FlaskConical, Loader2, Copy, Check, Download, FileText, Beaker, Target,
  BarChart3, MessageSquare, CheckCircle, Sparkles, ChevronDown, Printer,
  FileType, Share2, BookOpen, Calculator, Lightbulb, History, Send, X,
  RotateCcw, Save, Folder, Plus, Trash2, Quote, TrendingUp, Upload
} from "lucide-react";

interface LabReport {
  title: string;
  abstract: string;
  introduction: string;
  hypothesis: string;
  methods: string;
  results: string;
  analysis: string;
  discussion: string;
  conclusion: string;
  references: string;
}

interface Template {
  id: string;
  name: string;
  data: {
    title: string;
    objective: string;
    materials: string;
    subject: string;
  };
}

const SUBJECTS = [
  { id: "chemistry", label: "Chemistry", icon: "🧪" },
  { id: "biology", label: "Biology", icon: "🧬" },
  { id: "physics", label: "Physics", icon: "⚛️" },
  { id: "environmental", label: "Environmental", icon: "🌿" },
  { id: "biochemistry", label: "Biochemistry", icon: "🔬" },
  { id: "microbiology", label: "Microbiology", icon: "🦠" },
];

const SECTIONS: { key: keyof LabReport; label: string; icon: any }[] = [
  { key: "abstract", label: "Abstract", icon: FileText },
  { key: "introduction", label: "Introduction", icon: Target },
  { key: "hypothesis", label: "Hypothesis", icon: Lightbulb },
  { key: "methods", label: "Methods", icon: Beaker },
  { key: "results", label: "Results", icon: BarChart3 },
  { key: "analysis", label: "Analysis", icon: TrendingUp },
  { key: "discussion", label: "Discussion", icon: MessageSquare },
  { key: "conclusion", label: "Conclusion", icon: CheckCircle },
  { key: "references", label: "References", icon: Quote },
];

export default function LabReportPage() {
  const [mounted, setMounted] = useState(false);
  
  // Form states
  const [title, setTitle] = usePersistedState("labreport-title", "");
  const [objective, setObjective] = usePersistedState("labreport-obj", "");
  const [rawData, setRawData] = usePersistedState("labreport-data", "");
  const [materials, setMaterials] = usePersistedState("labreport-materials", "");
  const [procedure, setProcedure] = usePersistedState("labreport-procedure", "");
  const [observations, setObservations] = usePersistedState("labreport-obs", "");
  const [subject, setSubject] = usePersistedState("labreport-subject", "chemistry");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("labreport-model", "fast");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<LabReport | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<keyof LabReport>("abstract");
  const [showSubjects, setShowSubjects] = useState(false);
  
  // Feature states
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = usePersistedState<Template[]>("labreport-templates", []);
  const [errorAnalysis, setErrorAnalysis] = useState<string | null>(null);
  const [showErrorCalc, setShowErrorCalc] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [reportHistory, setReportHistory] = usePersistedState<LabReport[]>("labreport-history", []);
  const [showHistory, setShowHistory] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const { toast } = useToast();
  const aiLanguage = useAILanguage();

  useEffect(() => setMounted(true), []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const hasResult = !!report;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    if (fileType === 'txt' || fileType === 'md') {
      // Text files - read directly
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setRawData(prev => prev ? prev + "\n\n" + content : content);
        toast({ title: "File content added to raw data" });
      };
      reader.readAsText(file);
    } else if (fileType === 'pdf') {
      // PDF files - use parse API
      setIsParsingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/utils/parse-pdf", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Failed to parse PDF");
        
        const data = await response.json();
        if (data.text) {
          setRawData(prev => prev ? prev + "\n\n" + data.text : data.text);
          toast({ title: "PDF content extracted successfully" });
        }
      } catch {
        toast({ title: "Failed to parse PDF", variant: "destructive" });
      } finally {
        setIsParsingFile(false);
      }
    } else if (fileType === 'doc' || fileType === 'docx') {
      // DOC/DOCX files - use parse API with mammoth
      setIsParsingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("/api/utils/parse-doc", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) throw new Error("Failed to parse document");
        
        const data = await response.json();
        if (data.text) {
          setRawData(prev => prev ? prev + "\n\n" + data.text : data.text);
          toast({ title: "Document content extracted successfully" });
        }
      } catch {
        toast({ title: "Failed to parse document", variant: "destructive" });
      } finally {
        setIsParsingFile(false);
      }
    } else {
      toast({ title: "Unsupported file type. Use PDF, DOC, DOCX, or TXT", variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (title.length < 5 || objective.length < 10 || rawData.length < 20) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/tools/lab-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentTitle: title,
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
      // Add to history
      setReportHistory(prev => [data, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error(error);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyFullReport = () => {
    if (!report) return;
    let text = `# ${report.title}\n\n`;
    SECTIONS.forEach(s => {
      text += `## ${s.label}\n${report[s.key]}\n\n`;
    });
    copyToClipboard(text, "full");
    toast({ title: "Report copied to clipboard" });
  };

  const exportAsMarkdown = () => {
    if (!report) return;
    let text = `# ${report.title}\n\n`;
    SECTIONS.forEach(s => {
      text += `## ${s.label}\n${report[s.key]}\n\n`;
    });
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_Report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsHTML = () => {
    if (!report) return;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${report.title}</title>
    <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.6}
    h1{color:#0d9488}h2{color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px}
    .meta{color:#6b7280;font-size:14px;margin-bottom:24px}</style></head><body>
    <h1>${report.title}</h1><p class="meta">${SUBJECTS.find(s => s.id === subject)?.label} Lab Report</p>`;
    SECTIONS.forEach(s => {
      html += `<h2>${s.label}</h2><p>${report[s.key].replace(/\n/g, '<br>')}</p>`;
    });
    html += `</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_Report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!report) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${report.title}</title>
    <style>body{font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:40px;line-height:1.8;color:#1a1a1a}
    h1{font-size:24px;margin-bottom:8px}h2{font-size:16px;margin-top:24px;text-transform:uppercase;letter-spacing:1px;color:#666}
    .meta{color:#666;font-size:12px;margin-bottom:32px;border-bottom:1px solid #ddd;padding-bottom:16px}
    p{text-align:justify;margin-bottom:16px}</style></head><body>
    <h1>${report.title}</h1><p class="meta">${SUBJECTS.find(s => s.id === subject)?.label} Lab Report • Generated with Kay AI</p>`;
    SECTIONS.forEach(s => {
      html += `<h2>${s.label}</h2><p>${report[s.key].replace(/\n/g, '<br>')}</p>`;
    });
    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const shareReport = () => {
    if (!report) return;
    const text = `${report.title}\n\nAbstract: ${report.abstract.substring(0, 200)}...`;
    if (navigator.share) {
      navigator.share({ title: report.title, text });
    } else {
      copyToClipboard(text, "share");
      toast({ title: "Share text copied to clipboard" });
    }
  };

  const calculateError = async () => {
    if (!rawData) {
      toast({ title: "Add raw data first", variant: "destructive" });
      return;
    }
    setShowErrorCalc(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Analyze this experimental data and calculate:\n1. Mean/Average values\n2. Standard deviation\n3. Percentage error if applicable\n4. Any outliers\n\nData:\n${rawData}\n\nProvide a brief analysis with calculations.` }],
          feature: "answer",
          model: selectedModel,
          language: "en",
        }),
      });
      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      let content = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      setErrorAnalysis(content);
    } catch {
      toast({ title: "Error analysis failed", variant: "destructive" });
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !report) return;
    const userMessage = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: `You are a lab report assistant. The current report is about: ${report.title}. Help answer questions about this ${subject} experiment.` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage }
          ],
          feature: "answer",
          model: "fast",
          language: aiLanguage || "en",
        }),
      });

      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");
      let content = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
      }
      setChatMessages(prev => [...prev, { role: "assistant", content }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process your question." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveTemplate = () => {
    const newTemplate: Template = {
      id: Date.now().toString(),
      name: title || "Untitled Template",
      data: { title, objective, materials, subject }
    };
    setTemplates(prev => [...prev, newTemplate]);
    toast({ title: "Template saved" });
  };

  const loadTemplate = (template: Template) => {
    setTitle(template.data.title);
    setObjective(template.data.objective);
    setMaterials(template.data.materials);
    setSubject(template.data.subject);
    setShowTemplates(false);
    toast({ title: "Template loaded" });
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const loadFromHistory = (historyReport: LabReport) => {
    setReport(historyReport);
    setShowHistory(false);
  };

  const resetForm = () => {
    setTitle("");
    setObjective("");
    setRawData("");
    setMaterials("");
    setProcedure("");
    setObservations("");
    setReport(null);
    setErrorAnalysis(null);
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50/50 overflow-hidden">
      {/* INITIAL STATE - Fit View Form */}
      {!hasResult ? (
        <div className="h-full flex overflow-hidden">
          {/* Left - Form */}
          <div className="flex-1 flex flex-col border-r border-gray-100">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">Lab Report Generator</h1>
                  <p className="text-xs text-gray-500">Generate professional scientific reports</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowSubjects(!showSubjects)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm hover:border-gray-300"
                  >
                    <span>{SUBJECTS.find(s => s.id === subject)?.icon}</span>
                    <span className="text-gray-700">{SUBJECTS.find(s => s.id === subject)?.label}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                  {showSubjects && (
                    <div className="absolute top-full mt-1 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[160px]">
                      {SUBJECTS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setSubject(s.id); setShowSubjects(false); }}
                          className={cn(
                            "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50",
                            subject === s.id && "bg-blue-50 text-blue-600"
                          )}
                        >
                          <span>{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> 5 credits
                </span>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Title */}
              <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Experiment Title (e.g., Effect of Temperature on Enzyme Activity)"
                  className="text-lg border-0 border-none shadow-none ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-gray-400 bg-transparent"
                />
              </div>

              {/* Objective */}
              <div className="px-6 py-3 border-b border-gray-100 shrink-0">
                <Textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="What is the objective of this experiment?"
                  className="border-0 border-none shadow-none ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 min-h-[60px] max-h-[80px] resize-none placeholder:text-gray-400 bg-transparent"
                />
              </div>

              {/* Raw Data - Flexible */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-2 flex items-center justify-between shrink-0">
                  <span className="text-xs text-gray-500">Raw Data & Measurements</span>
                  <div className="flex items-center gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsingFile}
                      className="h-7 px-2 rounded-lg text-xs text-gray-500 hover:text-gray-700"
                    >
                      {isParsingFile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <><Upload className="w-3.5 h-3.5 mr-1" /> Upload PDF/DOC</>
                      )}
                    </Button>
                    {rawData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRawData("")}
                        className="h-7 px-2 rounded-lg text-xs text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 px-6 pb-3 overflow-hidden">
                  <Textarea
                    value={rawData}
                    onChange={(e) => setRawData(e.target.value)}
                    placeholder="Paste your raw data, measurements, or results here...

Example:
Time (min) | Temperature (°C) | Reaction Rate
0          | 20               | 0.5
5          | 25               | 0.8

Or upload a PDF/DOC file with your data."
                    className="h-full border-0 border-none shadow-none ring-0 outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 resize-none font-mono text-sm placeholder:text-gray-400 bg-transparent"
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg bg-white border border-gray-200">
                    <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                  </div>
                  <div className="relative">
                    <Button variant="ghost" size="sm" onClick={() => setShowTemplates(!showTemplates)} className="h-8 px-2 rounded-lg">
                      <Folder className="w-4 h-4" />
                    </Button>
                    {showTemplates && (
                      <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-20 min-w-[200px]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">Templates</span>
                          <button onClick={saveTemplate} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Save
                          </button>
                        </div>
                        {templates.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2">No templates</p>
                        ) : (
                          <div className="space-y-1 max-h-[150px] overflow-y-auto">
                            {templates.map(t => (
                              <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group">
                                <button onClick={() => loadTemplate(t)} className="flex-1 text-left text-sm text-gray-700 truncate">{t.name}</button>
                                <button onClick={() => deleteTemplate(t.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={calculateError} className="h-8 px-2 rounded-lg" disabled={!rawData}>
                    <Calculator className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={handleGenerate} disabled={isLoading || !title || !objective || !rawData} className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Generate <Sparkles className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </div>
          </div>

          {/* Right - Additional Info */}
          <div className="w-80 bg-white flex flex-col overflow-hidden">
            <div className="h-14 border-b border-gray-100 flex items-center px-4 shrink-0">
              <span className="text-sm font-medium text-gray-900">Additional Details</span>
              <span className="text-xs text-gray-400 ml-2">(optional)</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Materials Used</label>
                <Input
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="List materials and equipment"
                  className="rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Procedure</label>
                <Textarea
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  placeholder="Step-by-step procedure followed"
                  className="rounded-xl resize-none min-h-[100px] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Observations</label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Qualitative observations during the experiment"
                  className="rounded-xl resize-none min-h-[80px] text-sm"
                />
              </div>
            </div>

            {/* Error Analysis */}
            {showErrorCalc && errorAnalysis && (
              <div className="border-t border-gray-100 p-4 max-h-[200px] overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    <Calculator className="w-4 h-4 text-blue-600" /> Error Analysis
                  </span>
                  <button onClick={() => setShowErrorCalc(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{errorAnalysis}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* RESULTS STATE - Full Report View */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Sections */}
          <div className="w-56 bg-white border-r border-gray-100 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 truncate">{report.title}</h2>
              <p className="text-xs text-gray-500 mt-1">{SUBJECTS.find(s => s.id === subject)?.label} Report</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all",
                    activeSection === s.key
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-gray-100 space-y-2">
              <Button onClick={() => setShowChat(!showChat)} variant="outline" size="sm" className="w-full rounded-xl justify-start">
                <MessageSquare className="w-4 h-4 mr-2" /> Ask AI
              </Button>
              <Button onClick={() => setShowHistory(!showHistory)} variant="outline" size="sm" className="w-full rounded-xl justify-start">
                <History className="w-4 h-4 mr-2" /> History
              </Button>
              <Button onClick={resetForm} variant="ghost" size="sm" className="w-full rounded-xl justify-start text-gray-500">
                <RotateCcw className="w-4 h-4 mr-2" /> New Report
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{SECTIONS.find(s => s.key === activeSection)?.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(report[activeSection], activeSection)}
                  className="h-8 px-3 rounded-lg"
                >
                  {copied === activeSection ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span className="ml-1 text-xs">Copy</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={copyFullReport} className="h-8 px-3 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                  <span className="ml-1 text-xs">Copy All</span>
                </Button>
                <div className="w-px h-5 bg-gray-200" />
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="h-8 px-3 rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span className="ml-1 text-xs">Export</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                  {showExportMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 min-w-[160px]">
                      <button onClick={() => { exportAsMarkdown(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50">
                        <FileText className="w-4 h-4" /> Markdown (.md)
                      </button>
                      <button onClick={() => { exportAsHTML(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50">
                        <FileType className="w-4 h-4" /> HTML (.html)
                      </button>
                      <button onClick={() => { printReport(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50">
                        <Printer className="w-4 h-4" /> Print
                      </button>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={shareReport} className="h-8 px-3 rounded-lg">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
              <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
                  {SECTIONS.find(s => s.key === activeSection)?.label}
                </h3>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report[activeSection]}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Chat Panel */}
          {showChat && (
            <div className="w-80 bg-white border-l border-gray-100 flex flex-col">
              <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4">
                <span className="font-medium text-gray-900 text-sm">Ask about your report</span>
                <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Ask questions about your experiment or report
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn("max-w-[90%] p-3 rounded-2xl text-sm", msg.role === "user" ? "ml-auto bg-blue-600 text-white" : "bg-gray-100 text-gray-700")}>
                    {msg.content}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="bg-gray-100 p-3 rounded-2xl w-fit">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    onKeyDown={(e) => e.key === "Enter" && handleChatSubmit()}
                    className="rounded-xl"
                  />
                  <Button onClick={handleChatSubmit} size="sm" className="rounded-xl px-3 bg-blue-600 hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* History Panel */}
          {showHistory && (
            <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
              <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4">
                <span className="font-medium text-gray-900 text-sm">Report History</span>
                <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {reportHistory.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">No previous reports</p>
                ) : (
                  reportHistory.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => loadFromHistory(h)}
                      className="w-full text-left p-3 rounded-xl hover:bg-gray-50 border border-gray-100"
                    >
                      <p className="font-medium text-gray-900 text-sm truncate">{h.title}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.abstract.substring(0, 80)}...</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
