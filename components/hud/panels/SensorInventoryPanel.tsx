"use client";

import { cn } from "@/lib/utils";
import { HudPanel } from "../core/HudPanel";
import { HudStatusDot } from "../core/HudStatusDot";

export interface SensorEntry {
  symbol: string;        // periodic-table-style abbreviation e.g. "He", "Ne"
  id: string;            // sensor type label e.g. "IMU", "POT", "CURRENT"
  name?: string;         // full sensor name
  status?: "online" | "offline" | "warning" | "critical";
  value?: string;        // live reading e.g. "9.81 m/s²"
  address?: string;      // I2C address e.g. "0x68"
}

interface SensorInventoryPanelProps {
  sensors: SensorEntry[];
  title?: string;
}

const statusColors = {
  online:   { bg: "bg-hud-secondary/10",  border: "border-hud-secondary/50", text: "text-hud-secondary" },
  warning:  { bg: "bg-hud-warning/10",    border: "border-hud-warning/50",   text: "text-hud-warning"   },
  critical: { bg: "bg-hud-danger/10",     border: "border-hud-danger/50",    text: "text-hud-danger"    },
  offline:  { bg: "bg-hud-surface-2",     border: "border-hud-border",       text: "text-hud-text-dim"  },
};

function SensorTile({ sensor }: { sensor: SensorEntry }) {
  const status = sensor.status ?? "online";
  const { bg, border, text } = statusColors[status];

  return (
    <div className={cn(
      "flex items-center gap-2.5 p-2 rounded-sm border",
      bg, border,
      "transition-colors hover:brightness-125"
    )}>
      {/* Periodic-table tile */}
      <div className={cn(
        "flex-shrink-0 w-9 h-9 flex flex-col items-center justify-center rounded-sm border",
        bg, border
      )}>
        <span className={cn("font-mono text-sm font-bold leading-none", text)}>
          {sensor.symbol}
        </span>
        {sensor.address && (
          <span className="font-mono text-[6px] text-hud-text-dim/60 leading-none mt-0.5">
            {sensor.address}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("font-label text-[10px] uppercase tracking-widest font-semibold", text)}>
            {sensor.id}
          </span>
          <HudStatusDot status={status} size="sm" pulse={status === "online"} />
        </div>
        {sensor.name && (
          <div className="font-mono text-[8px] text-hud-text-dim truncate">{sensor.name}</div>
        )}
        {sensor.value && (
          <div className={cn("font-mono text-[9px] tabular-nums", text)}>{sensor.value}</div>
        )}
      </div>
    </div>
  );
}

export function SensorInventoryPanel({ sensors, title = "Sensor Inventory" }: SensorInventoryPanelProps) {
  const online   = sensors.filter((s) => (s.status ?? "online") === "online").length;
  const total    = sensors.length;

  return (
    <HudPanel title={title} status={online === total ? "online" : "warning"} cornerBrackets>
      <div className="p-3 flex flex-col gap-2">
        {/* Summary row */}
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[9px] text-hud-text-dim uppercase tracking-widest">
            {online}/{total} active
          </span>
          <div className="flex gap-1">
            {sensors.map((s, i) => (
              <span
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  (s.status ?? "online") === "online"  ? "bg-hud-secondary" :
                  (s.status ?? "online") === "warning" ? "bg-hud-warning"   :
                  (s.status ?? "online") === "critical"? "bg-hud-danger"    : "bg-hud-text-dim"
                )}
              />
            ))}
          </div>
        </div>

        {/* Sensor tiles */}
        <div className="flex flex-col gap-1.5">
          {sensors.map((sensor, i) => (
            <SensorTile key={i} sensor={sensor} />
          ))}
        </div>
      </div>
    </HudPanel>
  );
}
