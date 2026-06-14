"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { HudPanel } from "../core/HudPanel";
import { HudProgressBar } from "../data/HudProgressBar";

interface SystemStatsCardProps {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
  live?: boolean;
  refreshInterval?: number;
}

export function SystemStatsCard({
  cpu: initialCpu,
  ram: initialRam,
  disk: initialDisk,
  live = false,
  refreshInterval = 2000,
}: SystemStatsCardProps) {
  const [cpu, setCpu] = useState(initialCpu);
  const [ram, setRam] = useState(initialRam);
  const [disk] = useState(initialDisk);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setCpu(Math.round(Math.max(5, Math.min(95, cpu + (Math.random() - 0.5) * 15))));
      setRam((r) => ({
        ...r,
        used: parseFloat(
          Math.max(1, Math.min(r.total, r.used + (Math.random() - 0.5) * 1)).toFixed(1)
        ),
      }));
    }, refreshInterval);
    return () => clearInterval(id);
  }, [live, cpu, refreshInterval]);

  const ramPct = Math.round((ram.used / ram.total) * 100);
  const diskPct = Math.round((disk.used / disk.total) * 100);

  return (
    <HudPanel title="System Stats" status="online" cornerBrackets>
      <div className="flex flex-col gap-3 p-3">
        <HudProgressBar
          label="CPU"
          value={cpu}
          color={cpu > 80 ? "danger" : cpu > 60 ? "warning" : "primary"}
          animated
          showValue
        />
        <HudProgressBar label="RAM" value={ramPct} unit="%" color="secondary" animated showValue />
        <HudProgressBar label="DISK" value={diskPct} unit="%" color="primary" animated showValue />

        <div className="border-hud-border/40 grid grid-cols-3 gap-2 border-t pt-1">
          {[
            { label: "CPU", value: `${cpu}%` },
            { label: "MEM", value: `${ramPct}%` },
            { label: "DSK", value: `${diskPct}%` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-hud-primary font-mono text-sm font-bold">{value}</span>
              <span className="font-label text-hud-text-dim text-[9px] tracking-widest uppercase">
                {label}
              </span>
            </div>
          ))}
        </div>

        {live && (
          <div className="flex items-center justify-end gap-1">
            <RefreshCw
              className="text-hud-text-dim h-2.5 w-2.5 animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <span className="text-hud-text-dim font-mono text-[8px]">LIVE</span>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
