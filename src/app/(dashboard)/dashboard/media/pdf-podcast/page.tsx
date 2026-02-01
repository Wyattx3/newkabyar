"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector, type ModelType, useAILanguage } from "@/components/ai";
import {
  Mic,
  Loader2,
  Upload,
  FileText,
  Play,
  Pause,
  ChevronRight,
  Download,
  X,
  RotateCcw,
  Send,
  SkipForward,
  Radio,
  Sparkles,
  ArrowLeft,
  Phone,
  PhoneOff,
  Plus,
  FileUp,
  ScrollText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePersistedState } from "@/hooks/use-persisted-state";
import Link from "next/link";

interface DialogueLine {
  speaker: "host" | "guest" | "user";
  text: string;
  audioUrl?: string;
  isPlaying?: boolean;
}

interface Segment {
  title: string;
  dialogue: DialogueLine[];
}

interface PodcastScript {
  title: string;
  summary: string;
  speakers: {
    host: { name: string; role?: string };
    guest: { name: string; role?: string };
  };
  segments: Segment[];
  keyTopics: string[];
  duration: string;
}

interface UploadedFile {
  name: string;
  content: string;
}

const VOICES = {
  host: "austin",
  guest: "hannah",
  user: "daniel",
};

export default function PDFPodcastPage() {
  const [content, setContent] = usePersistedState("podcast-content", "");
  const [duration, setDuration] = usePersistedState("podcast-duration", "medium");
  const [style, setStyle] = usePersistedState("podcast-style", "educational");
  const [selectedModel, setSelectedModel] = usePersistedState<ModelType>("podcast-model", "fast");

  const [isLoading, setIsLoading] = useState(false);
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [mounted, setMounted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Live podcast state
  const [isLive, setIsLive] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [allDialogues, setAllDialogues] = useState<DialogueLine[]>([]);
  const dialoguesRef = useRef<DialogueLine[]>([]); // Ref to track latest dialogues
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingLine, setIsGeneratingLine] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<"host" | "guest" | "user" | null>(null);

  // User interaction
  const [userMessage, setUserMessage] = useState("");
  const [isMicActive, setIsMicActive] = useState(false);
  const [showUserInput, setShowUserInput] = useState(false);

  // Audio
  const audioRef = useRef<HTMLAudioElement>(null);
  const subtitlesRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const aiLanguage = useAILanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Keep dialoguesRef in sync with allDialogues
  useEffect(() => {
    dialoguesRef.current = allDialogues;
  }, [allDialogues]);

  // Auto-scroll subtitles
  useEffect(() => {
    if (subtitlesRef.current) {
      subtitlesRef.current.scrollTop = subtitlesRef.current.scrollHeight;
    }
  }, [allDialogues, currentLineIndex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let fileContent = "";

      if (file.type === "application/pdf") {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/parse-pdf", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            fileContent = data.text || "";
          } else {
            fileContent = await file.text();
          }
        } catch {
          fileContent = await file.text();
        }
      } else {
        fileContent = await file.text();
      }

      if (fileContent) {
        setUploadedFiles((prev) => [...prev, { name: file.name, content: fileContent }]);
        setContent((prev) => prev + (prev ? "\n\n---\n\n" : "") + fileContent);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setContent((prev) => prev.replace(fileToRemove.content, "").replace(/\n\n---\n\n/g, "\n\n").trim());
  };

  const generateAudioForText = async (text: string, voice: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/tools/youtube/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 500),
          voice,
          style: "summary",
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error("Audio generation failed:", e);
    }
    return null;
  };

  const handleGenerate = async () => {
    if (content.length < 200) {
      toast({ title: "Content must be at least 200 characters", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setScript(null);
    setAllDialogues([]);
    setCurrentLineIndex(0);
    setIsLive(false);

    try {
      const response = await fetch("/api/tools/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          duration,
          style,
          model: selectedModel,
          language: typeof aiLanguage === "string" ? aiLanguage : (aiLanguage as any)?.language || "en",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast({ title: "Insufficient credits", variant: "destructive" });
          return;
        }
        toast({ title: data?.error || "Failed to generate podcast", variant: "destructive" });
        return;
      }

      setScript(data);

      const dialogues: DialogueLine[] = data.segments.flatMap((seg: Segment) =>
        seg.dialogue.map((d: any) => ({
          speaker: d.speaker as "host" | "guest",
          text: d.text,
        }))
      );
      dialoguesRef.current = dialogues; // Initialize ref
      setAllDialogues(dialogues);
    } catch (error) {
      console.error(error);
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      window.dispatchEvent(new CustomEvent("credits-updated"));
    }
  };

  const playLine = useCallback(async (index: number) => {
    const dialogues = dialoguesRef.current;

    if (index >= dialogues.length) {
      setIsPlaying(false);
      setActiveSpeaker(null);
      return;
    }

    const line = dialogues[index];
    setCurrentLineIndex(index);
    setActiveSpeaker(line.speaker);
    setIsGeneratingLine(true);

    const voice = VOICES[line.speaker] || "hannah";
    const audioUrl = await generateAudioForText(line.text, voice);

    setIsGeneratingLine(false);

    if (audioUrl && audioRef.current) {
      setAllDialogues((prev) =>
        prev.map((d, i) => (i === index ? { ...d, audioUrl, isPlaying: true } : { ...d, isPlaying: false }))
      );

      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => {
        setAllDialogues((prev) => prev.map((d, i) => (i === index ? { ...d, isPlaying: false } : d)));
        playLine(index + 1);
      };
      audioRef.current.play().catch(() => {
        playLine(index + 1);
      });
    } else {
      setTimeout(() => playLine(index + 1), 2000);
    }
  }, []);

  const startLivePodcast = () => {
    setIsLive(true);
    setIsPlaying(true);
    setCurrentLineIndex(0);
    playLine(0);
  };

  const endCall = () => {
    audioRef.current?.pause();
    setIsLive(false);
    setIsPlaying(false);
    setActiveSpeaker(null);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (currentLineIndex < allDialogues.length) {
        setIsPlaying(true);
        audioRef.current?.play().catch(() => playLine(currentLineIndex));
      }
    }
  };

  const skipToNext = () => {
    audioRef.current?.pause();
    if (currentLineIndex + 1 < allDialogues.length) {
      playLine(currentLineIndex + 1);
    }
  };

  const handleMicPress = () => {
    if (!isLive) return;
    audioRef.current?.pause();
    setIsPlaying(false);
    setIsMicActive(true);
    setShowUserInput(true);
  };

  const handleUserJoin = async () => {
    if (!userMessage.trim()) return;

    const userLine: DialogueLine = {
      speaker: "user",
      text: userMessage,
    };

    const insertIndex = currentLineIndex + 1;

    setAllDialogues((prev) => {
      const newDialogues = [...prev];
      newDialogues.splice(insertIndex, 0, userLine);
      dialoguesRef.current = newDialogues;
      return newDialogues;
    });

    // Move to user message
    setCurrentLineIndex(insertIndex);
    setActiveSpeaker("user");

    setUserMessage("");
    setIsMicActive(false);
    setShowUserInput(false);

    try {
      const response = await fetch("/api/tools/youtube/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage,
          context: content.slice(0, 2000),
          title: script?.title || "Podcast",
          history: [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse: DialogueLine = {
          speaker: "host",
          text: data.answer || "That's a great point!",
        };

        const aiInsertIndex = insertIndex + 1;

        setAllDialogues((prev) => {
          const newDialogues = [...prev];
          newDialogues.splice(aiInsertIndex, 0, aiResponse);
          dialoguesRef.current = newDialogues;
          return newDialogues;
        });

        setTimeout(() => {
          setIsPlaying(true);
          playLine(aiInsertIndex);
        }, 500);
      } else {
        // If AI fails, continue with next original line
        setTimeout(() => {
          setIsPlaying(true);
          playLine(insertIndex + 1);
        }, 500);
      }
    } catch (e) {
      console.error(e);
      // Continue with next line on error
      setTimeout(() => {
        setIsPlaying(true);
        playLine(insertIndex + 1);
      }, 500);
    }
  };

  const cancelMic = () => {
    setIsMicActive(false);
    setShowUserInput(false);
    setUserMessage("");
    if (isLive && currentLineIndex < allDialogues.length) {
      setIsPlaying(true);
      audioRef.current?.play().catch(() => playLine(currentLineIndex));
    }
  };

  const clearContent = () => {
    setContent("");
    setUploadedFiles([]);
    setScript(null);
    setAllDialogues([]);
    setIsLive(false);
    setCurrentLineIndex(0);
  };

  const goBack = () => {
    setScript(null);
    setAllDialogues([]);
    setIsLive(false);
    setCurrentLineIndex(0);
  };

  const getSpeakerName = (speaker: "host" | "guest" | "user") => {
    if (speaker === "user") return "You";
    if (!script) return speaker === "host" ? "Host" : "Guest";
    return speaker === "host" ? script.speakers.host.name : script.speakers.guest.name;
  };

  if (!mounted) return null;

  const hasResults = script && allDialogues.length > 0;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {hasResults && (
            <button onClick={goBack} className="p-1 hover:bg-gray-100 rounded-lg mr-1">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <h1 className="text-sm font-semibold text-gray-900">Podcast Studio</h1>
          {isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-600 text-[10px] font-medium rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <Link href="/dashboard/media" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
          Media <ChevronRight className="w-2.5 h-2.5" />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        {hasResults ? (
          /* ===== 3 COLUMN LAYOUT ===== */
          <div className="h-full grid grid-cols-3 gap-3">
            {/* Column 1: Script & Source */}
            <div className="flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-900">Script & Sources</span>
                </div>
              </div>

              {/* Title */}
              <div className="p-3 border-b border-gray-100 shrink-0">
                <h2 className="font-medium text-gray-900 text-sm">{script.title}</h2>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{script.summary}</p>
              </div>

              {/* Sources */}
              {uploadedFiles.length > 0 && (
                <div className="p-3 border-b border-gray-100 shrink-0">
                  <p className="text-[10px] font-medium text-gray-500 mb-2">SOURCES</p>
                  <div className="space-y-1">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[10px] text-gray-700 truncate flex-1">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Segments */}
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-[10px] font-medium text-gray-500 mb-2">SEGMENTS</p>
                <div className="space-y-2">
                  {script.segments.map((seg, i) => (
                    <div key={i} className="p-2 border border-gray-100 rounded-lg">
                      <p className="text-xs font-medium text-gray-800">{seg.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{seg.dialogue.length} lines</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 border-t border-gray-100 flex gap-2 shrink-0">
                <Button onClick={clearContent} variant="outline" size="sm" className="flex-1 h-7 text-[10px]">
                  <RotateCcw className="w-3 h-3 mr-1" /> New
                </Button>
                <Button
                  onClick={() => {
                    const text = `# ${script.title}\n\n${script.segments
                      .map((seg) => `## ${seg.title}\n\n${seg.dialogue.map((d) => `**${getSpeakerName(d.speaker as any)}:** ${d.text}`).join("\n\n")}`)
                      .join("\n\n---\n\n")}`;
                    const blob = new Blob([text], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${script.title.slice(0, 30)}.md`;
                    a.click();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-[10px]"
                >
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
              </div>
            </div>

            {/* Column 2: Subtitles (Perplexity Style) */}
            <div className="flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-gray-900">Transcript</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {currentLineIndex + 1}/{allDialogues.length}
                </span>
              </div>

              {/* Subtitles */}
              <div ref={subtitlesRef} className="flex-1 overflow-y-auto p-4">
                {isLive ? (
                  <div className="space-y-4">
                    {allDialogues.slice(0, currentLineIndex + 1).map((line, i) => {
                      const isCurrentLine = i === currentLineIndex;
                      const isHost = line.speaker === "host";
                      const isUser = line.speaker === "user";

                      return (
                        <div
                          key={i}
                          className={`transition-all duration-300 ${
                            isCurrentLine ? "opacity-100" : "opacity-50"
                          }`}
                        >
                          {/* Speaker Label */}
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                                isUser ? "bg-green-500" : isHost ? "bg-blue-500" : "bg-gray-600"
                              }`}
                            >
                              {getSpeakerName(line.speaker).charAt(0)}
                            </div>
                            <span className={`text-[10px] font-medium ${
                              isUser ? "text-green-600" : isHost ? "text-blue-600" : "text-gray-600"
                            }`}>
                              {getSpeakerName(line.speaker)}
                            </span>
                            {isCurrentLine && line.isPlaying && (
                              <div className="flex gap-0.5 ml-1">
                                <span className="w-0.5 h-2 bg-blue-400 rounded-full animate-pulse" />
                                <span className="w-0.5 h-3 bg-blue-500 rounded-full animate-pulse delay-75" />
                                <span className="w-0.5 h-2 bg-blue-400 rounded-full animate-pulse delay-150" />
                              </div>
                            )}
                          </div>

                          {/* Text */}
                          <p
                            className={`text-sm leading-relaxed pl-7 ${
                              isCurrentLine ? "text-gray-900 font-medium" : "text-gray-600"
                            }`}
                          >
                            {line.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <Play className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500">Start the podcast to see transcript</p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isLive && (
                <div className="p-3 border-t border-gray-100 shrink-0">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${((currentLineIndex + 1) / allDialogues.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Column 3: Call Section */}
            <div className="flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-gray-900">
                    {isLive ? "On Air" : "Ready"}
                  </span>
                </div>
              </div>

              {/* Speakers */}
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="flex items-center gap-6">
                  {/* Host */}
                  <div className="text-center">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white transition-all ${
                        activeSpeaker === "host"
                          ? "bg-blue-500 ring-4 ring-blue-200 scale-110"
                          : "bg-blue-400"
                      }`}
                    >
                      {script.speakers.host.name.charAt(0)}
                    </div>
                    <p className="text-xs text-gray-700 mt-2 font-medium">{script.speakers.host.name}</p>
                    {activeSpeaker === "host" && (
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        <span className="w-1 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse delay-75" />
                        <span className="w-1 h-2 bg-green-400 rounded-full animate-pulse delay-150" />
                      </div>
                    )}
                  </div>

                  {/* Guest */}
                  <div className="text-center">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white transition-all ${
                        activeSpeaker === "guest"
                          ? "bg-gray-700 ring-4 ring-gray-300 scale-110"
                          : "bg-gray-500"
                      }`}
                    >
                      {script.speakers.guest.name.charAt(0)}
                    </div>
                    <p className="text-xs text-gray-700 mt-2 font-medium">{script.speakers.guest.name}</p>
                    {activeSpeaker === "guest" && (
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        <span className="w-1 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse delay-75" />
                        <span className="w-1 h-2 bg-green-400 rounded-full animate-pulse delay-150" />
                      </div>
                    )}
                  </div>
                </div>

                {/* User Avatar (when joining) */}
                {(isMicActive || activeSpeaker === "user") && (
                  <div className="text-center mt-4">
                    <div className="w-14 h-14 rounded-full bg-green-500 ring-4 ring-green-200 flex items-center justify-center text-lg font-bold text-white mx-auto">
                      U
                    </div>
                    <p className="text-xs text-gray-700 mt-1 font-medium">You</p>
                  </div>
                )}

                {/* Status */}
                <div className="mt-6 text-center">
                  {isGeneratingLine ? (
                    <p className="text-[10px] text-gray-400">Generating audio...</p>
                  ) : isLive ? (
                    <p className="text-[10px] text-green-600 font-medium">Podcast is playing</p>
                  ) : (
                    <p className="text-[10px] text-gray-400">Click to start podcast</p>
                  )}
                </div>
              </div>

              {/* User Input (when mic active) */}
              {showUserInput && (
                <div className="p-3 border-t border-gray-100 shrink-0">
                  <p className="text-[10px] text-green-600 font-medium text-center mb-2">Your turn</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUserJoin()}
                      placeholder="Type message..."
                      autoFocus
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button onClick={cancelMic} className="p-2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleUserJoin}
                      disabled={!userMessage.trim()}
                      className="p-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="p-4 border-t border-gray-100 shrink-0">
                {!isLive ? (
                  <button
                    onClick={startLivePodcast}
                    className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl flex items-center justify-center gap-2 font-medium text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    Start Podcast
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={skipToNext}
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <SkipForward className="w-4 h-4 text-gray-600" />
                    </button>

                    <button
                      onClick={togglePlayPause}
                      className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={handleMicPress}
                      disabled={showUserInput}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isMicActive
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-600"
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      onClick={endCall}
                      className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ===== INPUT VIEW ===== */
          <div className="h-full grid lg:grid-cols-[1fr_280px] gap-3">
            {/* Left: Content Input */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
              {/* File Upload Bar */}
              <div className="p-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.md"
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Files
                  </button>
                  {uploadedFiles.length > 0 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Add More
                    </button>
                  )}
                  <span className="ml-auto text-[10px] text-gray-400">{content.length} chars</span>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {uploadedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg text-[10px]"
                      >
                        <FileText className="w-3 h-3 text-blue-600" />
                        <span className="text-blue-700 truncate max-w-[100px]">{file.name}</span>
                        <button onClick={() => removeFile(i)} className="hover:bg-blue-100 rounded p-0.5">
                          <X className="w-2.5 h-2.5 text-blue-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Textarea */}
              <div className="flex-1 p-4 min-h-0">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Upload PDF files or paste your content here...

You can upload multiple files and they will be combined into one podcast."
                  className="w-full h-full resize-none text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Right: Options Panel */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <Radio className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Create Podcast</h2>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Duration</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: "short", label: "5-7m" },
                      { value: "medium", label: "10-12m" },
                      { value: "long", label: "15-20m" },
                    ].map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDuration(d.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          duration === d.value
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">Style</label>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      { value: "educational", label: "Educational" },
                      { value: "casual", label: "Casual" },
                      { value: "interview", label: "Interview" },
                    ].map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStyle(s.value)}
                        className={`py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          style === s.value
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-gray-500 mb-1.5 block">AI Model</label>
                  <ModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading || content.length < 200}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 mt-4"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Creating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate</>
                )}
              </Button>
              <p className="text-center text-[10px] text-gray-400 mt-2">Min 200 characters</p>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <p className="text-gray-900 font-medium text-sm">Creating podcast...</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Generating dialogue script</p>
          </div>
        </div>
      )}
    </div>
  );
}
