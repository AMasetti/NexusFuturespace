"use client";

import { cn } from "@/lib/utils";

interface SonarPulseProps {
  active?: boolean;
  label?: string;
  color?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  rings?: number;
}

const colorMap = {
  primary:   { stroke: "var(--hud-primary)",   fill: "var(--hud-primary)" },
  secondary: { stroke: "var(--hud-secondary)", fill: "var(--hud-secondary)" },
};

const sizeMap = { sm: 120, md: 180, lg: 260 };

export function SonarPulse({
  active = true,
  label,
  color = "primary",
  size = "md",
  rings = 4,
}: SonarPulseProps) {
  const { stroke, fill } = colorMap[color];
  const px = sizeMap[size];
  const cx = px / 2;
  const maxR = cx - 8;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={px} height={px} className="overflow-visible">
        <defs>
          <filter id="sonar-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static grid lines */}
        <line x1={cx} y1={8} x2={cx} y2={px - 8} stroke={stroke} strokeOpacity={0.08} strokeWidth={1} />
        <line x1={8} y1={cx} x2={px - 8} y2={cx} stroke={stroke} strokeOpacity={0.08} strokeWidth={1} />
        <line x1={cx - maxR * 0.707} y1={cx - maxR * 0.707} x2={cx + maxR * 0.707} y2={cx + maxR * 0.707} stroke={stroke} strokeOpacity={0.05} strokeWidth={1} />
        <line x1={cx + maxR * 0.707} y1={cx - maxR * 0.707} x2={cx - maxR * 0.707} y2={cx + maxR * 0.707} stroke={stroke} strokeOpacity={0.05} strokeWidth={1} />

        {/* Static ring tracks */}
        {Array.from({ length: rings }, (_, i) => {
          const r = ((i + 1) / rings) * maxR;
          return (
            <circle
              key={i}
              cx={cx} cy={cx} r={r}
              fill="none"
              stroke={stroke}
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}

        {/* Animated pulse rings */}
        {active &&
          Array.from({ length: rings }, (_, i) => (
            <circle
              key={`pulse-${i}`}
              cx={cx} cy={cx}
              r={maxR * 0.3}
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
              strokeOpacity={0.7}
              style={{
                animation: `sonar-ring 2s ease-out ${i * 0.5}s infinite`,
                transformOrigin: `${cx}px ${cx}px`,
              }}
            />
          ))}

        {/* Center dot */}
        <circle
          cx={cx} cy={cx} r={5}
          fill={fill}
          filter="url(#sonar-glow)"
          opacity={active ? 1 : 0.3}
        />
        <circle cx={cx} cy={cx} r={2} fill={fill} />
      </svg>

      {label && (
        <span
          className={cn(
            "font-label text-xs uppercase tracking-widest",
            active ? "text-hud-primary" : "text-hud-text-dim"
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}
