"use client";

import { cn } from "@/lib/utils";
import { HudPanel } from "../core/HudPanel";
import { HudBadge } from "../core/HudBadge";

interface Hotspot {
  position: { x: number; y: number };
  label: string;
  status?: "ok" | "warning" | "critical";
}

interface SuitViewerProps {
  label?: string;
  imageUrl?: string;
  status?: "active" | "standby" | "critical" | "offline";
  hotspots?: Hotspot[];
  metrics?: { label: string; value: string }[];
  variant?: "front" | "side" | "back";
}

const statusToVariant = {
  active:  "online",
  standby: "neutral",
  critical:"critical",
  offline: "offline",
} as const;

const hotspotColor = {
  ok:       "var(--hud-secondary)",
  warning:  "var(--hud-warning)",
  critical: "var(--hud-danger)",
};

export function SuitViewer({
  label = "UNIT ALPHA",
  imageUrl,
  status = "active",
  hotspots = [],
  metrics = [],
  variant = "front",
}: SuitViewerProps) {
  return (
    <HudPanel title={label} cornerBrackets>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-label text-[10px] uppercase tracking-widest text-hud-text-dim">{variant} view</span>
          <HudBadge variant={statusToVariant[status]} label={status.toUpperCase()} pulse={status === "active"} size="sm" />
        </div>

        {/* Viewport */}
        <div className="relative w-full aspect-[3/4] bg-hud-surface-2 border border-hud-border/50 rounded-sm overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="w-full h-full object-contain opacity-70" />
          ) : (
            /* Placeholder silhouette */
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 60 100" className="h-4/5 opacity-30" fill="none" stroke="var(--hud-primary)" strokeWidth="1">
                <circle cx="30" cy="12" r="9" />
                <path d="M20 22 Q15 30 14 45 H46 Q45 30 40 22 Z" />
                <path d="M14 45 Q10 55 12 70 H20 L22 45" />
                <path d="M46 45 Q50 55 48 70 H40 L38 45" />
                <path d="M20 70 Q18 85 20 98 H26 L28 70" />
                <path d="M40 70 Q42 85 40 98 H34 L32 70" />
              </svg>
            </div>
          )}

          {/* Hotspots */}
          {hotspots.map((hs, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: `${hs.position.x}%`, top: `${hs.position.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full border"
                style={{
                  background: hotspotColor[hs.status ?? "ok"] + "40",
                  borderColor: hotspotColor[hs.status ?? "ok"],
                  boxShadow: `0 0 4px ${hotspotColor[hs.status ?? "ok"]}`,
                }}
              />
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[7px] px-1"
                style={{ color: hotspotColor[hs.status ?? "ok"] }}
              >
                {hs.label}
              </div>
            </div>
          ))}
        </div>

        {/* Metrics strip */}
        {metrics.length > 0 && (
          <div className="flex gap-3 border-t border-hud-border/40 pt-2 flex-wrap">
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="font-mono text-xs font-bold text-hud-primary">{m.value}</span>
                <span className="font-label text-[8px] uppercase tracking-widest text-hud-text-dim">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
