"use client";

import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Upload, 
  Loader2, 
  X, 
  Plus,
  Type,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UploadedFile {
  name: string;
  charCount: number;
}

interface ContentInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  color?: "blue" | "purple" | "rose" | "amber" | "emerald";
}

const colorMap = {
  blue: {
    tab: "bg-blue-600",
    tabHover: "hover:bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-600",
    bg: "bg-blue-50",
    ring: "focus:ring-blue-500/20",
  },
  purple: {
    tab: "bg-purple-600",
    tabHover: "hover:bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-600",
    bg: "bg-purple-50",
    ring: "focus:ring-purple-500/20",
  },
  rose: {
    tab: "bg-rose-600",
    tabHover: "hover:bg-rose-50",
    border: "border-rose-500",
    text: "text-rose-600",
    bg: "bg-rose-50",
    ring: "focus:ring-rose-500/20",
  },
  amber: {
    tab: "bg-amber-600",
    tabHover: "hover:bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-600",
    bg: "bg-amber-50",
    ring: "focus:ring-amber-500/20",
  },
  emerald: {
    tab: "bg-emerald-600",
    tabHover: "hover:bg-emerald-50",
    border: "border-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "focus:ring-emerald-500/20",
  },
};

export function ContentInput({
  value,
  onChange,
  placeholder = "Paste your content here...",
  minHeight = "200px",
  color = "blue",
}: ContentInputProps) {
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const colors = colorMap[color];

  const handleFile = async (file: File) => {
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".txt")) {
      toast({ title: "Only PDF and TXT files are supported", variant: "destructive" });
      return;
    }

    // Check if file already uploaded
    if (uploadedFiles.some(f => f.name === file.name)) {
      toast({ title: "File already added", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/utils/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse file");
      }

      const data = await response.json();
      
      // Append to existing content with separator
      const separator = value.length > 0 ? "\n\n---\n\n" : "";
      onChange(value + separator + data.text);
      
      setUploadedFiles(prev => [...prev, { name: file.name, charCount: data.characterCount }]);
      toast({ 
        title: "File added", 
        description: `${data.characterCount.toLocaleString()} characters extracted` 
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to process file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => handleFile(file));
  };

  const handleMultipleFiles = (files: FileList) => {
    Array.from(files).forEach(file => handleFile(file));
  };

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
    // Note: We can't easily remove specific file content, so just clear all if removing
    if (uploadedFiles.length === 1) {
      onChange("");
    }
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode Tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setMode("text")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "text"
              ? `${colors.tab} text-white shadow-sm`
              : `text-gray-600 ${colors.tabHover}`
          )}
        >
          <Type className="w-4 h-4" />
          Text
        </button>
        <button
          onClick={() => setMode("pdf")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            mode === "pdf"
              ? `${colors.tab} text-white shadow-sm`
              : `text-gray-600 ${colors.tabHover}`
          )}
        >
          <FileText className="w-4 h-4" />
          PDF/TXT
        </button>
      </div>

      {/* Content Area */}
      {mode === "text" ? (
        <div className="relative">
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "resize-none border-0 bg-gray-50 rounded-2xl p-4 text-sm focus:ring-2",
              colors.ring
            )}
            style={{ minHeight }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            {value.length.toLocaleString()} chars
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all overflow-hidden",
            dragActive ? `${colors.border} ${colors.bg}` : "border-gray-200 bg-gray-50"
          )}
          style={{ minHeight }}
        >
          {isUploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className={cn("w-8 h-8 animate-spin mb-2", colors.text)} />
              <p className="text-sm text-gray-600">Processing...</p>
            </div>
          ) : uploadedFiles.length > 0 ? (
            <div className="h-full flex flex-col p-4">
              {/* Files List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {uploadedFiles.map((file, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className={cn("w-5 h-5 shrink-0", colors.text)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{file.charCount.toLocaleString()} chars</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Add More & Clear */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors",
                    colors.text, colors.bg, "hover:opacity-80"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Add More
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {value.length.toLocaleString()} total chars
                  </span>
                  <button
                    onClick={clearAllFiles}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100/50 transition-colors"
            >
              <Upload className={cn("w-8 h-8 mb-2", colors.text)} />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drop files or click to browse
              </p>
              <p className="text-xs text-gray-500 mb-2">Upload multiple PDFs</p>
              <div className="flex items-center gap-2">
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", colors.bg, colors.text)}>
                  PDF
                </span>
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", colors.bg, colors.text)}>
                  TXT
                </span>
              </div>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            multiple
            onChange={(e) => e.target.files && handleMultipleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}
