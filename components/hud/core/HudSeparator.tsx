"use client";

import { cn } from "@/lib/utils";

interface HudSeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
  bright?: boolean;
}

export function HudSeparator({
  orientation = "horizontal",
  className,
  bright = false,
}: HudSeparatorProps) {
  return (
    <div
      role="separator"
      className={cn(
        orientation === "horizontal" ? "w-full h-px" : "h-full w-px",
        bright ? "bg-hud-border-bright" : "bg-hud-border",
        className
      )}
    />
  );
}
