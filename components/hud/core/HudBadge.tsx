"use client";

import { cn } from "@/lib/utils";

interface HudBadgeProps {
  variant: "online" | "offline" | "warning" | "critical" | "info" | "neutral";
  label: string;
  pulse?: boolean;
  size?: "sm" | "md";
}

const variantStyles = {
  online:   { border: "border-hud-secondary", text: "text-hud-secondary", dot: "bg-hud-secondary" },
  offline:  { border: "border-hud-text-dim",  text: "text-hud-text-dim",  dot: "bg-hud-text-dim" },
  warning:  { border: "border-hud-warning",   text: "text-hud-warning",   dot: "bg-hud-warning" },
  critical: { border: "border-hud-danger",    text: "text-hud-danger",    dot: "bg-hud-danger" },
  info:     { border: "border-hud-primary",   text: "text-hud-primary",   dot: "bg-hud-primary" },
  neutral:  { border: "border-hud-border",    text: "text-hud-text",      dot: "bg-hud-text" },
};

export function HudBadge({ variant, label, pulse = false, size = "md" }: HudBadgeProps) {
  const styles = variantStyles[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 font-label uppercase tracking-widest",
        styles.border,
        styles.text,
        size === "sm" ? "py-0.5 text-[9px]" : "py-1 text-[10px]"
      )}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          styles.dot,
          size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5",
          pulse && "animate-hud-pulse"
        )}
      />
      {label}
    </span>
  );
}
