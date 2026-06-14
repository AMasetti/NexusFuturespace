"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TopographyMapProps {
  gridSize?: number;
  contourLines?: boolean;
  highlighted?: number[];
  coordinates?: { lat: string; lng: string };
  timestamp?: string;
}

export function TopographyMap({
  gridSize = 8,
  contourLines = true,
  highlighted = [],
  coordinates = { lat: "40.7128° N", lng: "74.0060° W" },
  timestamp,
}: TopographyMapProps) {
  const [grid, setGrid] = useState<number[]>(() =>
    Array.from({ length: gridSize * gridSize }, () => 0.5)
  );
  const [now, setNow] = useState<string>(timestamp ?? "");

  useEffect(() => {
    const newGrid = Array.from({ length: gridSize * gridSize }, () => Math.random());
    const newNow = timestamp ?? new Date().toISOString().slice(0, 19).replace("T", " ");
    const raf = requestAnimationFrame(() => {
      setGrid(newGrid);
      setNow(newNow);
    });
    return () => cancelAnimationFrame(raf);
  }, [gridSize, timestamp]);

  return (
    <div className="border-hud-border bg-hud-surface relative rounded-sm border p-3">
      {/* Compass */}
      <div className="absolute top-2 left-2 flex flex-col items-center gap-0.5">
        {["N", "E", "S", "W"].map((d) => (
          <span key={d} className="text-hud-text-dim font-mono text-[8px] leading-none">
            {d}
          </span>
        ))}
      </div>

      {/* Coordinates + timestamp */}
      <div className="absolute top-2 right-2 text-right">
        <div className="text-hud-primary font-mono text-[8px]">{coordinates.lat}</div>
        <div className="text-hud-primary font-mono text-[8px]">{coordinates.lng}</div>
        <div className="text-hud-text-dim mt-1 font-mono text-[7px]">{now}</div>
      </div>

      {/* Grid */}
      <div
        className="mt-4 grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
        {grid.map((val, i) => {
          const isHighlighted = highlighted.includes(i);
          const opacity = 0.15 + val * 0.55;
          return (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-[1px] border",
                isHighlighted ? "border-hud-primary bg-hud-primary/20" : "border-hud-border/30"
              )}
              style={!isHighlighted ? { background: `rgba(0, 200, 255, ${opacity * 0.25})` } : {}}
            />
          );
        })}
      </div>

      {/* Contour overlay */}
      {contourLines && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm opacity-20">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {[20, 35, 50, 65, 80].map((y, i) => (
              <path
                key={i}
                d={`M 0 ${y} Q 25 ${y - 8 + Math.sin(i) * 10} 50 ${y + 5} Q 75 ${y + 12} 100 ${y - 3}`}
                fill="none"
                stroke="var(--hud-primary)"
                strokeWidth={0.5}
                strokeOpacity={0.8}
              />
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
