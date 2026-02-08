"use client";

import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  AbsoluteFill,
} from "remotion";
import { hashVariant } from "../utils";
import { Mascot, FloatingSparkles, BouncingEmoji, SpeechBubble } from "../CartoonElements";

interface SummarySceneProps {
  title: string;
  content: string[];
  imageUrl?: string;
  sceneIndex?: number;
}

// ── Variant A: Checkmark list ──
const VariantChecklist: React.FC<SummarySceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 14], [-20, 0], { extrapolateRight: "clamp" });
  const iconSpring = spring({ frame: frame - 3, fps, config: { damping: 8, stiffness: 130, mass: 0.4 } });

  return (
    <>
      <div style={{
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          backgroundColor: "#3b82f6", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 20, color: "#ffffff",
          transform: `scale(${iconSpring})`, boxShadow: "0 2px 8px rgba(59,130,246,0.2)",
        }}>✓</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {content.map((item, i) => {
          const delay = 14 + i * 8;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 80, mass: 0.6 } });
          const opacity = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const checkSpring = spring({ frame: frame - delay - 3, fps, config: { damping: 8, stiffness: 140, mass: 0.3 } });
          return (
            <div key={i} style={{
              opacity, transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
              display: "flex", alignItems: "center", gap: 14,
              padding: "13px 18px", backgroundColor: i === 0 ? "#f8fafc" : "#ffffff",
              borderRadius: 12, border: `1px solid ${i === 0 ? "#bfdbfe" : "#e2e8f0"}`,
            }}>
              <div style={{
                minWidth: 28, height: 28, borderRadius: 8,
                backgroundColor: "#3b82f6", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, flexShrink: 0,
                transform: `scale(${checkSpring})`,
              }}>✓</div>
              <div style={{ fontSize: 16, color: "#1e293b", lineHeight: 1.5, fontWeight: 500, flex: 1 }}>{item}</div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "#cbd5e1",
                opacity: interpolate(frame, [delay + 5, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}>{String(i + 1).padStart(2, "0")}</div>
            </div>
          );
        })}
      </div>
      <div style={{
        opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" }),
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12,
      }}>
        <div style={{ width: 20, height: 1, backgroundColor: "#e2e8f0" }} />
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>KABYAR AI</div>
        <div style={{ width: 20, height: 1, backgroundColor: "#e2e8f0" }} />
      </div>
    </>
  );
};

// ── Variant B: Boxed grid cards ──
const VariantBoxed: React.FC<SummarySceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, fontSize: 30, fontWeight: 800,
        color: "#0f172a", textAlign: "center", marginBottom: 10, letterSpacing: -0.5,
      }}>{title}</div>
      <div style={{
        opacity: interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" }),
        textAlign: "center", fontSize: 13, color: "#94a3b8", marginBottom: 28,
      }}>Key takeaways</div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, flex: 1, alignContent: "flex-start",
      }}>
        {content.map((item, i) => {
          const delay = 12 + i * 8;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 90, mass: 0.5 } });
          const opacity = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isWide = content.length <= 3 || i === 0;
          return (
            <div key={i} style={{
              opacity, transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px) scale(${interpolate(s, [0, 1], [0.96, 1])})`,
              width: isWide ? "100%" : "calc(50% - 6px)",
              padding: "16px 18px", backgroundColor: "#f8fafc",
              borderRadius: 14, border: "1px solid #e2e8f0",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                minWidth: 30, height: 30, borderRadius: "50%",
                backgroundColor: "#3b82f6", color: "#ffffff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ fontSize: 15, color: "#1e293b", lineHeight: 1.5, fontWeight: 500 }}>{item}</div>
            </div>
          );
        })}
      </div>
      <div style={{
        opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" }),
        textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 12,
        fontWeight: 600, letterSpacing: 1, textTransform: "uppercase",
      }}>Generated with KABYAR AI</div>
    </>
  );
};

// ── Variant C: Minimal with left accent ──
const VariantMinimal: React.FC<SummarySceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [0, 14], [-25, 0], { extrapolateRight: "clamp" });
  const accentH = interpolate(frame, [0, 20], [0, 34], { extrapolateRight: "clamp" });

  return (
    <>
      <div style={{
        opacity: titleOpacity, transform: `translateX(${titleX}px)`,
        display: "flex", alignItems: "center", gap: 12, marginBottom: 28,
      }}>
        <div style={{ width: 4, height: accentH, backgroundColor: "#3b82f6", borderRadius: 2 }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>{title}</div>
          <div style={{
            fontSize: 13, color: "#94a3b8",
            opacity: interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" }),
          }}>{content.length} takeaways</div>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {content.map((item, i) => {
          const delay = 14 + i * 9;
          const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x = interpolate(frame, [delay, delay + 10], [35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i}>
              <div style={{
                opacity, transform: `translateX(${x}px)`,
                display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  backgroundColor: "#3b82f6", flexShrink: 0,
                }} />
                <div style={{ fontSize: 17, color: "#1e293b", lineHeight: 1.5, fontWeight: 500, flex: 1 }}>{item}</div>
              </div>
              {i < content.length - 1 && (
                <div style={{
                  height: 1, backgroundColor: "#f1f5f9", marginLeft: 22,
                  transform: `scaleX(${interpolate(frame, [delay + 5, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                  transformOrigin: "left",
                }} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        opacity: interpolate(frame, [55, 70], [0, 1], { extrapolateRight: "clamp" }),
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12,
      }}>
        <div style={{ width: 20, height: 1, backgroundColor: "#e2e8f0" }} />
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>KABYAR AI</div>
        <div style={{ width: 20, height: 1, backgroundColor: "#e2e8f0" }} />
      </div>
    </>
  );
};

export const SummaryScene: React.FC<SummarySceneProps> = ({ title, content, sceneIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = (hashVariant(title + content.length, 3) + sceneIndex) % 3;

  return (
    <AbsoluteFill style={{
      backgroundColor: "#ffffff",
      display: "flex", flexDirection: "column",
      padding: "40px 56px", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden",
    }}>
      <FloatingSparkles count={5} delay={6} color="#93c5fd" />

      {variant === 0 && <VariantChecklist title={title} content={content} frame={frame} fps={fps} />}
      {variant === 1 && <VariantBoxed title={title} content={content} frame={frame} fps={fps} />}
      {variant === 2 && <VariantMinimal title={title} content={content} frame={frame} fps={fps} />}

      {/* Excited mascot celebrating end */}
      <Mascot
        size={80}
        expression="excited"
        delay={12}
        position={{ bottom: 10, left: 20 }}
      />

      {/* Farewell speech bubble */}
      <SpeechBubble
        text="That's a wrap! 🎉"
        delay={35}
        position={{ bottom: 100, left: 14 }}
        direction="left"
        maxWidth={140}
      />

      {/* Celebration emojis */}
      <BouncingEmoji emoji="🎓" delay={16} position={{ top: 14, right: 30 }} size={30} />
      <BouncingEmoji emoji="🎉" delay={22} position={{ top: 18, left: 30 }} size={24} />
    </AbsoluteFill>
  );
};
