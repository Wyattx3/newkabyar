"use client";

import { AbsoluteFill, Sequence, Audio, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { BulletScene } from "./scenes/BulletScene";
import { ComparisonScene } from "./scenes/ComparisonScene";
import { TimelineScene } from "./scenes/TimelineScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { hashVariant } from "./utils";
import type { ExplainerData } from "./types";

interface ExplainerCompositionProps {
  data: ExplainerData;
}

type TransitionType = "fade-slide" | "zoom" | "slide-left" | "slide-up" | "wipe";

const TRANSITIONS: TransitionType[] = ["fade-slide", "zoom", "slide-left", "slide-up", "wipe"];

const SceneTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  transitionType: TransitionType;
}> = ({ children, durationInFrames, transitionType }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterDuration = 14;
  const exitDuration = 10;

  const enterSpring = spring({
    frame, fps,
    config: { damping: 14, stiffness: 80, mass: 0.7 },
  });

  const fadeIn = interpolate(frame, [0, enterDuration], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  let transform = "";
  let clipPath: string | undefined;

  switch (transitionType) {
    case "fade-slide": {
      const y = interpolate(enterSpring, [0, 1], [25, 0]);
      const exitY = interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [0, -15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      transform = `translateY(${frame < durationInFrames - exitDuration ? y : exitY}px)`;
      break;
    }
    case "zoom": {
      const scaleIn = interpolate(enterSpring, [0, 1], [0.94, 1]);
      const scaleOut = interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      transform = `scale(${frame < durationInFrames - exitDuration ? scaleIn : scaleOut})`;
      break;
    }
    case "slide-left": {
      const x = interpolate(enterSpring, [0, 1], [50, 0]);
      const exitX = interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [0, -30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      transform = `translateX(${frame < durationInFrames - exitDuration ? x : exitX}px)`;
      break;
    }
    case "slide-up": {
      const y = interpolate(enterSpring, [0, 1], [40, 0]);
      const exitY = interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [0, -25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      transform = `translateY(${frame < durationInFrames - exitDuration ? y : exitY}px)`;
      break;
    }
    case "wipe": {
      const wipeIn = interpolate(frame, [0, enterDuration], [0, 100], { extrapolateRight: "clamp" });
      const wipeOut = interpolate(frame, [durationInFrames - exitDuration, durationInFrames], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      clipPath = `inset(0 ${100 - (frame < durationInFrames - exitDuration ? wipeIn : wipeOut)}% 0 0)`;
      break;
    }
  }

  return (
    <AbsoluteFill style={{ opacity, transform: transform || undefined, clipPath }}>
      {children}
    </AbsoluteFill>
  );
};

const renderScene = (scene: ExplainerData["scenes"][number]) => {
  const { type, title, content, imageUrl, sceneIndex } = scene;
  switch (type) {
    case "title":
      return <TitleScene title={title} content={content} imageUrl={imageUrl} sceneIndex={sceneIndex} />;
    case "bullets":
      return <BulletScene title={title} content={content} imageUrl={imageUrl} sceneIndex={sceneIndex} />;
    case "comparison":
      return <ComparisonScene title={title} content={content} imageUrl={imageUrl} sceneIndex={sceneIndex} />;
    case "timeline":
      return <TimelineScene title={title} content={content} imageUrl={imageUrl} sceneIndex={sceneIndex} />;
    case "summary":
      return <SummaryScene title={title} content={content} imageUrl={imageUrl} sceneIndex={sceneIndex} />;
    default:
      return <BulletScene title={title} content={content} imageUrl={imageUrl} sceneIndex={sceneIndex} />;
  }
};

// Ensure no two consecutive scenes use the same transition
const getTransition = (scenes: ExplainerData["scenes"], index: number): TransitionType => {
  if (index === 0) return "zoom";
  const prevTransition = index > 1
    ? TRANSITIONS[(hashVariant(scenes[index - 1].title + (index - 1), TRANSITIONS.length) + (index - 1)) % TRANSITIONS.length]
    : "zoom";
  let candidate = TRANSITIONS[(hashVariant(scenes[index].title + index, TRANSITIONS.length) + index) % TRANSITIONS.length];
  // If same as previous, shift by 1
  if (candidate === prevTransition) {
    candidate = TRANSITIONS[(TRANSITIONS.indexOf(candidate) + 1) % TRANSITIONS.length];
  }
  return candidate;
};

export const ExplainerComposition: React.FC<ExplainerCompositionProps> = ({ data }) => {
  let currentFrame = 0;
  const audioUrls = data.audioUrls || [];

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
      {data.scenes.map((scene, i) => {
        const from = currentFrame;
        currentFrame += scene.durationInFrames;
        const transition = getTransition(data.scenes, i);
        const audioUrl = audioUrls[i];

        return (
          <Sequence key={i} from={from} durationInFrames={scene.durationInFrames} name={`${scene.type}: ${scene.title}`}>
            {audioUrl && <Audio src={audioUrl} volume={1} />}
            <SceneTransition durationInFrames={scene.durationInFrames} transitionType={transition}>
              {renderScene(scene)}
            </SceneTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
