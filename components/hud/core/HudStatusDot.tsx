"use client";

import { cn } from "@/lib/utils";

interface HudStatusDotProps {
  status: "online" | "offline" | "warning" | "critical";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const colorMap = {
  online:   "bg-hud-secondary shadow-[0_0_6px_var(--hud-secondary)]",
  offline:  "bg-hud-text-dim",
  warning:  "bg-hud-warning shadow-[0_0_6px_var(--hud-warning)]",
  critical: "bg-hud-danger shadow-[0_0_6px_var(--hud-danger)]",
};

const sizeMap = {
  sm: "w-1.5 h-1.5",
  md: "w-2.5 h-2.5",
  lg: "w-4 h-4",
};

export function HudStatusDot({ status, size = "md", pulse = false }: HudStatusDotProps) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {pulse && (status === "online" || status === "critical") && (
        <span
          className={cn(
            "absolute rounded-full animate-hud-pulse opacity-60",
            sizeMap[size],
            status === "online" ? "bg-hud-secondary" : "bg-hud-danger"
          )}
          style={{ transform: "scale(1.8)" }}
        />
      )}
      <span className={cn("rounded-full inline-block", colorMap[status], sizeMap[size])} />
    </span>
  );
}
