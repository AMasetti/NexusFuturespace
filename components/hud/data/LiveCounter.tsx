"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LiveCounterProps {
  value: number;
  label: string;
  unit?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "warning" | "danger";
  animated?: boolean;
  live?: boolean;
}

const colorMap = {
  primary: { text: "text-hud-primary", glow: "hud-glow-text" },
  secondary: { text: "text-hud-secondary", glow: "hud-glow-text-green" },
  warning: { text: "text-hud-warning", glow: "" },
  danger: { text: "text-hud-danger", glow: "" },
};

const sizeMap = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

export function LiveCounter({
  value,
  label,
  unit,
  size = "lg",
  color = "primary",
  animated = false,
  live = false,
}: LiveCounterProps) {
  const [display, setDisplay] = useState(animated ? 0 : value);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const { text, glow } = colorMap[color];

  useEffect(() => {
    if (!animated) {
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    let start: number | null = null;
    const duration = 1000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(value * progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, animated]);

  useEffect(() => {
    if (!live) return;
    intervalRef.current = setInterval(() => {
      const jitter = Math.floor((Math.random() - 0.5) * (value * 0.04));
      setDisplay(value + jitter);
    }, 1500);
    return () => clearInterval(intervalRef.current);
  }, [value, live]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("font-mono font-bold tabular-nums", sizeMap[size], text, glow)}>
        {display.toLocaleString()}
        {unit && <span className="text-hud-text-dim ml-1 text-[0.45em]">{unit}</span>}
      </span>
      <span className="font-label text-hud-text-dim text-[10px] tracking-widest uppercase">
        {label}
      </span>
    </div>
  );
}
