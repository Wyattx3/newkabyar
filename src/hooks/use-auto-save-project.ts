"use client";

import { useCallback, useRef } from "react";

interface SaveProjectData {
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  settings?: Record<string, unknown>;
  inputPreview: string;
}

export function useAutoSaveProject(toolId: string) {
  const lastSaveRef = useRef<number>(0);

  const saveProject = useCallback(
    async (data: SaveProjectData) => {
      // Dedup client-side: skip if saved within 30 seconds
      const now = Date.now();
      if (now - lastSaveRef.current < 30000) return;
      lastSaveRef.current = now;

      // Fire-and-forget, non-blocking
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, ...data }),
      }).catch(() => {}); // silent fail
    },
    [toolId]
  );

  return { saveProject };
}
