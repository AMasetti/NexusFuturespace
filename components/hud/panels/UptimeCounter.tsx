"use client";

import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import { HudPanel } from "../core/HudPanel";
import { HudProgressBar } from "../data/HudProgressBar";

interface UptimeCounterProps {
  startTime: Date | string;
  label?: string;
  sessions?: number;
  commands?: number;
  systemLoad?: number;
  live?: boolean;
}

function formatUptime(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const h  = Math.floor(totalSecs / 3600);
  const m  = Math.floor((totalSecs % 3600) / 60);
  const s  = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function UptimeCounter({
  startTime,
  label = "System Uptime",
  sessions = 1,
  commands = 0,
  systemLoad = 42,
  live = true,
}: UptimeCounterProps) {
  const start = new Date(startTime).getTime();
  const [elapsed, setElapsed] = useState(Date.now() - start);
  const [cmdCount, setCmdCount] = useState(commands);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - start);
      if (Math.random() > 0.8) setCmdCount((c) => c + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [live, start]);

  return (
    <HudPanel title={label} status="online" cornerBrackets>
      <div className="p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-2xl font-bold text-hud-primary hud-glow-text tabular-nums">
            {formatUptime(elapsed)}
          </span>
          <Maximize2 className="w-3.5 h-3.5 text-hud-text-dim" />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-hud-border/40 pt-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-sm font-bold text-hud-secondary">{sessions}</span>
            <span className="font-label text-[9px] uppercase tracking-widest text-hud-text-dim">Sessions</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-sm font-bold text-hud-primary">{cmdCount.toLocaleString()}</span>
            <span className="font-label text-[9px] uppercase tracking-widest text-hud-text-dim">Commands</span>
          </div>
        </div>

        <HudProgressBar
          label="System Load"
          value={systemLoad}
          color={systemLoad > 80 ? "danger" : systemLoad > 60 ? "warning" : "secondary"}
          showValue
        />
      </div>
    </HudPanel>
  );
}
