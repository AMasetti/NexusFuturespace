"use client";

import { Cloud, Droplets, Wind, Thermometer } from "lucide-react";
import { HudPanel } from "../core/HudPanel";

interface WeatherCardProps {
  temperature: number;
  unit?: "C" | "F";
  city: string;
  condition: string;
  humidity: number;
  wind: number;
  feelsLike: number;
  icon?: string;
}

export function WeatherCard({
  temperature,
  unit = "C",
  city,
  condition,
  humidity,
  wind,
  feelsLike,
}: WeatherCardProps) {
  return (
    <HudPanel title="Weather" status="online" cornerBrackets>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-4xl font-bold text-hud-primary hud-glow-text leading-none">
              {temperature}°{unit}
            </div>
            <div className="font-label text-xs uppercase tracking-widest text-hud-text mt-1">{city}</div>
            <div className="font-label text-[10px] text-hud-text-dim mt-0.5">{condition}</div>
          </div>
          <Cloud className="w-10 h-10 text-hud-text-dim mt-1" />
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-hud-border/40 pt-2">
          <div className="flex flex-col items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-hud-primary" />
            <span className="font-mono text-xs text-hud-text-bright">{humidity}%</span>
            <span className="font-label text-[9px] uppercase tracking-widest text-hud-text-dim">Humidity</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-hud-secondary" />
            <span className="font-mono text-xs text-hud-text-bright">{wind} m/s</span>
            <span className="font-label text-[9px] uppercase tracking-widest text-hud-text-dim">Wind</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-hud-warning" />
            <span className="font-mono text-xs text-hud-text-bright">{feelsLike}°</span>
            <span className="font-label text-[9px] uppercase tracking-widest text-hud-text-dim">Feels</span>
          </div>
        </div>
      </div>
    </HudPanel>
  );
}
