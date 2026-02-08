"use client";

import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  AbsoluteFill,
} from "remotion";
import { hashVariant } from "../utils";
import { Mascot, FloatingSparkles, PointingHand, BouncingEmoji, SpeechBubble } from "../CartoonElements";

interface TimelineSceneProps {
  title: string;
  content: string[];
  imageUrl?: string;
  sceneIndex?: number;
}

// ── Variant A: Horizontal nodes ──
const VariantHorizontal: React.FC<TimelineSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const progress = interpolate(frame, [10, 10 + content.length * 16], [0, 100], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, fontSize: 30, fontWeight: 800,
        color: "#0f172a", textAlign: "center", marginBottom: 40, letterSpacing: -0.5,
      }}>{title}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
        {/* Track */}
        <div style={{ position: "absolute", top: 18, left: "6%", right: "6%", height: 3, backgroundColor: "#f1f5f9", borderRadius: 2 }}>
          <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#3b82f6", borderRadius: 2 }} />
        </div>
        {/* Nodes */}
        <div style={{ display: "flex", justifyContent: "space-between", width: "88%", margin: "0 auto", position: "relative" }}>
          {content.map((item, i) => {
            const delay = 10 + i * 16;
            const nodeSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
            const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cardSpring = spring({ frame: frame - delay - 5, fps, config: { damping: 12, stiffness: 80, mass: 0.6 } });
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity, flex: 1 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  backgroundColor: "#3b82f6", border: "3px solid #ffffff",
                  boxShadow: "0 0 0 2px #3b82f6", zIndex: 2,
                  transform: `scale(${nodeSpring})`, flexShrink: 0,
                }} />
                <div style={{ width: 1, height: 14, backgroundColor: "#e2e8f0", opacity: interpolate(cardSpring, [0, 1], [0, 0.5]) }} />
                <div style={{
                  opacity: interpolate(cardSpring, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardSpring, [0, 1], [15, 0])}px)`,
                  padding: "10px 12px", backgroundColor: "#f8fafc",
                  borderRadius: 10, border: "1px solid #e2e8f0",
                  textAlign: "center", maxWidth: 150,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 3 }}>Step {i + 1}</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.4 }}>{item}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ── Variant B: Vertical steps ──
const VariantVertical: React.FC<TimelineSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [0, 14], [-25, 0], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, transform: `translateX(${titleX}px)`,
        display: "flex", alignItems: "center", gap: 12, marginBottom: 28,
      }}>
        <div style={{ width: 4, height: 30, backgroundColor: "#3b82f6", borderRadius: 2 }} />
        <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>{title}</div>
      </div>
      <div style={{ flex: 1, position: "relative", paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute", left: 12, top: 6, bottom: 6,
          width: 2, backgroundColor: "#e2e8f0",
        }}>
          <div style={{
            width: "100%",
            height: `${interpolate(frame, [10, 10 + content.length * 14], [0, 100], { extrapolateRight: "clamp" })}%`,
            backgroundColor: "#3b82f6",
          }} />
        </div>
        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {content.map((item, i) => {
            const delay = 10 + i * 14;
            const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const x = interpolate(frame, [delay, delay + 10], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity, transform: `translateX(${x}px)`,
                display: "flex", alignItems: "center", gap: 16,
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", left: -22,
                  width: 14, height: 14, borderRadius: "50%",
                  backgroundColor: "#ffffff", border: "2.5px solid #3b82f6",
                  zIndex: 1,
                }} />
                <div style={{
                  padding: "12px 16px", backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
                  borderRadius: 10, border: "1px solid #e2e8f0", flex: 1,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 16, color: "#334155", lineHeight: 1.5, fontWeight: 500 }}>{item}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ── Variant C: Numbered cards row ──
const VariantCardRow: React.FC<TimelineSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, fontSize: 30, fontWeight: 800,
        color: "#0f172a", textAlign: "center", marginBottom: 12, letterSpacing: -0.5,
      }}>{title}</div>
      <div style={{
        opacity: interpolate(frame, [6, 16], [0, 1], { extrapolateRight: "clamp" }),
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 32,
      }}>
        <div style={{ width: 20, height: 1, backgroundColor: "#e2e8f0" }} />
        <div style={{ fontSize: 13, color: "#94a3b8" }}>{content.length} steps</div>
        <div style={{ width: 20, height: 1, backgroundColor: "#e2e8f0" }} />
      </div>
      <div style={{
        flex: 1, display: "flex", gap: 12, alignItems: "stretch",
      }}>
        {content.map((item, i) => {
          const delay = 12 + i * 10;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 90, mass: 0.5 } });
          const opacity = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity, transform: `translateY(${interpolate(s, [0, 1], [25, 0])}px)`,
              flex: 1, padding: "18px 14px",
              backgroundColor: "#ffffff", borderRadius: 14,
              border: "1px solid #e2e8f0",
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", position: "relative",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                backgroundColor: "#3b82f6", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, marginBottom: 12,
              }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.5, fontWeight: 500 }}>{item}</div>
              {i < content.length - 1 && (
                <div style={{
                  position: "absolute", right: -10, top: "50%",
                  fontSize: 14, color: "#cbd5e1", transform: "translateY(-50%)",
                  opacity: interpolate(frame, [delay + 8, delay + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }}>→</div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export const TimelineScene: React.FC<TimelineSceneProps> = ({ title, content, sceneIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = (hashVariant(title + content.join(""), 3) + sceneIndex) % 3;

  const emojis = ["⏱️", "📋", "🔢", "🗺️", "📈"];
  const emoji = emojis[(hashVariant(title, emojis.length) + sceneIndex) % emojis.length];

  // Mascot walks along with timeline
  const mascotOnLeft = variant === 1; // vertical variant → mascot on left

  return (
    <AbsoluteFill style={{
      backgroundColor: "#ffffff",
      display: "flex", flexDirection: "column",
      padding: "40px 44px", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden",
    }}>
      <FloatingSparkles count={3} delay={8} color="#dbeafe" />

      {variant === 0 && <VariantHorizontal title={title} content={content} frame={frame} fps={fps} />}
      {variant === 1 && <VariantVertical title={title} content={content} frame={frame} fps={fps} />}
      {variant === 2 && <VariantCardRow title={title} content={content} frame={frame} fps={fps} />}

      {/* Mascot pointing at steps */}
      <Mascot
        size={68}
        expression="pointing"
        delay={14}
        position={mascotOnLeft ? { bottom: 10, left: 10 } : { bottom: 10, right: 14 }}
      />

      {/* Speech bubble */}
      <SpeechBubble
        text="Follow along! 👀"
        delay={28}
        position={mascotOnLeft ? { bottom: 88, left: 4 } : { bottom: 88, right: 8 }}
        direction={mascotOnLeft ? "left" : "right"}
        maxWidth={130}
      />

      {/* Pointing hand at first step */}
      {variant === 0 && (
        <PointingHand delay={20} direction="down" size={30} position={{ left: 60, top: 90 }} />
      )}

      <BouncingEmoji emoji={emoji} delay={22} position={{ top: 12, right: 20 }} size={26} />
    </AbsoluteFill>
  );
};
