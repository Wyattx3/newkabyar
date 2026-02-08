export interface Scene {
  type: "title" | "bullets" | "comparison" | "timeline" | "summary";
  title: string;
  content: string[];
  narration: string;
  imageUrl?: string;
  durationInFrames: number;
  sceneIndex: number;
}

export interface ExplainerData {
  title: string;
  scenes: Scene[];
  totalDurationInFrames: number;
  audioUrls?: (string | null)[];
}
