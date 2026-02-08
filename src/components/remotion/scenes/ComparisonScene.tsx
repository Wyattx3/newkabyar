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

interface ComparisonSceneProps {
  title: string;
  content: string[];
  imageUrl?: string;
  sceneIndex?: number;
}

// ── Variant A: Side-by-side cards ──
const VariantSideBySide: React.FC<ComparisonSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const mid = Math.ceil(content.length / 2);
  const left = content.slice(0, mid);
  const right = content.slice(mid);
  const leftSpring = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 70, mass: 0.9 } });
  const rightSpring = spring({ frame: frame - 20, fps, config: { damping: 14, stiffness: 70, mass: 0.9 } });
  const vsSpring = spring({ frame: frame - 26, fps, config: { damping: 8, stiffness: 130, mass: 0.4 } });

  return (
    <>
      <div style={{
        opacity: titleOpacity, fontSize: 30, fontWeight: 800,
        color: "#0f172a", textAlign: "center", marginBottom: 28, letterSpacing: -0.5,
      }}>{title}</div>
      <div style={{ display: "flex", flex: 1, gap: 16, alignItems: "stretch" }}>
        <div style={{
          flex: 1, opacity: interpolate(leftSpring, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(leftSpring, [0, 1], [-50, 0])}px)`,
          backgroundColor: "#f8fafc", borderRadius: 16, padding: "20px 22px",
          display: "flex", flexDirection: "column", gap: 10, border: "1px solid #e2e8f0",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            Option A
          </div>
          {left.map((item, i) => (
            <div key={i} style={{
              fontSize: 15, color: "#334155", lineHeight: 1.5, padding: "9px 12px",
              backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#3b82f6", flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${vsSpring})` }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            backgroundColor: "#3b82f6", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, boxShadow: "0 2px 8px rgba(59,130,246,0.2)",
          }}>VS</div>
        </div>
        <div style={{
          flex: 1, opacity: interpolate(rightSpring, [0, 1], [0, 1]),
          transform: `translateX(${interpolate(rightSpring, [0, 1], [50, 0])}px)`,
          backgroundColor: "#ffffff", borderRadius: 16, padding: "20px 22px",
          display: "flex", flexDirection: "column", gap: 10, border: "1px solid #e2e8f0",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
            Option B
          </div>
          {right.map((item, i) => (
            <div key={i} style={{
              fontSize: 15, color: "#334155", lineHeight: 1.5, padding: "9px 12px",
              backgroundColor: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: 2, backgroundColor: "#64748b", flexShrink: 0, transform: "rotate(45deg)" }} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ── Variant B: Table-style rows ──
const VariantTable: React.FC<ComparisonSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const mid = Math.ceil(content.length / 2);
  const left = content.slice(0, mid);
  const right = content.slice(mid);
  const rows = left.map((l, i) => ({ left: l, right: right[i] || "" }));

  return (
    <>
      <div style={{
        opacity: titleOpacity, fontSize: 30, fontWeight: 800,
        color: "#0f172a", textAlign: "center", marginBottom: 28, letterSpacing: -0.5,
      }}>{title}</div>
      {/* Table header */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 8,
        opacity: interpolate(frame, [8, 18], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ flex: 1, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 1 }}>
          Option A
        </div>
        <div style={{ width: 1, backgroundColor: "#e2e8f0" }} />
        <div style={{ flex: 1, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>
          Option B
        </div>
      </div>
      {/* Rows */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row, i) => {
          const delay = 14 + i * 10;
          const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const y = interpolate(frame, [delay, delay + 10], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity, transform: `translateY(${y}px)`,
              display: "flex", backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
              borderRadius: 10, border: "1px solid #f1f5f9", overflow: "hidden",
            }}>
              <div style={{ flex: 1, padding: "12px 16px", fontSize: 15, color: "#334155", lineHeight: 1.5 }}>{row.left}</div>
              <div style={{ width: 1, backgroundColor: "#e2e8f0" }} />
              <div style={{ flex: 1, padding: "12px 16px", fontSize: 15, color: "#334155", lineHeight: 1.5 }}>{row.right}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── Variant C: Stacked labeled cards ──
const VariantStacked: React.FC<ComparisonSceneProps & { frame: number; fps: number }> = ({
  title, content, frame, fps,
}) => {
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const mid = Math.ceil(content.length / 2);
  const left = content.slice(0, mid);
  const right = content.slice(mid);
  const topSpring = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } });
  const botSpring = spring({ frame: frame - 22, fps, config: { damping: 14, stiffness: 80, mass: 0.7 } });

  return (
    <>
      <div style={{
        opacity: titleOpacity, fontSize: 30, fontWeight: 800,
        color: "#0f172a", textAlign: "center", marginBottom: 24, letterSpacing: -0.5,
      }}>{title}</div>
      {/* Option A */}
      <div style={{
        opacity: interpolate(topSpring, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(topSpring, [0, 1], [25, 0])}px)`,
        backgroundColor: "#f8fafc", borderRadius: 14, padding: "16px 20px",
        border: "1px solid #e2e8f0", marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Option A</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {left.map((item, i) => (
            <div key={i} style={{
              padding: "8px 14px", backgroundColor: "#ffffff", borderRadius: 8,
              border: "1px solid #f1f5f9", fontSize: 14, color: "#334155", lineHeight: 1.4,
            }}>{item}</div>
          ))}
        </div>
      </div>
      {/* Divider */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
        opacity: interpolate(frame, [20, 30], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>VS</div>
        <div style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
      </div>
      {/* Option B */}
      <div style={{
        opacity: interpolate(botSpring, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(botSpring, [0, 1], [25, 0])}px)`,
        backgroundColor: "#ffffff", borderRadius: 14, padding: "16px 20px",
        border: "1px solid #e2e8f0",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Option B</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {right.map((item, i) => (
            <div key={i} style={{
              padding: "8px 14px", backgroundColor: "#f8fafc", borderRadius: 8,
              border: "1px solid #f1f5f9", fontSize: 14, color: "#334155", lineHeight: 1.4,
            }}>{item}</div>
          ))}
        </div>
      </div>
    </>
  );
};

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({ title, content, sceneIndex = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = (hashVariant(title, 3) + sceneIndex) % 3;

  const emojis = ["⚖️", "🔄", "🤔", "📊"];
  const emoji = emojis[(hashVariant(title, emojis.length) + sceneIndex) % emojis.length];

  return (
    <AbsoluteFill style={{
      backgroundColor: "#ffffff",
      display: "flex", flexDirection: "column",
      padding: "40px 44px", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden",
    }}>
      <FloatingSparkles count={3} delay={12} color="#dbeafe" />

      {variant === 0 && <VariantSideBySide title={title} content={content} frame={frame} fps={fps} />}
      {variant === 1 && <VariantTable title={title} content={content} frame={frame} fps={fps} />}
      {variant === 2 && <VariantStacked title={title} content={content} frame={frame} fps={fps} />}

      {/* Mascot thinking about comparison */}
      <Mascot
        size={68}
        expression="thinking"
        delay={18}
        position={{ bottom: 10, right: 14 }}
      />

      {/* Speech bubble with comparison hint */}
      <SpeechBubble
        text="Let's compare! 🧐"
        delay={32}
        position={{ bottom: 88, right: 8 }}
        direction="right"
        maxWidth={130}
      />

      {/* Comparison emoji */}
      <BouncingEmoji emoji={emoji} delay={20} position={{ top: 12, left: 18 }} size={28} />
    </AbsoluteFill>
  );
};
