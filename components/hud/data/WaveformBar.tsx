"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface WaveformBarProps {
  data?: number[];
  color?: "primary" | "secondary" | "warning";
  animated?: boolean;
  label?: string;
  height?: number;
}

const colorMap = {
  primary:   "var(--hud-primary)",
  secondary: "var(--hud-secondary)",
  warning:   "var(--hud-warning)",
};

export function WaveformBar({
  data,
  color = "primary",
  animated = false,
  label,
  height = 60,
}: WaveformBarProps) {
  const bars = 40;
  const [values, setValues] = useState<number[]>(
    data ?? Array.from({ length: bars }, () => Math.random() * 80 + 10)
  );
  const rafRef = useRef<number>(0);
  const stroke = colorMap[color];

  useEffect(() => {
    if (!animated) return;
    const tick = () => {
      setValues((prev) =>
        prev.map((v) => {
          const delta = (Math.random() - 0.5) * 20;
          return Math.min(95, Math.max(5, v + delta));
        })
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    // Throttle to ~10fps for performance
    let last = 0;
    const throttled = (ts: number) => {
      if (ts - last > 100) { last = ts; tick(); }
      rafRef.current = requestAnimationFrame(throttled);
    };
    rafRef.current = requestAnimationFrame(throttled);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animated]);

  const width = 100;
  const barWidth = width / bars - 0.5;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="font-label text-[9px] uppercase tracking-widest text-hud-text-dim">
          {label}
        </span>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height }}
      >
        {values.map((v, i) => {
          const h = (v / 100) * height;
          const x = i * (barWidth + 0.5);
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - h}
                width={barWidth}
                height={h}
                fill={stroke}
                fillOpacity={0.25}
              />
              <rect
                x={x}
                y={height - h}
                width={barWidth}
                height={1.5}
                fill={stroke}
                fillOpacity={0.9}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
