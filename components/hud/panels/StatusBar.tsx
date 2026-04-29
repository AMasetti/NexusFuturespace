"use client";

import { useEffect, useState } from "react";
import { Settings, MapPin, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [now, setNow] = useState(time ?? new Date());

  useEffect(() => {
    if (time) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [time]);

  const badgeVariant = status === "online" ? "online" : status === "degraded" ? "warning" : "offline";

  const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }).toUpperCase();

  return (
    <div className="w-full flex items-center justify-between px-4 py-2 bg-hud-bg border-b border-hud-border/60">
      {/* Left: system name + status */}
      <div className="flex items-center gap-3">
        <span className="font-display text-xl font-bold text-hud-primary hud-glow-text tracking-wider">
          {systemName}
        </span>
        <HudBadge variant={badgeVariant} label={status.toUpperCase()} pulse={status === "online"} size="sm" />
      </div>

      {/* Center: clock */}
      <div className="flex items-center gap-2 bg-hud-surface border border-hud-border/60 rounded-full px-4 py-1">
        <span className="font-mono text-sm font-bold text-hud-primary tabular-nums">{timeStr}</span>
        <span className="w-px h-3 bg-hud-border" />
        <span className="font-mono text-[10px] text-hud-text-dim">{dateStr}</span>
      </div>

      {/* Right: temp + location + settings */}
      <div className="flex items-center gap-3">
        {temperature && (
          <div className="flex items-center gap-1.5 bg-hud-surface border border-hud-border/50 rounded-full px-2.5 py-0.5">
            <Thermometer className="w-3 h-3 text-hud-warning" />
            <span className="font-mono text-xs text-hud-text-bright">
              {temperature.value}°{temperature.unit}
            </span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-1 text-hud-text-dim">
            <MapPin className="w-3 h-3" />
            <span className="font-label text-[10px] uppercase tracking-widest">{location}</span>
          </div>
        )}
        <button
          className="p-1.5 rounded border border-hud-border/50 text-hud-text-dim hover:border-hud-primary hover:text-hud-primary transition-colors"
          onClick={onSettings}
          aria-label="Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
