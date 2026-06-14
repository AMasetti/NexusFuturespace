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
  primary: { fill: "bg-hud-primary", glow: "shadow-[0_0_8px_var(--hud-primary)]" },
  secondary: { fill: "bg-hud-secondary", glow: "shadow-[0_0_8px_var(--hud-secondary)]" },
  warning: { fill: "bg-hud-warning", glow: "shadow-[0_0_8px_var(--hud-warning)]" },
  danger: { fill: "bg-hud-danger", glow: "shadow-[0_0_8px_var(--hud-danger)]" },
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
    if (!animated) {
      const raf = requestAnimationFrame(() => setWidth(value));
      return () => cancelAnimationFrame(raf);
    }
    const timeout = setTimeout(() => setWidth(value), 50);
    return () => clearTimeout(timeout);
  }, [value, animated]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-label text-hud-text-dim text-[10px] tracking-widest uppercase">
          {label}
        </span>
        {showValue && (
          <span className="text-hud-text font-mono text-[10px]">
            {value}
            {unit}
          </span>
        )}
      </div>
      <div className="bg-hud-border h-1 w-full overflow-hidden rounded-full">
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
