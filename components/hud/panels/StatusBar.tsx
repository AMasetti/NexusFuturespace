"use client";

import { useEffect, useState } from "react";
import { Settings, MapPin, Thermometer } from "lucide-react";
import { HudBadge } from "../core/HudBadge";

interface StatusBarProps {
  systemName: string;
  status: "online" | "offline" | "degraded";
  time?: Date;
  location?: string;
  temperature?: { value: number; unit: "C" | "F" };
  onSettings?: () => void;
}

export function StatusBar({
  systemName,
  status,
  time,
  location = "SECTOR-7 / BASE ALPHA",
  temperature,
  onSettings,
}: StatusBarProps) {
  const [now, setNow] = useState<Date>(() => time ?? new Date());

  useEffect(() => {
    if (time) {
      const raf = requestAnimationFrame(() => setNow(time));
      return () => cancelAnimationFrame(raf);
    }
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [time]);

  const badgeVariant =
    status === "online" ? "online" : status === "degraded" ? "warning" : "offline";

  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = now
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" })
    .toUpperCase();

  return (
    <div className="bg-hud-bg border-hud-border/60 flex w-full items-center justify-between border-b px-4 py-2">
      {/* Left: system name + status */}
      <div className="flex items-center gap-3">
        <span className="font-display text-hud-primary hud-glow-text text-xl font-bold tracking-wider">
          {systemName}
        </span>
        <HudBadge
          variant={badgeVariant}
          label={status.toUpperCase()}
          pulse={status === "online"}
          size="sm"
        />
      </div>

      {/* Center: clock */}
      <div className="bg-hud-surface border-hud-border/60 flex items-center gap-2 rounded-full border px-4 py-1">
        <span className="text-hud-primary font-mono text-sm font-bold tabular-nums">{timeStr}</span>
        <span className="bg-hud-border h-3 w-px" />
        <span className="text-hud-text-dim font-mono text-[10px]">{dateStr}</span>
      </div>

      {/* Right: temp + location + settings */}
      <div className="flex items-center gap-3">
        {temperature && (
          <div className="bg-hud-surface border-hud-border/50 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5">
            <Thermometer className="text-hud-warning h-3 w-3" />
            <span className="text-hud-text-bright font-mono text-xs">
              {temperature.value}°{temperature.unit}
            </span>
          </div>
        )}
        {location && (
          <div className="text-hud-text-dim flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="font-label text-[10px] tracking-widest uppercase">{location}</span>
          </div>
        )}
        <button
          className="border-hud-border/50 text-hud-text-dim hover:border-hud-primary hover:text-hud-primary rounded border p-1.5 transition-colors"
          onClick={onSettings}
          aria-label="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
