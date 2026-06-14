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
        "border-hud-border relative flex flex-col overflow-hidden rounded-sm border",
        variant === "default" && "hud-panel-bg",
        variant === "ghost" && "bg-transparent",
        variant === "elevated" && "hud-panel-bg hud-glow-box",
        glowing && "hud-glow-box",
        flickering && "animate-hud-flicker",
        cornerBrackets && "hud-corners",
        className
      )}
    >
      {scanlines && <div className="hud-scanlines pointer-events-none absolute inset-0 z-10" />}

      {(title || status) && (
        <div className="border-hud-border/60 flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            {status && <HudStatusDot status={status} size="sm" pulse />}
            {title && (
              <span className="font-label text-hud-text-bright text-xs font-bold tracking-widest uppercase">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="font-label text-hud-text-dim/60 ml-1 text-xs">· {subtitle}</span>
            )}
          </div>
        </div>
      )}

      <div className="relative z-0 min-h-0 flex-1">{children}</div>
    </div>
  );
}
