"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HudProgressBarProps {
  label: string;
  value: number;
  unit?: string;
  color?: "primary" | "secondary" | "warning" | "danger";
  animated?: boolean;
  showValue?: boolean;
}

const colorMap = {
  primary:   { fill: "bg-hud-primary",   glow: "shadow-[0_0_8px_var(--hud-primary)]" },
  secondary: { fill: "bg-hud-secondary", glow: "shadow-[0_0_8px_var(--hud-secondary)]" },
  warning:   { fill: "bg-hud-warning",   glow: "shadow-[0_0_8px_var(--hud-warning)]" },
  danger:    { fill: "bg-hud-danger",    glow: "shadow-[0_0_8px_var(--hud-danger)]" },
};

export function HudProgressBar({
  label,
  value,
  unit = "%",
  color = "primary",
  animated = false,
  showValue = true,
}: HudProgressBarProps) {
  const [width, setWidth] = useState(animated ? 0 : value);
  const { fill, glow } = colorMap[color];

  useEffect(() => {
    if (!animated) { setWidth(value); return; }
    const timeout = setTimeout(() => setWidth(value), 50);
    return () => clearTimeout(timeout);
  }, [value, animated]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="font-label text-[10px] uppercase tracking-widest text-hud-text-dim">
          {label}
        </span>
        {showValue && (
          <span className="font-mono text-[10px] text-hud-text">
            {value}{unit}
          </span>
        )}
      </div>
      <div className="h-1 w-full rounded-full bg-hud-border overflow-hidden">
        <div
          className={cn("h-full rounded-full", fill, glow)}
          style={{
            width: `${width}%`,
            transition: animated ? "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          }}
        />
      </div>
    </div>
  );
}
