"use client";

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// ─── Cute Mascot Character (chibi-style robot) ───
export const Mascot: React.FC<{
  size?: number;
  expression?: "happy" | "thinking" | "excited" | "waving" | "pointing";
  delay?: number;
  position?: { bottom?: number; right?: number; left?: number; top?: number };
}> = ({ size = 100, expression = "happy", delay = 20, position = { bottom: 20, right: 30 } }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterSpring = spring({ frame: frame - delay, fps, config: { damping: 8, stiffness: 60, mass: 0.8 } });
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Idle bounce
  const bounce = Math.sin((frame - delay) * 0.08) * 3;
  // Blink every ~80 frames
  const blinkCycle = (frame - delay) % 80;
  const isBlinking = blinkCycle >= 0 && blinkCycle < 4;

  // Arm wave for "waving"
  const waveAngle = expression === "waving" ? Math.sin((frame - delay) * 0.15) * 25 : 0;

  // Pointing arm angle
  const pointAngle = expression === "pointing" ? -30 : 0;

  // Eye style
  const eyeH = isBlinking ? 1 : 8;
  const eyeY = isBlinking ? 36 : 32;

  // Excited sparkles
  const sparkleOpacity = expression === "excited" ? interpolate(Math.sin((frame - delay) * 0.2), [-1, 1], [0.3, 1]) : 0;

  // Thinking dots
  const thinkDot1 = expression === "thinking" ? interpolate(Math.sin((frame - delay) * 0.12), [-1, 1], [0.2, 1]) : 0;
  const thinkDot2 = expression === "thinking" ? interpolate(Math.sin((frame - delay) * 0.12 + 1), [-1, 1], [0.2, 1]) : 0;
  const thinkDot3 = expression === "thinking" ? interpolate(Math.sin((frame - delay) * 0.12 + 2), [-1, 1], [0.2, 1]) : 0;

  return (
    <div style={{
      position: "absolute", ...position,
      opacity, transform: `scale(${enterSpring}) translateY(${bounce}px)`,
      zIndex: 10, pointerEvents: "none",
      width: size, height: size * 1.2,
    }}>
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2}>
        {/* Body */}
        <rect x="28" y="55" width="44" height="40" rx="12" fill="#3b82f6" />
        <rect x="34" y="60" width="32" height="14" rx="5" fill="#60a5fa" opacity="0.5" />

        {/* Head */}
        <circle cx="50" cy="35" r="26" fill="#3b82f6" />
        <circle cx="50" cy="35" r="22" fill="#dbeafe" />

        {/* Antenna */}
        <line x1="50" y1="9" x2="50" y2="4" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="50" cy="3" r="3.5" fill="#60a5fa">
          <animate attributeName="fill" values="#60a5fa;#93c5fd;#60a5fa" dur="1.5s" repeatCount="indefinite" />
        </circle>

        {/* Eyes */}
        <ellipse cx="40" cy={eyeY} rx="4.5" ry={eyeH / 2} fill="#1e293b" />
        <ellipse cx="60" cy={eyeY} rx="4.5" ry={eyeH / 2} fill="#1e293b" />
        {!isBlinking && (
          <>
            <circle cx="42" cy="30" r="1.5" fill="#ffffff" />
            <circle cx="62" cy="30" r="1.5" fill="#ffffff" />
          </>
        )}

        {/* Mouth */}
        {expression === "happy" || expression === "waving" || expression === "excited" ? (
          <path d="M42 42 Q50 50 58 42" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        ) : expression === "thinking" ? (
          <circle cx="53" cy="43" r="3" fill="none" stroke="#1e293b" strokeWidth="1.5" />
        ) : (
          <path d="M42 44 L58 44" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Left arm */}
        <g transform={`rotate(${waveAngle}, 28, 62)`}>
          <rect x="14" y="58" width="16" height="8" rx="4" fill="#3b82f6" />
          <circle cx="14" cy="62" r="5" fill="#dbeafe" />
        </g>

        {/* Right arm */}
        <g transform={`rotate(${pointAngle}, 72, 62)`}>
          <rect x="70" y="58" width="16" height="8" rx="4" fill="#3b82f6" />
          <circle cx="86" cy="62" r="5" fill="#dbeafe" />
          {expression === "pointing" && (
            <polygon points="90,58 98,56 90,54" fill="#dbeafe" />
          )}
        </g>

        {/* Feet */}
        <ellipse cx="38" cy="97" rx="10" ry="5" fill="#2563eb" />
        <ellipse cx="62" cy="97" rx="10" ry="5" fill="#2563eb" />

        {/* Excited sparkles */}
        {expression === "excited" && (
          <>
            <polygon points="16,18 18,12 20,18 14,15 22,15" fill="#3b82f6" opacity={sparkleOpacity} />
            <polygon points="78,14 80,8 82,14 76,11 84,11" fill="#60a5fa" opacity={sparkleOpacity * 0.8} />
            <polygon points="8,45 10,40 12,45 6,42 14,42" fill="#93c5fd" opacity={sparkleOpacity * 0.6} />
          </>
        )}

        {/* Thinking dots */}
        {expression === "thinking" && (
          <>
            <circle cx="70" cy="22" r="3" fill="#93c5fd" opacity={thinkDot1} />
            <circle cx="78" cy="16" r="4" fill="#93c5fd" opacity={thinkDot2} />
            <circle cx="88" cy="10" r="5" fill="#bfdbfe" opacity={thinkDot3} />
          </>
        )}
      </svg>
    </div>
  );
};

// ─── Speech Bubble ───
export const SpeechBubble: React.FC<{
  text?: string;
  delay?: number;
  position?: { top?: number; right?: number; left?: number; bottom?: number };
  direction?: "left" | "right";
  maxWidth?: number;
}> = ({ text, delay = 25, position = { bottom: 130, right: 20 }, direction = "left", maxWidth = 180 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 100, mass: 0.5 } });
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  if (!text) return null;

  return (
    <div style={{
      position: "absolute", ...position,
      opacity, transform: `scale(${s})`,
      transformOrigin: direction === "left" ? "bottom left" : "bottom right",
      zIndex: 11, pointerEvents: "none",
    }}>
      <div style={{
        position: "relative", backgroundColor: "#ffffff",
        border: "2px solid #e2e8f0", borderRadius: 16,
        padding: "10px 14px", maxWidth,
        boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4, fontWeight: 500 }}>{text}</div>
        {/* Tail */}
        <div style={{
          position: "absolute", bottom: -10,
          [direction === "left" ? "left" : "right"]: 20,
          width: 0, height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "10px solid #ffffff",
          filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.05))",
        }} />
        <div style={{
          position: "absolute", bottom: -13,
          [direction === "left" ? "left" : "right"]: 19,
          width: 0, height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderTop: "11px solid #e2e8f0",
          zIndex: -1,
        }} />
      </div>
    </div>
  );
};

// ─── Floating Cartoon Stars / Sparkles ───
export const FloatingSparkles: React.FC<{
  count?: number;
  delay?: number;
  color?: string;
}> = ({ count = 4, delay = 15, color = "#3b82f6" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const sparkles = Array.from({ length: count }, (_, i) => {
    const x = 15 + (i * 210) % 700;
    const y = 30 + ((i * 137) % 300);
    const size = 8 + (i % 3) * 5;
    const phase = i * 1.5;
    const sparkleOpacity = interpolate(Math.sin((frame - delay) * 0.06 + phase), [-1, 1], [0.15, 0.6]);
    const rotation = (frame - delay) * (0.8 + i * 0.3);
    const scale = interpolate(Math.sin((frame - delay) * 0.08 + phase), [-1, 1], [0.6, 1.2]);

    return (
      <div key={i} style={{
        position: "absolute", left: x, top: y,
        opacity: sparkleOpacity * (opacity > 0 ? 1 : 0),
        transform: `rotate(${rotation}deg) scale(${scale})`,
        pointerEvents: "none",
      }}>
        <svg width={size} height={size} viewBox="0 0 20 20">
          <polygon points="10,0 12.5,7 20,7.5 14,12.5 16,20 10,15.5 4,20 6,12.5 0,7.5 7.5,7"
            fill={color} opacity="0.7" />
        </svg>
      </div>
    );
  });

  return <>{sparkles}</>;
};

// ─── Cartoon Pointing Hand ───
export const PointingHand: React.FC<{
  delay?: number;
  position?: { top?: number; right?: number; left?: number; bottom?: number };
  direction?: "right" | "left" | "up" | "down";
  size?: number;
}> = ({ delay = 20, position = { left: 10, top: 50 }, direction = "right", size = 44 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100, mass: 0.5 } });
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Bounce effect
  const bounceX = direction === "right" ? Math.sin((frame - delay) * 0.12) * 5 : direction === "left" ? -Math.sin((frame - delay) * 0.12) * 5 : 0;
  const bounceY = direction === "down" ? Math.sin((frame - delay) * 0.12) * 5 : direction === "up" ? -Math.sin((frame - delay) * 0.12) * 5 : 0;

  const rotations: Record<string, number> = { right: 0, down: 90, left: 180, up: -90 };
  const rot = rotations[direction] || 0;

  return (
    <div style={{
      position: "absolute", ...position,
      opacity, transform: `scale(${s}) translateX(${bounceX}px) translateY(${bounceY}px)`,
      zIndex: 10, pointerEvents: "none",
    }}>
      <svg width={size} height={size} viewBox="0 0 48 48" style={{ transform: `rotate(${rot}deg)` }}>
        {/* Hand base */}
        <ellipse cx="18" cy="24" rx="12" ry="14" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        {/* Pointing finger */}
        <rect x="26" y="19" width="18" height="10" rx="5" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" />
        <circle cx="44" cy="24" r="2" fill="#3b82f6" />
        {/* Cuff */}
        <rect x="6" y="34" width="24" height="8" rx="4" fill="#3b82f6" opacity="0.8" />
      </svg>
    </div>
  );
};

// ─── Bouncing Emoji ───
export const BouncingEmoji: React.FC<{
  emoji: string;
  delay?: number;
  position?: { top?: number; right?: number; left?: number; bottom?: number };
  size?: number;
}> = ({ emoji, delay = 30, position = { top: 30, right: 40 }, size = 36 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 6, stiffness: 120, mass: 0.4 } });
  const opacity = interpolate(frame, [delay, delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bounce = Math.sin((frame - delay) * 0.1) * 6;
  const rotate = Math.sin((frame - delay) * 0.07) * 12;

  return (
    <div style={{
      position: "absolute", ...position,
      opacity, transform: `scale(${s}) translateY(${bounce}px) rotate(${rotate}deg)`,
      fontSize: size, zIndex: 10, pointerEvents: "none",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
    }}>
      {emoji}
    </div>
  );
};

// ─── Animated Underline / Highlight ───
export const CartoonUnderline: React.FC<{
  width?: number;
  delay?: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ width = 120, delay = 18, color = "#3b82f6", style: extraStyle }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <svg width={width} height="12" style={{ overflow: "visible", ...extraStyle }}>
      <path
        d={`M0,8 Q${width * 0.25},2 ${width * 0.5},8 Q${width * 0.75},14 ${width},6`}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={width * 1.5}
        strokeDashoffset={width * 1.5 * (1 - progress)}
        opacity="0.5"
      />
    </svg>
  );
};

// ─── Thought Cloud ───
export const ThoughtCloud: React.FC<{
  text?: string;
  delay?: number;
  position?: { top?: number; right?: number; left?: number; bottom?: number };
}> = ({ text, delay = 30, position = { top: 20, right: 50 } }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 80, mass: 0.6 } });
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const float = Math.sin((frame - delay) * 0.05) * 4;

  if (!text) return null;

  return (
    <div style={{
      position: "absolute", ...position,
      opacity, transform: `scale(${s}) translateY(${float}px)`,
      zIndex: 10, pointerEvents: "none",
    }}>
      <div style={{
        backgroundColor: "#f0f9ff", border: "2px solid #bfdbfe",
        borderRadius: 28, padding: "10px 16px",
        fontSize: 11, color: "#1e40af", fontWeight: 600,
        maxWidth: 160, textAlign: "center",
        boxShadow: "0 4px 12px rgba(59,130,246,0.08)",
      }}>
        {text}
      </div>
      {/* Cloud tail dots */}
      <div style={{ display: "flex", gap: 6, marginTop: 2, paddingLeft: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#bfdbfe" }} />
        <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#dbeafe", marginTop: 4 }} />
      </div>
    </div>
  );
};

// ─── Animated Arrow Connector ───
export const CartoonArrow: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay?: number;
  color?: string;
  curved?: boolean;
}> = ({ from, to, delay = 15, color = "#3b82f6", curved = true }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 30;

  const path = curved
    ? `M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`
    : `M${from.x},${from.y} L${to.x},${to.y}`;

  const length = 200; // approximate

  return (
    <svg style={{
      position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 5, overflow: "visible",
    }}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
        opacity="0.5"
      />
      {/* Arrow head */}
      {progress > 0.9 && (
        <polygon
          points={`${to.x},${to.y} ${to.x - 8},${to.y - 6} ${to.x - 6},${to.y + 6}`}
          fill={color}
          opacity="0.6"
        />
      )}
    </svg>
  );
};
