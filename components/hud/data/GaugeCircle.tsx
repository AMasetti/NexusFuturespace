"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface GaugeCircleProps {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "warning" | "danger";
  animated?: boolean;
}

const colorMap = {
  primary:   { stroke: "var(--hud-primary)",   glow: "var(--hud-primary)" },
  secondary: { stroke: "var(--hud-secondary)",  glow: "var(--hud-secondary)" },
  warning:   { stroke: "var(--hud-warning)",    glow: "var(--hud-warning)" },
  danger:    { stroke: "var(--hud-danger)",     glow: "var(--hud-danger)" },
};

const sizeMap = {
  sm: { px: 80,  strokeW: 5,  fontSize: 14, labelSize: 8 },
  md: { px: 120, strokeW: 7,  fontSize: 22, labelSize: 10 },
  lg: { px: 160, strokeW: 9,  fontSize: 32, labelSize: 12 },
};

export function GaugeCircle({
  value,
  max = 100,
  label,
  unit = "%",
  size = "md",
  color = "primary",
  animated = false,
}: GaugeCircleProps) {
  const { px, strokeW, fontSize, labelSize } = sizeMap[size];
  const { stroke, glow } = colorMap[color];

  const radius = (px - strokeW * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);

  useEffect(() => {
    if (!animated) { setDisplayValue(value); return; }
    let start: number | null = null;
    const initial = 0;
    const duration = 1200;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplayValue(Math.round(initial + (value - initial) * progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, animated]);

  const pct = Math.min(Math.max(displayValue / max, 0), 1);
  const offset = circumference * (1 - pct);
  const cx = px / 2;
  const cy = px / 2;

  const ticks = 12;

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: px }}>
      <svg width={px} height={px} className="overflow-visible">
        <defs>
          <filter id={`glow-${color}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Tick marks */}
        {Array.from({ length: ticks }, (_, i) => {
          const angle = (i / ticks) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const r1 = radius + strokeW + 4;
          const r2 = radius + strokeW + 9;
          return (
            <line
              key={i}
              x1={cx + r1 * Math.cos(rad)}
              y1={cy + r1 * Math.sin(rad)}
              x2={cx + r2 * Math.cos(rad)}
              y2={cy + r2 * Math.sin(rad)}
              stroke="var(--hud-border)"
              strokeWidth={1}
            />
          );
        })}

        {/* Track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="var(--hud-border)"
          strokeWidth={strokeW}
        />

        {/* Fill */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          filter={`url(#glow-${color})`}
          style={{ transition: animated ? "stroke-dashoffset 0.1s linear" : "none" }}
        />

        {/* Value */}
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          fill={stroke}
          fontSize={fontSize}
          fontFamily="var(--font-mono)"
          fontWeight="700"
        >
          {displayValue}
          <tspan fontSize={fontSize * 0.45} fill="var(--hud-text-dim)">{unit}</tspan>
        </text>

        {/* Label */}
        <text
          x={cx} y={cy + labelSize + 4}
          textAnchor="middle"
          fill="var(--hud-text-dim)"
          fontSize={labelSize}
          fontFamily="var(--font-label)"
          letterSpacing="0.1em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
