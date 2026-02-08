"use client";

import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  AbsoluteFill,
} from "remotion";
import { hashVariant } from "../utils";
import { Mascot, SpeechBubble, FloatingSparkles, BouncingEmoji, CartoonUnderline } from "../CartoonElements";

interface TitleSceneProps {
  title: string;
  content: string[];
  imageUrl?: string;
  sceneIndex?: number;
}

// Shared image thumbnail for title scenes
const TitleImage: React.FC<{ imageUrl: string; frame: number }> = ({ imageUrl, frame }) => {
  const opacity = interpolate(frame, [30, 48], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [30, 48], [0.9, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", right: 40, bottom: 40,
      width: 160, height: 110, borderRadius: 14,
      overflow: "hidden", border: "1px solid #e2e8f0",
      opacity, transform: `scale(${scale})`,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

// ── Variant A: Center aligned, minimal accent line ──
const VariantCenter: React.FC<TitleSceneProps & { frame: number; fps: number }> = ({
  title,
  content,
  imageUrl,
  frame,
  fps,
}) => {
  const titleSpring = spring({ frame, fps, config: { damping: 12, stiffness: 70, mass: 0.8 } });
  const titleOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [10, 35], [0, 80], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [22, 40], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [22, 40], [20, 0], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        transform: `scale(${titleSpring})`,
        opacity: titleOpacity,
        fontSize: 50, fontWeight: 800, color: "#0f172a",
        textAlign: "center", lineHeight: 1.15, maxWidth: "80%",
        letterSpacing: -1, fontFamily: "Inter, system-ui, sans-serif",
      }}>
        {title}
      </div>
      <div style={{
        width: lineW, height: 3, backgroundColor: "#3b82f6",
        borderRadius: 2, marginTop: 26, marginBottom: 26,
      }} />
      {content[0] && (
        <div style={{
          opacity: subOpacity, transform: `translateY(${subY}px)`,
          fontSize: 21, color: "#64748b", textAlign: "center",
          maxWidth: "68%", lineHeight: 1.6, fontFamily: "Inter, system-ui, sans-serif",
        }}>
          {content[0]}
        </div>
      )}
      {imageUrl && <TitleImage imageUrl={imageUrl} frame={frame} />}
    </>
  );
};

// ── Variant B: Left aligned with large number ──
const VariantLeft: React.FC<TitleSceneProps & { frame: number; fps: number }> = ({
  title,
  content,
  imageUrl,
  frame,
  fps,
}) => {
  const titleSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } });
  const titleX = interpolate(titleSpring, [0, 1], [-40, 0]);
  const titleOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [18, 34], [0, 1], { extrapolateRight: "clamp" });
  const accentH = interpolate(frame, [0, 22], [0, 70], { extrapolateRight: "clamp" });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "flex-start",
      justifyContent: "center", width: "100%", padding: "0 80px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div style={{
          width: 4, height: accentH, backgroundColor: "#3b82f6",
          borderRadius: 2, flexShrink: 0, marginTop: 6,
        }} />
        <div>
          <div style={{
            opacity: titleOpacity, transform: `translateX(${titleX}px)`,
            fontSize: 46, fontWeight: 800, color: "#0f172a",
            lineHeight: 1.15, letterSpacing: -1, fontFamily: "Inter, system-ui, sans-serif",
          }}>
            {title}
          </div>
          {content[0] && (
            <div style={{
              opacity: subOpacity, fontSize: 20, color: "#64748b",
              lineHeight: 1.6, marginTop: 16, maxWidth: 600,
              fontFamily: "Inter, system-ui, sans-serif",
            }}>
              {content[0]}
            </div>
          )}
        </div>
      </div>
      {imageUrl && <TitleImage imageUrl={imageUrl} frame={frame} />}
    </div>
  );
};

// ── Variant C: Bottom-heavy with large circle accent ──
const VariantCircle: React.FC<TitleSceneProps & { frame: number; fps: number }> = ({
  title,
  content,
  imageUrl,
  frame,
  fps,
}) => {
  const titleSpring = spring({ frame, fps, config: { damping: 10, stiffness: 60, mass: 1 } });
  const titleOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const circleScale = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 50, mass: 1.2 } });
  const subOpacity = interpolate(frame, [24, 42], [0, 1], { extrapolateRight: "clamp" });
  const badgeSpring = spring({ frame: frame - 35, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });

  return (
    <>
      {/* Large circle accent */}
      <div style={{
        position: "absolute", bottom: -100, right: -100,
        width: 320, height: 320, borderRadius: "50%",
        border: "1.5px solid #e2e8f0",
        transform: `scale(${circleScale})`,
        opacity: interpolate(frame, [5, 20], [0, 0.6], { extrapolateRight: "clamp" }),
      }} />
      <div style={{
        position: "absolute", top: -60, left: -60,
        width: 160, height: 160, borderRadius: "50%",
        border: "1px solid #f1f5f9",
        transform: `scale(${circleScale})`,
        opacity: interpolate(frame, [8, 22], [0, 0.4], { extrapolateRight: "clamp" }),
      }} />

      <div style={{
        opacity: titleOpacity, transform: `scale(${titleSpring})`,
        fontSize: 48, fontWeight: 800, color: "#0f172a",
        textAlign: "center", lineHeight: 1.15, maxWidth: "78%",
        letterSpacing: -1, fontFamily: "Inter, system-ui, sans-serif",
        zIndex: 1,
      }}>
        {title}
      </div>

      {content[0] && (
        <div style={{
          opacity: subOpacity, fontSize: 20, color: "#94a3b8",
          textAlign: "center", maxWidth: "60%", lineHeight: 1.6,
          marginTop: 20, fontFamily: "Inter, system-ui, sans-serif", zIndex: 1,
        }}>
          {content[0]}
        </div>
      )}

      {content[1] && (
        <div style={{
          marginTop: 22,
          opacity: interpolate(badgeSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(badgeSpring, [0, 1], [12, 0])}px)`,
          padding: "6px 18px", borderRadius: 20,
          backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
          fontSize: 13, color: "#3b82f6", fontWeight: 600, zIndex: 1,
        }}>
          {content[1]}
        </div>
      )}
      {imageUrl && <TitleImage imageUrl={imageUrl} frame={frame} />}
    </>
  );
};

export const TitleScene: React.FC<TitleSceneProps> = ({ title, content, imageUrl, sceneIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = (hashVariant(title, 3) + sceneIndex) % 3;

  // Pick cartoon expression based on variant
  const expressions = ["waving", "excited", "happy"] as const;
  const mascotExpr = expressions[(sceneIndex + variant) % 3];

  // Pick emoji based on scene
  const emojis = ["💡", "🚀", "✨", "🎯", "📚", "🌟"];
  const emoji = emojis[(hashVariant(title, emojis.length) + sceneIndex) % emojis.length];

  return (
    <AbsoluteFill style={{
      backgroundColor: "#ffffff",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 60, overflow: "hidden",
    }}>
      <FloatingSparkles count={5} delay={8} color="#93c5fd" />
      {variant === 0 && <VariantCenter title={title} content={content} imageUrl={imageUrl} frame={frame} fps={fps} />}
      {variant === 1 && <VariantLeft title={title} content={content} imageUrl={imageUrl} frame={frame} fps={fps} />}
      {variant === 2 && <VariantCircle title={title} content={content} imageUrl={imageUrl} frame={frame} fps={fps} />}

      {/* Cartoon mascot waving hello */}
      <Mascot
        size={90}
        expression={mascotExpr}
        delay={14}
        position={variant === 1 ? { bottom: 20, right: 40 } : { bottom: 20, left: 40 }}
      />

      {/* Speech bubble with subtitle or greeting */}
      <SpeechBubble
        text={content[0] ? `Let's learn about this!` : "Hey there! 👋"}
        delay={28}
        position={variant === 1 ? { bottom: 125, right: 30 } : { bottom: 125, left: 30 }}
        direction={variant === 1 ? "right" : "left"}
        maxWidth={150}
      />

      {/* Bouncing topic emoji */}
      <BouncingEmoji emoji={emoji} delay={18} position={{ top: 25, right: 35 }} size={32} />

      {/* Underline effect below title */}
      {variant === 0 && (
        <CartoonUnderline width={Math.min(title.length * 12, 280)} delay={22}
          style={{ position: "absolute", bottom: "42%", left: "50%", transform: "translateX(-50%)" }}
        />
      )}
    </AbsoluteFill>
  );
};
