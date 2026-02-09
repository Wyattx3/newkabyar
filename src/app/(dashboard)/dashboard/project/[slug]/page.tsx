"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ToolInitialData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
}

type ToolComponentProps = { initialData?: ToolInitialData };

// Dynamic imports for all tool pages
const d = (path: string) =>
  dynamic<ToolComponentProps>(
    () => import(`../../${path}/page`) as Promise<{ default: ComponentType<ToolComponentProps> }>,
    { ssr: false }
  );

const toolComponents: Record<string, ComponentType<ToolComponentProps>> = {
  // Writing
  paraphraser: d("writing/paraphraser"),
  humanizer: d("writing/humanizer"),
  "ai-detector": d("writing/ai-detector"),
  "devils-advocate": d("writing/devils-advocate"),
  "vocabulary-upgrader": d("writing/vocabulary-upgrader"),
  "cold-email": d("writing/cold-email"),
  "assignment-worker": d("writing/assignment-worker"),
  "video-explainer": d("writing/video-explainer"),
  "roast-assignment": d("writing/roast-assignment"),
  "image-solve": d("writing/image-solve"),
  // RAG & Documents
  "pdf-qa": d("rag/pdf-qa"),
  "quiz-generator": d("rag/quiz-generator"),
  "flashcard-maker": d("rag/flashcard-maker"),
  "past-paper": d("rag/past-paper"),
  "resume-tailor": d("rag/resume-tailor"),
  // Visual
  "mind-map": d("visual/mind-map"),
  timeline: d("visual/timeline"),
  flowchart: d("visual/flowchart"),
  "lab-report": d("visual/lab-report"),
  // Research
  "research-gap": d("research/research-gap"),
  "academic-consensus": d("research/academic-consensus"),
  // Media
  "youtube-summarizer": d("media/youtube-summarizer"),
  "pdf-podcast": d("media/pdf-podcast"),
  "lecture-organizer": d("media/lecture-organizer"),
  "viva-simulator": d("media/viva-simulator"),
};

interface ProjectData {
  id: string;
  slug: string;
  toolId: string;
  caption: string;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings: Record<string, unknown> | null;
  createdAt: string;
}

export default function ProjectRestorePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/projects/${slug}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "Project not found");
          return;
        }

        setProject(data.project);
      } catch {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Project Not Found
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {error || "This project doesn't exist or you don't have access."}
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/library")}
            variant="outline"
            className="mt-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  const ToolComponent = toolComponents[project.toolId];

  if (!ToolComponent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Tool Not Supported
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              This project&apos;s tool ({project.toolId}) doesn&apos;t support
              restore yet.
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/library")}
            variant="outline"
            className="mt-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ToolComponent
      initialData={{
        inputData: project.inputData,
        outputData: project.outputData,
        settings: project.settings,
      }}
    />
  );
}
