"use client";

import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  AbsoluteFill,
} from "remotion";
import { hashVariant } from "../utils";
import { Mascot, PointingHand, FloatingSparkles, BouncingEmoji, ThoughtCloud } from "../CartoonElements";

interface BulletSceneProps {
  title: string;
  content: string[];
  imageUrl?: string;
  sceneIndex?: number;
}

// ── Variant A: Clean cards with left accent ──
const VariantCards: React.FC<BulletSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [0, 14], [-30, 0], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, transform: `translateX(${titleX}px)`,
        display: "flex", alignItems: "center", gap: 12, marginBottom: 30,
      }}>
        <div style={{ width: 4, height: 32, backgroundColor: "#3b82f6", borderRadius: 2 }} />
        <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {content.map((item, i) => {
          const delay = 12 + i * 9;
          const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 100, mass: 0.5 } });
          const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`,
              display: "flex", alignItems: "center", gap: 14,
              padding: "13px 18px", backgroundColor: "#ffffff",
              borderRadius: 12, border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                borderRadius: "12px 0 0 12px",
                backgroundColor: i % 2 === 0 ? "#3b82f6" : "#93c5fd",
                transform: `scaleY(${interpolate(frame, [delay + 4, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
              }} />
              <div style={{
                minWidth: 28, height: 28, borderRadius: 8,
                backgroundColor: "#3b82f6", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 17, color: "#1e293b", lineHeight: 1.5, fontWeight: 500 }}>{item}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── Variant B: Minimal dots list ──
const VariantDots: React.FC<BulletSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 14], [-20, 0], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
        fontSize: 30, fontWeight: 800, color: "#0f172a",
        marginBottom: 8, letterSpacing: -0.5,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 13, color: "#94a3b8", marginBottom: 28,
        opacity: interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {content.length} points
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
        {content.map((item, i) => {
          const delay = 14 + i * 10;
          const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(frame, [delay, delay + 10], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity, transform: `translateX(${x}px)`,
              display: "flex", alignItems: "flex-start", gap: 14,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: "#3b82f6", flexShrink: 0, marginTop: 7,
              }} />
              <div style={{ fontSize: 18, color: "#334155", lineHeight: 1.6, fontWeight: 500 }}>{item}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── Variant C: Two-column grid ──
const VariantGrid: React.FC<BulletSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, textAlign: "center",
        fontSize: 30, fontWeight: 800, color: "#0f172a",
        marginBottom: 32, letterSpacing: -0.5,
      }}>
        {title}
      </div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, flex: 1,
        alignContent: "flex-start",
      }}>
        {content.map((item, i) => {
          const delay = 10 + i * 8;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 90, mass: 0.5 } });
          const opacity = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px) scale(${interpolate(s, [0, 1], [0.96, 1])})`,
              width: "calc(50% - 6px)", padding: "14px 16px",
              backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
              borderRadius: 12, border: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                minWidth: 24, height: 24, borderRadius: 6,
                backgroundColor: "#eff6ff", color: "#3b82f6",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.45, fontWeight: 500 }}>{item}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── Variant D: Numbered rows with dividers ──
const VariantRows: React.FC<BulletSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [0, 14], [-25, 0], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, transform: `translateX(${titleX}px)`,
        fontSize: 30, fontWeight: 800, color: "#0f172a",
        marginBottom: 28, letterSpacing: -0.5,
      }}>
        {title}
      </div>
      <div style={{ flex: 1 }}>
        {content.map((item, i) => {
          const delay = 12 + i * 10;
          const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(frame, [delay, delay + 10], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i}>
              <div style={{
                opacity, transform: `translateX(${x}px)`,
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 0",
              }}>
                <div style={{
                  fontSize: 28, fontWeight: 800, color: "#e2e8f0",
                  minWidth: 40, textAlign: "right",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 17, color: "#1e293b", lineHeight: 1.5, fontWeight: 500, flex: 1 }}>{item}</div>
              </div>
              {i < content.length - 1 && (
                <div style={{
                  height: 1, backgroundColor: "#f1f5f9", marginLeft: 56,
                  transform: `scaleX(${interpolate(frame, [delay + 6, delay + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                  transformOrigin: "left",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export const BulletScene: React.FC<BulletSceneProps> = ({ title, content, imageUrl, sceneIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = (hashVariant(title + content.length, 4) + sceneIndex) % 4;

  // Image thumbnail for bullet scenes
  const imgOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(frame, [20, 35], [0.92, 1], { extrapolateRight: "clamp" });

  // Alternate cartoon decorations per scene
  const mascotExpressions = ["thinking", "pointing", "happy", "excited"] as const;
  const mascotExpr = mascotExpressions[(sceneIndex + variant) % 4];

  const emojis = ["📌", "📝", "💡", "🔍", "📊", "🎯"];
  const emoji = emojis[(hashVariant(title, emojis.length) + sceneIndex) % emojis.length];

  // Alternate mascot side
  const mascotOnRight = sceneIndex % 2 === 0;

  return (
    <AbsoluteFill style={{
      backgroundColor: "#ffffff",
      display: "flex", flexDirection: "column",
      padding: "44px 56px", fontFamily: "Inter, system-ui, sans-serif",
      overflow: "hidden",
    }}>
      <FloatingSparkles count={3} delay={10} color="#bfdbfe" />

      {variant === 0 && <VariantCards title={title} content={content} frame={frame} fps={fps} />}
      {variant === 1 && <VariantDots title={title} content={content} frame={frame} fps={fps} />}
      {variant === 2 && <VariantGrid title={title} content={content} frame={frame} fps={fps} />}
      {variant === 3 && <VariantRows title={title} content={content} frame={frame} fps={fps} />}

      {imageUrl && (
        <div style={{
          position: "absolute", right: 30, top: 30,
          width: 120, height: 80, borderRadius: 10,
          overflow: "hidden", border: "1px solid #e2e8f0",
          opacity: imgOpacity, transform: `scale(${imgScale})`,
        }}>
          <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* Mascot character explaining */}
      <Mascot
        size={72}
        expression={mascotExpr}
        delay={16}
        position={mascotOnRight ? { bottom: 12, right: 16 } : { bottom: 12, left: 16 }}
      />

      {/* Pointing hand toward content */}
      {variant !== 2 && (
        <PointingHand
          delay={22}
          direction="right"
          size={34}
          position={{ left: 18, top: content.length > 3 ? 130 : 110 }}
        />
      )}

      {/* Thought cloud when mascot is thinking */}
      {mascotExpr === "thinking" && (
        <ThoughtCloud
          text="Key points!"
          delay={30}
          position={mascotOnRight ? { bottom: 95, right: 10 } : { bottom: 95, left: 10 }}
        />
      )}

      {/* Bouncing emoji */}
      <BouncingEmoji emoji={emoji} delay={24} position={{ top: 14, right: imageUrl ? 165 : 30 }} size={26} />
    </AbsoluteFill>
  );
};
