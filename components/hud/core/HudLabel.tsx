"use client";

import { cn } from "@/lib/utils";

interface HudLabelProps {
  text: string;
  variant?: "primary" | "secondary" | "dim" | "danger" | "warning";
  mono?: boolean;
  glow?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const variantColor = {
  primary:   "text-hud-primary",
  secondary: "text-hud-secondary",
  dim:       "text-hud-text-dim",
  danger:    "text-hud-danger",
  warning:   "text-hud-warning",
};

const sizeClass = {
  xs: "text-[9px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

export function HudLabel({
  text,
  variant = "primary",
  mono = false,
  glow = false,
  size = "sm",
}: HudLabelProps) {
  return (
    <span
      className={cn(
        "uppercase tracking-widest",
        mono ? "font-mono" : "font-label",
        variantColor[variant],
        sizeClass[size],
        glow && (variant === "secondary" ? "hud-glow-text-green" : "hud-glow-text")
      )}
    >
      {text}
    </span>
  );
}
