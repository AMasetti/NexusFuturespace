"use client";

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
  active: "online",
  standby: "neutral",
  critical: "critical",
  offline: "offline",
} as const;

const hotspotColor = {
  ok: "var(--hud-secondary)",
  warning: "var(--hud-warning)",
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
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="font-label text-hud-text-dim text-[10px] tracking-widest uppercase">
            {variant} view
          </span>
          <HudBadge
            variant={statusToVariant[status]}
            label={status.toUpperCase()}
            pulse={status === "active"}
            size="sm"
          />
        </div>

        {/* Viewport */}
        <div className="bg-hud-surface-2 border-hud-border/50 relative aspect-[3/4] w-full overflow-hidden rounded-sm border">
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="h-full w-full object-contain opacity-70" />
          ) : (
            /* Placeholder silhouette */
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 60 100"
                className="h-4/5 opacity-30"
                fill="none"
                stroke="var(--hud-primary)"
                strokeWidth="1"
              >
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
              style={{
                left: `${hs.position.x}%`,
                top: `${hs.position.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="h-2.5 w-2.5 rounded-full border"
                style={{
                  background: hotspotColor[hs.status ?? "ok"] + "40",
                  borderColor: hotspotColor[hs.status ?? "ok"],
                  boxShadow: `0 0 4px ${hotspotColor[hs.status ?? "ok"]}`,
                }}
              />
              <div
                className="absolute top-1/2 left-3 -translate-y-1/2 px-1 font-mono text-[7px] whitespace-nowrap"
                style={{ color: hotspotColor[hs.status ?? "ok"] }}
              >
                {hs.label}
              </div>
            </div>
          ))}
        </div>

        {/* Metrics strip */}
        {metrics.length > 0 && (
          <div className="border-hud-border/40 flex flex-wrap gap-3 border-t pt-2">
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-hud-primary font-mono text-xs font-bold">{m.value}</span>
                <span className="font-label text-hud-text-dim text-[8px] tracking-widest uppercase">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
