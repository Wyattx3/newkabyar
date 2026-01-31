"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  Loader2,
  AlertCircle,
} from "lucide-react";

export interface UploadedFile {
  id: string;
  name: string;
  type: "image" | "pdf" | "text" | "audio" | "other";
  size: number;
  dataUrl?: string;
  content?: string;
  file?: File;
}

interface FileUploaderProps {
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
  className?: string;
}

const FILE_TYPE_MAP: Record<string, UploadedFile["type"]> = {
  "image/": "image",
  "application/pdf": "pdf",
  "text/": "text",
  "audio/": "audio",
};

function getFileType(file: File): UploadedFile["type"] {
  for (const [prefix, type] of Object.entries(FILE_TYPE_MAP)) {
    if (file.type.startsWith(prefix)) {
      return type;
    }
  }
  if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
    return "text";
  }
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const FILE_ICONS: Record<UploadedFile["type"], typeof FileText> = {
  image: Image,
  pdf: FileText,
  text: FileText,
  audio: File,
  other: File,
};

export function FileUploader({
  accept = "image/*,application/pdf,text/*,.txt,.md",
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  files,
  onFilesChange,
  disabled = false,
  className = "",
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      // Size check
      if (file.size > maxSize) {
        setError(`File "${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
        return null;
      }

      const fileType = getFileType(file);
      const baseFile: Omit<UploadedFile, "dataUrl" | "content"> = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: fileType,
        size: file.size,
        file,
      };

      return new Promise((resolve) => {
        const reader = new FileReader();

        if (fileType === "text") {
          reader.onload = (e) => {
            resolve({
              ...baseFile,
              content: e.target?.result as string,
            });
          };
          reader.readAsText(file);
        } else if (fileType === "image" || fileType === "pdf") {
          reader.onload = (e) => {
            resolve({
              ...baseFile,
              dataUrl: e.target?.result as string,
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve(baseFile);
        }
      });
    },
    [maxSize]
  );

  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      setError("");
      setIsProcessing(true);

      const remainingSlots = maxFiles - files.length;
      const filesToProcess = Array.from(newFiles).slice(0, remainingSlots);

      if (Array.from(newFiles).length > remainingSlots) {
        setError(`Can only upload ${remainingSlots} more file(s)`);
      }

      const processedFiles: UploadedFile[] = [];
      for (const file of filesToProcess) {
        const processed = await processFile(file);
        if (processed) {
          processedFiles.push(processed);
        }
      }

      onFilesChange([...files, ...processedFiles]);
      setIsProcessing(false);
    },
    [files, maxFiles, processFile, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled || files.length >= maxFiles) return;
      handleFiles(e.dataTransfer.files);
    },
    [disabled, files.length, maxFiles, handleFiles]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && files.length < maxFiles) {
        setIsDragging(true);
      }
    },
    [disabled, files.length, maxFiles]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (id: string) => {
      onFilesChange(files.filter((f) => f.id !== id));
      setError("");
    },
    [files, onFilesChange]
  );

  const canAddMore = files.length < maxFiles && !disabled;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => canAddMore && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : canAddMore
            ? "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
            : "border-gray-100 bg-gray-50 cursor-not-allowed"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleInputChange}
          disabled={!canAddMore}
          className="hidden"
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-500">Processing files...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload
              className={`w-8 h-8 ${
                canAddMore ? "text-gray-400" : "text-gray-300"
              }`}
            />
            <div>
              <p
                className={`text-sm font-medium ${
                  canAddMore ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {canAddMore
                  ? "Drop files here or click to upload"
                  : `Maximum ${maxFiles} files reached`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {files.length}/{maxFiles} files • Max {formatFileSize(maxSize)} each
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const IconComponent = FILE_ICONS[file.type];
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
              >
                {/* Icon or Preview */}
                {file.type === "image" && file.dataUrl ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded flex items-center justify-center ${
                      file.type === "pdf"
                        ? "bg-red-100"
                        : file.type === "text"
                        ? "bg-blue-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 ${
                        file.type === "pdf"
                          ? "text-red-500"
                          : file.type === "text"
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`}
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Remove */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
