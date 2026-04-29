"use client";

import { cn } from "@/lib/utils";
import { HudStatusDot } from "./HudStatusDot";

interface HudPanelProps {
  title?: string;
  subtitle?: string;
  status?: "online" | "offline" | "warning" | "critical";
  variant?: "default" | "ghost" | "elevated";
  glowing?: boolean;
  flickering?: boolean;
  scanlines?: boolean;
  cornerBrackets?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function HudPanel({
  title,
  subtitle,
  status,
  variant = "default",
  glowing = false,
  flickering = false,
  scanlines = false,
  cornerBrackets = true,
  className,
  children,
}: HudPanelProps) {
  return (
    <div
      className={cn(
        "relative rounded-sm border border-hud-border overflow-hidden",
        variant === "default" && "bg-hud-surface/90",
        variant === "ghost" && "bg-transparent",
        variant === "elevated" && "bg-hud-surface/90 hud-glow-box",
        glowing && "hud-glow-box",
        flickering && "animate-hud-flicker",
        cornerBrackets && "hud-corners",
        className
      )}
    >
      {scanlines && (
        <div className="absolute inset-0 pointer-events-none hud-scanlines z-10" />
      )}

      {(title || status) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-hud-border/60">
          <div className="flex items-center gap-2">
            {status && <HudStatusDot status={status} size="sm" pulse />}
            {title && (
              <span className="font-label text-xs uppercase tracking-widest text-hud-text-dim">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="font-label text-xs text-hud-text-dim/60 ml-1">
                · {subtitle}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative z-0">{children}</div>
    </div>
  );
}
