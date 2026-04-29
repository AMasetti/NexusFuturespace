"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Power } from "lucide-react";
import { HudPanel } from "../core/HudPanel";
import { cn } from "@/lib/utils";

interface CameraFeedProps {
  active?: boolean;
  stream?: MediaStream;
  label?: string;
  onToggle?: () => void;
  resolution?: string;
  fps?: number;
}

export function CameraFeed({
  active: initialActive = false,
  stream,
  label = "CAM-01",
  onToggle,
  resolution = "1920×1080",
  fps = 30,
}: CameraFeedProps) {
  const [active, setActive] = useState(initialActive);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream && active) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, active]);

  const toggle = () => {
    setActive((a) => !a);
    onToggle?.();
  };

  return (
    <HudPanel title="Camera" status={active ? "online" : "offline"} cornerBrackets>
      <div className="p-3 flex flex-col gap-2">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <span className="font-label text-[10px] uppercase tracking-widest text-hud-text-dim">{label}</span>
          <div className="flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-hud-text-dim" />
            <button
              className={cn(
                "p-1 rounded border transition-colors",
                active
                  ? "border-hud-danger/60 text-hud-danger hover:bg-hud-danger/10"
                  : "border-hud-border text-hud-text-dim hover:border-hud-primary hover:text-hud-primary"
              )}
              onClick={toggle}
              aria-label={active ? "Turn off camera" : "Turn on camera"}
            >
              <Power className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative w-full aspect-video bg-hud-surface-2 border border-hud-border/50 rounded-sm overflow-hidden flex items-center justify-center">
          {active && stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : active ? (
            /* Simulated feed */
            <div className="absolute inset-0 hud-scanlines">
              <div className="w-full h-full bg-gradient-to-br from-hud-surface-2 to-hud-bg" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="w-4 h-4 rounded-full bg-hud-danger animate-hud-pulse mx-auto mb-1" />
                <span className="font-mono text-[8px] text-hud-danger">RECORDING</span>
              </div>
              {/* Crosshair */}
              <div className="absolute inset-0">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-hud-primary/10" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-hud-primary/10" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-hud-text-dim">
              <Camera className="w-8 h-8 opacity-30" />
              <span className="font-label text-xs uppercase tracking-widest">Camera Off</span>
            </div>
          )}

          {/* Overlay */}
          {active && (
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
              <span className="font-mono text-[7px] text-hud-primary/70 bg-hud-bg/60 px-1 py-0.5 rounded">{resolution}</span>
              <span className="font-mono text-[7px] text-hud-primary/70 bg-hud-bg/60 px-1 py-0.5 rounded">{fps} FPS</span>
            </div>
          )}
        </div>

        <span className="font-label text-[8px] text-hud-text-dim uppercase tracking-widest text-center">
          {active ? "Feed active · Click power to disable" : "Click power to enable camera"}
        </span>
      </div>
    </HudPanel>
  );
}
