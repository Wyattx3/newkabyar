"use client";

import { Player } from "@remotion/player";
import { ExplainerComposition } from "./ExplainerComposition";
import type { ExplainerData } from "./types";

interface RemotionPlayerWrapperProps {
  data: ExplainerData;
}

export default function RemotionPlayerWrapper({ data }: RemotionPlayerWrapperProps) {
  return (
    <Player
      component={ExplainerComposition}
      inputProps={{ data }}
      durationInFrames={data.totalDurationInFrames || 300}
      compositionWidth={960}
      compositionHeight={540}
      fps={30}
      style={{
        width: "100%",
        aspectRatio: "16/9",
      }}
      controls
      autoPlay={false}
      loop
    />
  );
}
