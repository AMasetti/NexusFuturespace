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
  /** When provided, the panel body animates open/closed via CSS grid-template-rows. */
  collapsed?: boolean;
  /** When provided, the header becomes clickable and shows a chevron toggle. */
  onToggle?: () => void;
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
  collapsed,
  onToggle,
}: HudPanelProps) {
  const collapsible = onToggle !== undefined;

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
        <div
          className={cn(
            "border-hud-border/60 flex items-center justify-between border-b px-3 py-2",
            collapsible && "cursor-pointer select-none"
          )}
          style={collapsible ? { touchAction: "manipulation" } : undefined}
          onClick={collapsible ? onToggle : undefined}
        >
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
          {collapsible && (
            <svg
              width={14}
              height={14}
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
              style={{
                flexShrink: 0,
                color: "rgba(0,200,255,0.55)",
                transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 220ms ease",
              }}
            >
              <path
                d="M2 4.5L7 9.5L12 4.5"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}

      {collapsible ? (
        <div
          style={{
            display: "grid",
            gridTemplateRows: collapsed ? "0fr" : "1fr",
            transition: "grid-template-rows 220ms ease",
          }}
        >
          <div style={{ overflow: collapsed ? "hidden" : "visible" }}>
            <div className="relative z-0 min-h-0 flex-1">{children}</div>
          </div>
        </div>
      ) : (
        <div className="relative z-0 min-h-0 flex-1">{children}</div>
      )}
    </div>
  );
}
