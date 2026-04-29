"use client";

import { Truck, Cog, Radio, Bot, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { HudPanel } from "../core/HudPanel";
import { HudStatusDot } from "../core/HudStatusDot";
import { HudProgressBar } from "../data/HudProgressBar";

interface VolumeBar {
  label: string;
  value: number;
  max: number;
}

interface VehicleStatusCardProps {
  id: string;
  vehicleType: "excavator" | "truck" | "drone" | "robot" | "custom";
  customIcon?: React.ReactNode;
  volume1: VolumeBar;
  volume2: VolumeBar;
  status?: "active" | "idle" | "offline";
  location?: string;
}

const VehicleIcon = {
  excavator: Cog,
  truck:     Truck,
  drone:     Plane,
  robot:     Bot,
  custom:    Cog,
};

const statusColor = {
  active:  "border-hud-primary",
  idle:    "border-hud-border",
  offline: "border-hud-danger/50",
};

const statusDot = {
  active:  "online",
  idle:    "warning",
  offline: "offline",
} as const;

export function VehicleStatusCard({
  id,
  vehicleType,
  customIcon,
  volume1,
  volume2,
  status = "active",
  location,
}: VehicleStatusCardProps) {
  const Icon = VehicleIcon[vehicleType];
  const v1Pct = Math.round((volume1.value / volume1.max) * 100);
  const v2Pct = Math.round((volume2.value / volume2.max) * 100);

  return (
    <div className={cn("relative border rounded-sm bg-hud-surface/90 p-3 flex items-center gap-3 hud-corners", statusColor[status])}>
      {/* Status dot */}
      <div className="absolute top-2 right-2">
        <HudStatusDot status={statusDot[status]} size="sm" pulse={status === "active"} />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0">
        {customIcon ?? <Icon className="w-8 h-8 text-hud-text-dim" />}
      </div>

      {/* Bars */}
      <div className="flex-1 flex flex-col gap-1.5">
        <HudProgressBar
          label={volume1.label}
          value={v1Pct}
          color={v1Pct < 20 ? "danger" : v1Pct < 40 ? "warning" : "primary"}
          animated
          showValue
        />
        <HudProgressBar
          label={volume2.label}
          value={v2Pct}
          color="secondary"
          animated
          showValue
        />
        {location && (
          <span className="font-mono text-[8px] text-hud-text-dim">{location}</span>
        )}
      </div>

      {/* ID */}
      <div className="flex-shrink-0">
        <span className="font-mono text-base font-bold text-hud-primary leading-none">{id}</span>
      </div>
    </div>
  );
}
